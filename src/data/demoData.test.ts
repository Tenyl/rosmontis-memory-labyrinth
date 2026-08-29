import { buildDemoState } from './demoData';

test('默认战术状态只包含迷迭香', () => {
  const state = buildDemoState();

  expect(Object.keys(state.operators.byId)).toEqual(['rosmontis']);
  expect(state.operators.squadOrder).toEqual(['rosmontis']);
  expect(JSON.stringify(state)).not.toMatch(/阿米娅|末药|蛇屠箱/);
});
