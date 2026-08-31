import type { RunAiBinding, RunState } from '../game/types';
import type { TavernRuntimeValue } from '../features/tavern/runtime/TavernProvider';
import { resolveTavernRunBinding } from './tavernRunBinding';

export async function createBoundGameRunSession(
  runtime: TavernRuntimeValue,
  runId: string,
  name: string,
): Promise<RunAiBinding> {
  const character = runtime.characters.find((item) => item.id === runtime.settings?.activeCharacterId) ?? runtime.activeCharacter;
  const persona = runtime.personas.find((item) => item.id === runtime.settings?.activePersonaId) ?? runtime.activePersona;
  const preset = runtime.presets.find((item) => item.id === runtime.settings?.activePresetId) ?? runtime.activePreset;
  if (!runtime.settings?.api.apiKey.trim() || !character || !persona || !preset) {
    throw new Error('AI 导演所需的接口、角色卡、身份或预设尚未准备完成。');
  }
  const lorebookIds = [...runtime.settings.activeLorebookIds];
  const chatId = await runtime.createChat(name, {
    purpose: 'game-run',
    runId,
    activate: false,
    characterId: character.id,
    personaId: persona.id,
    presetId: preset.id,
    lorebookIds,
  });
  return {
    chatId,
    characterId: character.id,
    personaId: persona.id,
    presetId: preset.id,
    lorebookIds,
  };
}

export async function ensureBoundGameRunSession(
  runtime: TavernRuntimeValue,
  run: RunState,
  name: string,
): Promise<RunAiBinding> {
  const resolved = resolveTavernRunBinding(run, runtime);
  if (resolved.ok) {
    return { ...run.aiBinding, lorebookIds: [...run.aiBinding.lorebookIds] };
  }
  return createBoundGameRunSession(runtime, run.id, name);
}
