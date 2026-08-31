import { createLlmDirectorState } from '../../llm/directorState';
import type { GameDataState } from '../../types/game';

export type LlmDirectorSlice = Pick<GameDataState, 'llmDirector'>;

export function createLlmDirectorSlice(runId: string): LlmDirectorSlice {
  return { llmDirector: createLlmDirectorState(runId) };
}
