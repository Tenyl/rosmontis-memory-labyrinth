import type { ImageAssetKey } from '../assets/assetRegistry';
import type { DiaryDraft } from '../game/types';

export type DiaryTriggerType = 'boss-completed' | 'floor-completed' | 'fragment-transcribed';

export interface DiaryEntry extends DiaryDraft {
  runId: string;
  floor: number;
  illustrationAssetId: ImageAssetKey;
  doctorNote: string;
  updatedAt: string;
}

export type LocalDiaryTrigger =
  | { type: 'boss-completed'; nodeId: string; bossTitle: string }
  | { type: 'floor-completed'; floor: number; floorTitle: string }
  | { type: 'fragment-transcribed'; fragmentId: string; fragmentName: string };

export interface DiarySnapshot {
  runId: string;
  floor: number;
  sanity: number;
  overload: number;
}
