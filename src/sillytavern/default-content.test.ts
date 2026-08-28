import { afterEach, describe, expect, it } from 'vitest';
import { clearAllData, getCharacters, getLorebooks, getPersonas, getPresets, saveCharacter } from './database';
import { seedDefaultTavernContent } from './default-content';

afterEach(async () => {
  await clearAllData();
});

describe('default tavern content', () => {
  it('seeds the editable Rhodes Island starter set', async () => {
    await seedDefaultTavernContent();

    expect((await getCharacters()).map((item) => item.name)).toEqual(['迷迭香']);
    expect((await getPersonas()).map((item) => item.name)).toEqual(['博士']);
    const lorebookNames = (await getLorebooks()).map((item) => item.name);
    expect(lorebookNames).toHaveLength(3);
    expect(lorebookNames).toEqual(expect.arrayContaining([
      '罗德岛行动协议',
      '迷迭香认知档案',
      '切尔诺伯格残响',
    ]));
    expect((await getPresets()).map((item) => item.name)).toEqual(['认知战术叙事']);
  });

  it('does not overwrite a user-edited seeded character', async () => {
    await seedDefaultTavernContent();
    const [character] = await getCharacters();
    await saveCharacter({ ...character, personality: '玩家改写后的性格', updatedAt: 999 });

    await seedDefaultTavernContent();

    expect((await getCharacters())[0]).toMatchObject({
      id: character.id,
      personality: '玩家改写后的性格',
      updatedAt: 999,
    });
  });
});
