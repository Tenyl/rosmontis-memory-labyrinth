import { expect, test } from 'vitest';
import { parseEventV2 } from './eventV2';

const valid = { title: '倒流的雨', situation: '雨滴停在半空。', choices: [
  { id: 'listen', label: '听雨', description: '辨认残响。', intent: 'scan', check: { attribute: 'perception', threshold: 12 } },
  { id: 'wait', label: '等待', description: '稳住呼吸。', intent: 'guard', check: { attribute: 'stability', threshold: 10 } },
] };

test('accepts only locally whitelisted D20 checks', () => {
  expect(parseEventV2(valid).choices[0].check).toEqual({ attribute: 'perception', threshold: 12 });
  expect(() => parseEventV2({ ...valid, choices: [{ ...valid.choices[0], check: { attribute: 'power', threshold: 99 } }, valid.choices[1]] })).toThrow(/白名单|阈值/);
});
