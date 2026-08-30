# LLM Dual-Track Game Director Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add validated optional LLM generation for independent events, novel-mode maze narrative, and Rosmontis temporary quotes without changing authoritative local roguelike outcomes.

**Architecture:** A dedicated `src/llm` layer builds task-specific prompts, streams through the existing OpenAI-compatible transport, extracts JSON, and validates it into narrow game content types. A persisted director slice records accepted content and handled trigger keys, while React controllers request content and fall back to deterministic local text. The existing `src/game` rules remain the sole owner of topology, thresholds, numeric effects, rewards, and win/loss.

**Tech Stack:** React 19, TypeScript, Zustand persist/migration, Vitest + Testing Library, Playwright, existing `TavernTransport` and `OpenAiTavernTransport`.

**Spec:** `docs/superpowers/plans/2026-08-30-llm-dual-track-spec.md`

## Global Constraints

- Only Rosmontis is a protagonist; do not add a playable roster, party state, or companion controls.
- Every character portrait/avatar/illustration renders `public/assets/characters/blank-character.svg`.
- Never persist, log, notify, export, or interpolate the API key into prompts.
- LLM content never decides graph edges, node types, dice rolls, difficulty numbers, numeric effects, rewards, unlocks, or Run result.
- Offline preset and local endless must remain fully playable without an API.
- All new native interactive elements require globally unique descriptive kebab-case IDs.

---

### Task 1: Structured content contracts and prompt builders

**Files:**
- Create: `src/llm/gameContent.ts`
- Create: `src/llm/gameContent.test.ts`
- Create: `src/llm/gamePrompts.ts`
- Create: `src/llm/gamePrompts.test.ts`

**Interfaces:**
- Consumes: `MazeNodeType`, `MemoryFragment`, `RunMode`, local node count and read-only Rosmontis vitals.
- Produces: `parseIndependentEvent(value)`, `parseTemporaryQuote(value)`, `parseNovelBlueprint(value, expectedNodes)`, `buildEventPrompt(context)`, `buildQuotePrompt(context)`, and `buildNovelPrompt(context)`.

- [x] **Step 1: Write failing contract tests** that accept exactly 2–3 event choices, reject numeric effects and unknown intent values, enforce a 30-Han-character quote limit, and require novel node briefs to match the supplied local node IDs and types.

```ts
expect(() => parseIndependentEvent({
  title: '逆流雨幕',
  situation: '雨滴正在带走倒影。',
  choices: [{ id: 'scan', label: '读取雨声', description: '确认残留记忆。', intent: 'scan' }],
})).toThrow(/2 至 3/);

expect(parseTemporaryQuote({ text: '我记得这段雨声。' })).toEqual({ text: '我记得这段雨声。' });
expect(() => parseTemporaryQuote({ text: '这是一段超过三十个汉字并且不应该进入界面的模型输出内容用于验证边界。' })).toThrow(/30/);
```

- [x] **Step 2: Run RED contracts** with `pnpm vitest run src/llm/gameContent.test.ts src/llm/gamePrompts.test.ts`; expect missing-module failures.
- [x] **Step 3: Implement strict parsers** using record/array/string guards and allowlisted intents `guard | scan | press-on | recover | resonate`; return fresh objects and discard all unknown fields.
- [x] **Step 4: Implement prompt builders** that include sanitized state summaries and explicit JSON examples, omit API secrets, and state that numeric outcomes and topology are forbidden.
- [x] **Step 5: Run GREEN contracts and `pnpm typecheck`**; expect exit 0.
- [x] **Step 6: Commit** with `feat: define llm game content contracts`.

### Task 2: Streaming JSON task client

**Files:**
- Create: `src/llm/gameContentClient.ts`
- Create: `src/llm/gameContentClient.test.ts`
- Modify: `src/features/tavern/runtime/tavern-transport.ts`

**Interfaces:**
- Consumes: `TavernTransport`, existing `ApiSettings`, an `AbortSignal`, prompt messages, and a parser callback.
- Produces: `requestStructuredGameContent<T>({ transport, api, task, messages, parse, signal }): Promise<T>` and error class `GameContentRequestError` with codes `configuration | transport | invalid-response | aborted`.

- [x] **Step 1: Write failing client tests** for multi-chunk JSON, fenced JSON, plain prose rejection, parser failure wrapping, abort propagation, and secret-free error strings.

```ts
const transport: TavernTransport = {
  mode: 'remote',
  async *stream() { yield '```json\n{"text":"我会继续。"'; yield '}\n```'; },
};
await expect(requestStructuredGameContent({ transport, api, task: 'quote', messages, parse: parseTemporaryQuote, signal })).resolves.toEqual({ text: '我会继续。' });
```

- [x] **Step 2: Run RED client test**; expect the client export to be missing.
- [x] **Step 3: Implement the client** by concatenating streamed chunks, extracting one JSON object from an optional Markdown fence, parsing once after stream completion, and mapping errors to the four safe codes.
- [x] **Step 4: Add task metadata** `gameTask?: 'event' | 'quote' | 'novel'` to `TavernTransportRequest`; confirm the OpenAI transport still serializes only standard Chat Completions fields.
- [x] **Step 5: Run GREEN client and existing transport tests** with `pnpm vitest run src/llm/gameContentClient.test.ts src/features/tavern/runtime/openai-tavern-transport.test.ts`.
- [x] **Step 6: Commit** with `feat: add structured llm task client`.

### Task 3: Persisted director state and local authoritative settlements

**Files:**
- Create: `src/llm/directorState.ts`
- Create: `src/llm/directorState.test.ts`
- Modify: `src/types/game.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`
- Modify: `src/store/gameStateMigration.ts`
- Modify: `src/store/gameStateMigration.test.ts`

**Interfaces:**
- Consumes: validated LLM content and existing `applyRunVitals`/Run lifecycle.
- Produces: `LlmDirectorState`, store actions `beginDirectorRequest`, `acceptDirectorEvent`, `acceptDirectorQuote`, `acceptNovelBlueprint`, `failDirectorRequest`, `markDirectorTriggerHandled`, `resolveDirectorChoice`, and `resetDirectorForRun`.

- [x] **Step 1: Write failing pure tests** for deterministic local intent settlement, handled trigger deduplication, stale Run response rejection, and reset behavior.

```ts
expect(resolveIntentEffect('scan', { sanity: 60, overload: 30 })).toEqual({ sanityDelta: -1, overloadDelta: 7 });
expect(acceptForRun(state, 'old-run', event)).toBe(state);
```

- [x] **Step 2: Verify RED** with `pnpm vitest run src/llm/directorState.test.ts src/store/gameStore.test.ts src/store/gameStateMigration.test.ts`.
- [x] **Step 3: Implement the director slice** with request tokens `${runId}:${kind}:${triggerKey}`, source labels `remote | local-fallback`, and no API settings or secrets.
- [x] **Step 4: Implement local choice settlement** by mapping the allowlisted intent to fixed vitals deltas and calling the existing Run store action; the LLM-provided label never supplies a number.
- [x] **Step 5: Extend migration** so old saves receive an empty director slice and malformed/stale pending requests reset to idle without deleting Run progress.
- [x] **Step 6: Run GREEN tests and `pnpm typecheck`**.
- [x] **Step 7: Commit** with `feat: persist llm game director state`.

### Task 4: Automatic independent event flow

**Files:**
- Create: `src/features/operation/LlmEventDirector.tsx`
- Create: `src/features/operation/LlmEventDirector.test.tsx`
- Modify: `src/features/operation/OperationPage.tsx`
- Modify: `src/features/operation/operation.css`
- Modify: `src/features/tavern/runtime/TavernProvider.tsx`

**Interfaces:**
- Consumes: current blank-event node, current Run ID/Seed, director state/actions, current Tavern API settings, `OpenAiTavernTransport`, `buildEventPrompt`, and `requestStructuredGameContent`.
- Produces: automatic once-per-node event requests, event panel `llm-independent-event`, choice buttons `llm-event-choice-${choice.id}`, deterministic preset fallback, and an accessible status/error announcement.

- [x] **Step 1: Write failing component tests** for no-API suppression, one request per eligible node, no duplicate request on rerender, remote event display, choice settlement, and malformed-response fallback.
- [x] **Step 2: Run RED component test**; expect missing component failures.
- [x] **Step 3: Implement deterministic eligibility** using a seeded local trigger derived from `${run.seed}:${node.id}:llm-event`; always trigger in novel mode and trigger half of blank-event nodes in other modes.
- [x] **Step 4: Implement request and fallback**; deduplicate active requests across React Strict Mode mounts, mark completed triggers, ignore stale Run completions, and use `selectPresetEvent` on failure with a warning notification.
- [x] **Step 5: Render the event panel** with title, situation, source label, 2–3 choices, disabled state during settlement, and no portrait other than the shared blank asset already in the HUD.
- [x] **Step 6: Run GREEN, `pnpm typecheck`, and a focused 375/1440 Playwright route check**.
- [x] **Step 7: Commit** with `feat: add optional ai independent events`.

### Task 5: Temporary Rosmontis quote generation

**Files:**
- Create: `src/features/operation/RosmontisQuotePanel.tsx`
- Create: `src/features/operation/RosmontisQuotePanel.test.tsx`
- Create: `src/llm/localQuotes.ts`
- Create: `src/llm/localQuotes.test.ts`
- Modify: `src/features/operation/OperationPage.tsx`
- Modify: `src/features/operation/operation.css`

**Interfaces:**
- Consumes: latest `RuleEvent`, current vitals, most recent maze event title, API configuration, quote prompt/client, and director quote state.
- Produces: once-per-rule-event quote generation, deterministic local fallback `selectLocalQuote(event, vitals)`, and live region `rosmontis-temporary-quote` beside the existing blank portrait/status HUD.

- [x] **Step 1: Write failing tests** for action-to-quote context, deterministic fallback, 30-character enforcement, stale request rejection, and no repeated request after rerender.
- [x] **Step 2: Verify RED** with `pnpm vitest run src/llm/localQuotes.test.ts src/features/operation/RosmontisQuotePanel.test.tsx`.
- [x] **Step 3: Implement local quotes** as Rosmontis first-person lines keyed by RuleEvent type and overload band; each source string must be at most 30 Han characters.
- [x] **Step 4: Implement remote generation** only when API is configured, then validate through `parseTemporaryQuote`; on any error accept the deterministic local quote with source `local-fallback`.
- [x] **Step 5: Render quote UI** with `aria-live="polite"`, source text, reduced-motion-safe typewriter presentation, and the shared blank portrait rather than an embedded character image.
- [x] **Step 6: Run GREEN, full operation component tests, and `pnpm typecheck`**.
- [x] **Step 7: Commit** with `feat: generate contextual rosmontis quotes`.

### Task 6: Novel-mode themed maze narrative

**Files:**
- Create: `src/features/memory/NovelMazeBrief.tsx`
- Create: `src/features/memory/NovelMazeBrief.test.tsx`
- Create: `src/features/operation/NovelRunDirector.tsx`
- Create: `src/features/operation/NovelRunDirector.test.tsx`
- Modify: `src/features/operation/OperationPage.tsx`
- Modify: `src/features/memory/MemoryPage.tsx`
- Modify: `src/features/memory/RunMazePanel.tsx`
- Modify: `src/features/memory/memory.css`

**Interfaces:**
- Consumes: a locally generated novel-mode `MazeGraph`, API settings, novel prompt/client, and director blueprint state.
- Produces: one blueprint request per novel Run, a local fallback blueprint, theme/premise display, and text-only node briefs keyed by existing local node IDs.

- [x] **Step 1: Write failing tests** proving novel requests only run in novel mode, local node IDs/types/edges remain unchanged, blueprint briefs attach by node ID, malformed node lists fall back, and other modes render no novel panel.
- [x] **Step 2: Verify RED** with focused operation and memory tests.
- [x] **Step 3: Implement the novel director** to send Seed, floor, local node IDs/types, fragments, and vitals; accept only a blueprint that validates against that exact local graph.
- [x] **Step 4: Implement a deterministic fallback blueprint** from Seed and node types so network failure does not end or regenerate the Run.
- [x] **Step 5: Render the novel brief and node labels** without changing `MazeGraph.edges`, `MazeNode.type`, movement legality, rewards, or victory checks.
- [x] **Step 6: Add Playwright coverage** that unlocks novel mode with test API settings and a mocked compatible endpoint, starts the mode, and asserts themed text while the local graph remains navigable.
- [x] **Step 7: Run GREEN, `pnpm typecheck`, and focused E2E**.
- [x] **Step 8: Commit** with `feat: add llm novel maze narrative`.

### Task 7: LLM dual-track quality gate

**Files:**
- Modify: `docs/superpowers/plans/2026-08-30-llm-dual-track-integration.md`
- Modify: relevant regression tests only when a verified defect is found.

**Interfaces:**
- Consumes: all three director capabilities.
- Produces: evidence that offline and remote paths coexist without secret leakage or rules divergence.

- [x] **Step 1: Run `pnpm test`**; expect zero failures.
- [x] **Step 2: Run `pnpm typecheck` and `pnpm build`**; expect exit 0 and no large-chunk warning.
- [x] **Step 3: Run `pnpm test:e2e`**; expect all existing offline flows plus mocked remote event/quote/novel flows to pass at four viewports.
- [x] **Step 4: Audit `apiKey`, console/log output, notifications, localStorage, exported backups,人物图片, `Math.random()`, and interactive IDs**; expect no secret or authority-boundary violations.
- [x] **Step 5: Run `git diff --check`, inspect `git status --short`, and review the branch diff against this specification**.
- [x] **Step 6: Commit** with `feat: complete optional llm game director`.

## Phase completion definition

- Offline preset and local endless remain complete and deterministic without API configuration.
- Entering eligible event nodes with API configuration produces a validated independent event or a clearly labeled deterministic fallback.
- Every accepted event choice settles through fixed local intent effects.
- Key Run actions produce a validated Rosmontis first-person quote of at most 30 Han characters or a deterministic fallback.
- Novel mode keeps the local graph authoritative while displaying a generated theme, premise, node briefs, and story progression.
- All人物 images still resolve to the replaceable blank project asset.
