import characterBlank from '../../assets/placeholders/character-blank.svg';
import moduleBlank from '../../assets/placeholders/module-blank.svg';
import nodeBlank from '../../assets/placeholders/node-blank.svg';

export const gameAssets = {
  images: {
    rosmontisPortrait: characterBlank,
    combatNode: nodeBlank,
    restNode: nodeBlank,
    shopNode: nodeBlank,
    wonderNode: nodeBlank,
    unknownNode: nodeBlank,
    bossNode: nodeBlank,
    moduleCard: moduleBlank,
    memoryFragment: nodeBlank,
    diaryIllustration: nodeBlank,
  },
  audio: {
    mazeBgm: null,
    combatBgm: null,
    bossBgm: null,
    nodeOpenSfx: null,
    comfortSfx: null,
  },
} as const;

export type ImageAssetKey = keyof typeof gameAssets.images;
export type AudioAssetKey = keyof typeof gameAssets.audio;

export const resolveImageAsset = (key: ImageAssetKey): string =>
  gameAssets.images[key];

export const resolveAudioAsset = (key: AudioAssetKey): string | null =>
  gameAssets.audio[key];

export const hasAudioAsset = (key: AudioAssetKey): boolean =>
  resolveAudioAsset(key) !== null;
