export type RunMode = 'preset' | 'endless' | 'novel';
export type RunPhase = 'idle' | 'exploring' | 'resolving' | 'fragment-overflow' | 'victory' | 'defeat';
export type MazeNodeType = 'echo-combat' | 'blank-event' | 'thought-rest' | 'memory-core';
export type MazeNodeState = 'hidden' | 'detected' | 'reachable' | 'current' | 'completed' | 'corrupted';
export type GreatswordId = 'breach' | 'watch' | 'perception' | 'resonance';

export interface SeededRandomState {
  seed: string;
  cursor: number;
  draws: number;
}

export interface RunState {
  id: string;
  seed: string;
  mode: RunMode;
  phase: RunPhase;
  turn: number;
  floor: number;
  currentNodeId: string;
  result: 'victory' | 'defeat' | null;
}
