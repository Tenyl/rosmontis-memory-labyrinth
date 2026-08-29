# Rosemary Memory Maze Roguelike Rules Core Implementation Plan

> **For Codex:** Execute this plan task-by-task with test-driven development. Keep the rules layer free of React, Zustand, browser APIs, and Tavern/LLM output.

**Goal:** Add the deterministic offline domain core for replayable Runs, legal memory mazes, D20 checks, four greatsword skills, memory-fragment overflow, and versioned persisted Run state.

**Architecture:** New domain types live under `src/game`. Pure functions receive explicit state and random sources and return new state plus structured rule events. Zustand only adapts these functions to UI state after the pure layer is complete. LLM content may later provide text labels, but never random rolls, topology, difficulty, rewards, or win/loss results.

**Tech Stack:** TypeScript, Vitest, Zustand persist, existing React/Vite application.

---

## Stable domain interfaces

```ts
type RunMode = 'preset' | 'endless' | 'novel';
type RunPhase = 'idle' | 'exploring' | 'resolving' | 'fragment-overflow' | 'victory' | 'defeat';
type MazeNodeType = 'echo-combat' | 'blank-event' | 'thought-rest' | 'memory-core';
type MazeNodeState = 'hidden' | 'detected' | 'reachable' | 'current' | 'completed' | 'corrupted';
type GreatswordId = 'breach' | 'watch' | 'perception' | 'resonance';

interface RunState {
  id: string;
  seed: string;
  mode: RunMode;
  phase: RunPhase;
  turn: number;
  floor: number;
  currentNodeId: string;
  result: 'victory' | 'defeat' | null;
}
```

Random functions consume a serializable `SeededRandomState` and return `[value, nextState]`; no global `Math.random()` is permitted in the rules directory.

### Task 1: Domain types and replayable random source

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/random.ts`
- Create: `src/game/random.test.ts`

- [ ] Write tests proving identical seeds produce identical integer sequences, distinct seeds diverge, bounds are inclusive, and the returned state can be serialized/resumed.
- [ ] Run `pnpm exec vitest run src/game/random.test.ts` and verify RED.
- [ ] Implement a string-seeded PRNG with `createSeededRandom(seed)`, `nextRandom(state)`, and `randomInt(state, min, max)`.
- [ ] Re-run the focused test and `pnpm typecheck`.
- [ ] Commit: `feat: add replayable roguelike random source`.

### Task 2: D20 and bounded Rosmontis vitals

**Files:**
- Create: `src/game/checks.ts`
- Create: `src/game/checks.test.ts`
- Extend: `src/game/types.ts`

- [ ] Write tests for natural 1/20, modifier totals, threshold equality, deterministic rolls, and sanity/overload clamping to 0–100.
- [ ] Verify RED.
- [ ] Implement `resolveD20Check(input, randomState)`, `clampVital`, and structured `RuleEvent` output.
- [ ] Verify GREEN and typecheck.
- [ ] Commit: `feat: add deterministic d20 checks`.

### Task 3: Valid memory-maze generation

**Files:**
- Create: `src/game/maze.ts`
- Create: `src/game/maze.test.ts`
- Extend: `src/game/types.ts`

- [ ] Write invariant tests across at least 100 seeds: unique IDs, exactly one start and core, every node reachable from start, edges reference existing nodes, and same seed/mode/floor reproduces the same graph.
- [ ] Verify RED.
- [ ] Implement `generateMaze({ seed, mode, floor, targetNodeCount })`, `getReachableNodeIds`, and `validateMaze`.
- [ ] Use four approved node types and explicit visibility/reachability states. The generator must reject node counts below the minimum rather than silently producing malformed graphs.
- [ ] Verify GREEN and typecheck.
- [ ] Commit: `feat: generate valid replayable memory mazes`.

### Task 4: Four greatsword skill settlement

**Files:**
- Create: `src/game/greatswords.ts`
- Create: `src/game/greatswords.test.ts`
- Extend: `src/game/types.ts`

- [ ] Write table-driven tests for `breach`, `watch`, `perception`, and `resonance`, including AP cost, cooldown, overload change, legal target/node constraints, and rejection without partial mutation.
- [ ] Verify RED.
- [ ] Implement immutable `resolveGreatswordAction(state, action, randomState)` returning `{ state, randomState, events }`.
- [ ] Keep values in a typed configuration table; do not encode balancing constants in UI components.
- [ ] Verify GREEN and typecheck.
- [ ] Commit: `feat: settle four greatsword tactics offline`.

### Task 5: Memory-fragment inventory and forced forgetting

**Files:**
- Create: `src/game/fragments.ts`
- Create: `src/game/fragments.test.ts`
- Extend: `src/game/types.ts`

- [ ] Write tests for normal acquisition, duplicate rejection, core-fragment protection, overflow pausing, replace/discard decisions, and invalid decisions preserving state.
- [ ] Verify RED.
- [ ] Implement `acquireFragment` and `resolveFragmentOverflow`; overflow must set phase to `fragment-overflow` and block other Run actions until resolved.
- [ ] Verify GREEN and typecheck.
- [ ] Commit: `feat: add memory fragment overflow rules`.

### Task 6: Run lifecycle reducer

**Files:**
- Create: `src/game/run.ts`
- Create: `src/game/run.test.ts`
- Extend: `src/game/types.ts`

- [ ] Write tests covering preset Run creation, legal node movement, completed-node rewards, defeat at sanity 0 or overload 100, victory at a stabilized core, first-clear unlock, endless availability, and novel mode rejection when LLM is disabled.
- [ ] Verify RED.
- [ ] Implement `createRun`, `getAvailableModes`, and `reduceRunAction` as pure functions composing Tasks 1–5.
- [ ] Ensure local endless mode unlocks after first clear and remains independent of LLM availability.
- [ ] Verify GREEN and typecheck.
- [ ] Commit: `feat: implement offline run lifecycle`.

### Task 7: Versioned Zustand integration and migration

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/data/demoData.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`
- Create: `src/store/gameStateMigration.ts`
- Create: `src/store/gameStateMigration.test.ts`

- [ ] Write migration tests for legacy prototype state, phase-one single-protagonist state, malformed Run data, and an already-current state. Preserve UI preferences and Tavern projection/session data.
- [ ] Verify RED.
- [ ] Add `run`, `maze`, `rosmontis`, `memoryInventory`, `progression`, and `ruleLog` slices to `GameDataState`; keep old projection-compatible fields temporarily as adapters.
- [ ] Set an explicit Zustand persist version and `migrate` function. Invalid Run data falls back to a fresh preset Run without deleting Tavern/Dexie data.
- [ ] Expose minimal actions `startRun`, `moveToNode`, `useGreatsword`, `resolveFragmentChoice`, and `resetRun`, each delegating to pure rules.
- [ ] Verify focused tests and typecheck.
- [ ] Commit: `refactor: integrate versioned roguelike state`.

### Task 8: Phase quality gate

**Files:**
- Update this plan checkbox state and any tests changed by verified regressions.

- [ ] Audit `src/game` for `Math.random`, React, Zustand, DOM, and Tavern imports; expect none.
- [ ] Run `pnpm test`; expect zero failures.
- [ ] Run `pnpm typecheck`; expect exit 0.
- [ ] Run `pnpm build`; expect exit 0 and no large-chunk warning.
- [ ] Run `pnpm test:e2e`; expect all browser tests to pass.
- [ ] Run `git diff --check` and inspect `git status --short`.
- [ ] Commit: `feat: establish replayable roguelike rules core`.

## Phase completion definition

- A serialized Seed and random state can reproduce all offline random decisions.
- Every generated maze is legal and traversable.
- D20 checks, the four greatswords, Run victory/defeat, and fragment overflow are pure tested rules.
- First clear unlocks local endless mode; novel mode still requires LLM.
- Zustand persists a versioned Run and migrates old project state safely.
- No UI or LLM code can directly decide numeric outcomes.
