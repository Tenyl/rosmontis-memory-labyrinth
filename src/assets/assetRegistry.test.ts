import { describe, expect, test } from 'vitest';

import {
  gameAssets,
  hasAudioAsset,
  resolveAudioAsset,
  resolveImageAsset,
} from './assetRegistry';

describe('asset registry', () => {
  test('returns shipped SVG placeholders for every image slot', () => {
    const imageKeys = Object.keys(gameAssets.images) as Array<
      keyof typeof gameAssets.images
    >;

    for (const key of imageKeys) {
      expect(resolveImageAsset(key)).toMatch(
        /(?:\.svg(?:\?|$)|^data:image\/svg\+xml)/,
      );
    }
  });

  test('represents unfilled audio slots without constructing a broken URL', () => {
    expect(resolveAudioAsset('mazeBgm')).toBeNull();
    expect(resolveAudioAsset('bossBgm')).toBeNull();
    expect(hasAudioAsset('nodeOpenSfx')).toBe(false);
  });
});
