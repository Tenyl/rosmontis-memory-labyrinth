import {
  createGameSceneState,
  gameSceneReducer,
  restoreGameSceneState,
} from './sceneState';

test('commits only the active node transition and ignores stale timers', () => {
  const initial = createGameSceneState();
  const enteringFirst = gameSceneReducer(initial, { type: 'request-node', nodeId: 'node-a' });
  const enteringSecond = gameSceneReducer(enteringFirst, { type: 'request-node', nodeId: 'node-b' });

  expect(enteringFirst.transitionId).toBe(1);
  expect(enteringSecond.transitionId).toBe(2);
  expect(gameSceneReducer(enteringSecond, {
    type: 'commit-node',
    transitionId: enteringFirst.transitionId,
  })).toEqual(enteringSecond);
  expect(gameSceneReducer(enteringSecond, {
    type: 'commit-node',
    transitionId: enteringSecond.transitionId,
  })).toMatchObject({
    phase: 'entering-node',
    targetNodeId: 'node-b',
    commitState: 'committed',
  });
});

test('cancels node entry only before the authoritative movement commit', () => {
  const entering = gameSceneReducer(createGameSceneState(), {
    type: 'request-node',
    nodeId: 'node-a',
  });

  expect(gameSceneReducer(entering, { type: 'cancel-entry' })).toMatchObject({
    phase: 'map',
    targetNodeId: null,
    commitState: 'preview',
  });

  const committed = gameSceneReducer(entering, {
    type: 'commit-node',
    transitionId: entering.transitionId,
  });
  expect(gameSceneReducer(committed, { type: 'cancel-entry' })).toEqual(committed);
});

test('moves from an open node through settlement and back to the map', () => {
  const open = gameSceneReducer(createGameSceneState(), {
    type: 'open-node',
    nodeId: 'node-a',
  });
  const settling = gameSceneReducer(open, { type: 'settle-node' });
  const returning = gameSceneReducer(settling, { type: 'request-map' });
  const map = gameSceneReducer(returning, { type: 'finish-return' });

  expect(open.phase).toBe('node');
  expect(settling.phase).toBe('settling-node');
  expect(returning.phase).toBe('returning-map');
  expect(map).toMatchObject({ phase: 'map', targetNodeId: null, commitState: 'preview' });
});

test('restores an unresolved encounter inside its node and all other states on the map', () => {
  expect(restoreGameSceneState({ nodeId: 'node-a', resolved: false })).toMatchObject({
    phase: 'node',
    targetNodeId: 'node-a',
    commitState: 'committed',
  });
  expect(restoreGameSceneState({ nodeId: 'node-a', resolved: true }).phase).toBe('map');
  expect(restoreGameSceneState(null).phase).toBe('map');
});

test('stores the latest camera without changing the scene phase', () => {
  const state = gameSceneReducer(createGameSceneState(), {
    type: 'set-camera',
    camera: { x: 24, y: -12, scale: 1.4 },
  });

  expect(state).toMatchObject({
    phase: 'map',
    camera: { x: 24, y: -12, scale: 1.4 },
  });
});

test('ignores lifecycle actions that are invalid for the current scene phase', () => {
  const map = createGameSceneState();
  expect(gameSceneReducer(map, { type: 'settle-node' })).toEqual(map);
  expect(gameSceneReducer(map, { type: 'request-map' })).toEqual(map);

  const node = gameSceneReducer(map, { type: 'open-node', nodeId: 'node-a' });
  expect(gameSceneReducer(node, { type: 'finish-return' })).toEqual(node);
});
