import type { RunState } from '../game/types';
import type { ApiSettings, ChatSession } from '../sillytavern';
import type { TavernRuntimeValue } from '../features/tavern/runtime/TavernProvider';

type BindingRuntime = Pick<
  TavernRuntimeValue,
  'chats' | 'characters' | 'personas' | 'presets' | 'lorebooks' | 'settings'
>;

export function resolveTavernRunBinding(
  run: RunState,
  runtime: BindingRuntime,
  apiOverride?: ApiSettings | null,
) {
  const session = runtime.chats.find((chat) => chat.id === run.aiBinding.chatId);
  const character = runtime.characters.find((item) => item.id === (run.aiBinding.characterId ?? session?.characterId));
  const persona = runtime.personas.find((item) => item.id === (run.aiBinding.personaId ?? session?.personaId));
  const preset = runtime.presets.find((item) => item.id === (run.aiBinding.presetId ?? session?.presetId));
  const api = apiOverride === undefined ? runtime.settings?.api : apiOverride;
  if (!session || session.purpose !== 'game-run' || session.runId !== run.id) {
    return { ok: false as const, message: '当前存档没有匹配的 game-run 会话。' };
  }
  if (!character || !persona || !preset) {
    return { ok: false as const, message: '当前存档绑定的角色卡、身份或预设已经缺失。' };
  }
  if (!api?.apiKey.trim() || !api.baseUrl.trim()) {
    return { ok: false as const, message: '当前存档的远程接口尚未连接。' };
  }
  return { ok: true as const, session, character, persona, preset, lorebooks: runtime.lorebooks, api };
}

export function getRunRecentSummaries(session: ChatSession, limit = 6): string[] {
  return (session.summaries ?? []).slice(-limit).map((summary) => summary.text);
}
