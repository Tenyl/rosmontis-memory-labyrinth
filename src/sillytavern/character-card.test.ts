import { describe, expect, it } from 'vitest';
import { exportCharacterCardV2, importCharacterCardV2 } from './character-card';

const rosmontisV2Fixture = {
  spec: 'chara_card_v2',
  spec_version: '2.0',
  data: {
    name: '迷迭香',
    description: '罗德岛精英干员，正在接受认知状态监测。',
    personality: '寡言、敏锐，对记忆残响高度敏感',
    scenario: '博士与迷迭香进入一段受污染的意识回廊。',
    first_mes: '博士，链接已经稳定。',
    mes_example: '<START>\n{{user}}：你听见了什么？\n{{char}}：很多孩子在走廊尽头说话。',
    creator_notes: '罗德岛意识战术终端默认角色。',
    system_prompt: '保持冷静、克制的中文叙事。',
    post_history_instructions: '每轮推进一个可观察线索。',
    alternate_greetings: ['博士，我们可以开始。'],
    tags: ['罗德岛', '认知作战'],
    creator: 'Rhodes Terminal',
    character_version: '1.0',
    extensions: { world: 'rhodes-memory', depth_prompt: { depth: 4, prompt: '感知残响' } },
  },
} as const;

describe('SillyTavern V2 character cards', () => {
  it('round-trips all character fields and extension data', () => {
    const card = importCharacterCardV2(rosmontisV2Fixture);
    const exported = exportCharacterCardV2(card);

    expect(exported).toMatchObject({
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: '迷迭香',
        personality: '寡言、敏锐，对记忆残响高度敏感',
        first_mes: '博士，链接已经稳定。',
        extensions: { world: 'rhodes-memory', depth_prompt: { depth: 4, prompt: '感知残响' } },
      },
    });
  });

  it('rejects a card without a non-empty character name', () => {
    expect(() => importCharacterCardV2({
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: { ...rosmontisV2Fixture.data, name: '   ' },
    })).toThrow('角色卡缺少有效名称');
  });
});
