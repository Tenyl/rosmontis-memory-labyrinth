# Dual-Mode AI Director and Rosmontis Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one shared gameplay template that switches between deterministic local content and validated Tavern AI direction, and add an isolated Rosmontis character-chat route.

**Architecture:** RunState records a content capability and immutable Tavern binding. LocalContentDriver and TavernContentDriver both return the same versioned presentation contracts, while the existing rule engine remains authoritative. Tavern sessions carry an explicit purpose so character chat can reuse streaming, presets and lorebooks without projecting messages into GameStore.

**Tech Stack:** React 19, TypeScript 7, Zustand, Dexie, React Router 7, Vitest, Testing Library, Playwright, Lucide.

**Spec:** `docs/superpowers/specs/2026-08-31-dual-mode-ai-director-chat-design.md`

## Global Constraints

- Rosmontis remains the only protagonist.
- Local and AI gameplay must use the same GamePage, NodeScene, EncounterPanel, GreatswordActions and NodeSettlement.
- Local mode sends no remote request, creates no game-run Tavern session and renders no AI interaction controls.
- LLM output never directly mutates AP, damage, rewards, topology, movement, victory or saved rule state.
- Imported Tavern content is untrusted; the locked game contract is appended after assembled content.
- All changed behavior follows red-green-refactor and every completed batch is pushed to `codex/rosemary-memory-maze`.

---

### Task 1: Persist the Shared Content-Mode Contract

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/run.ts`
- Modify: `src/game/run.test.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStateMigration.ts`
- Modify: `src/store/gameStateMigration.test.ts`
- Modify: `src/game/saveSlots.ts`
- Modify: `src/game/saveSlots.test.ts`
- Modify: `src/features/title/TitlePage.tsx`
- Modify: `src/features/title/TitlePage.test.tsx`

**Interfaces:**
- Produces: `ContentMode`, `NarrativeStyle`, `AiFailurePolicy`, `RunAiBinding`, `CreateRunOptions`.
- Consumes: existing `RunMode`, progression gates and three save slots.

- [ ] **Step 1: Write failing rule and migration tests**

```ts
expect(createRun({ ...base, contentMode: 'local' }).run).toMatchObject({
  contentMode: 'local', narrativeStyle: 'tactical', aiFailurePolicy: 'ask',
  aiBinding: { chatId: null, characterId: null, personaId: null, presetId: null, lorebookIds: [] },
});
expect(() => createRun({ ...base, contentMode: 'ai-director', llmEnabled: false })).toThrow(/AI 导演/);
expect(migrateGameState(legacy, current).run.contentMode).toBe('local');
```

- [ ] **Step 2: Run red tests**

Run: `npm test -- src/game/run.test.ts src/store/gameStateMigration.test.ts src/game/saveSlots.test.ts src/features/title/TitlePage.test.tsx`

Expected: FAIL because RunState has no content contract and the title has no content selector.

- [ ] **Step 3: Implement the minimal model**

```ts
export type ContentMode = 'local' | 'ai-director';
export type NarrativeStyle = 'tactical' | 'novel';
export type AiFailurePolicy = 'ask' | 'auto-fallback' | 'pause';
export interface RunAiBinding {
  chatId: string | null; characterId: string | null; personaId: string | null;
  presetId: string | null; lorebookIds: string[];
}
```

Add the four fields to RunState, default legacy state to local, bump persisted Store and SaveSnapshot versions, and extend `startRun` without creating an alternate store.

- [ ] **Step 4: Add title capability selection**

When the Tavern runtime is not remotely ready, render only an enabled local option and a disabled AI option with a settings link. When ready, let the user choose either option and pass one CreateRunOptions object into the existing start action.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/game/run.test.ts src/store/gameStateMigration.test.ts src/game/saveSlots.test.ts src/features/title/TitlePage.test.tsx && npm run typecheck`

Commit: `feat: add shared local and ai run modes`

---

### Task 2: Add Purpose-Bound Tavern Sessions

**Files:**
- Modify: `src/sillytavern/types.ts`
- Modify: `src/sillytavern/database.ts`
- Modify: `src/features/tavern/runtime/TavernProvider.tsx`
- Modify: `src/features/tavern/runtime/tavern-runtime.test.tsx`
- Modify: `src/features/tavern/components/SessionManager.tsx`

**Interfaces:**
- Produces: `ChatPurpose = 'game-run' | 'character-chat'`, `createChat(name, options)`, `sendMessage(content, chatId?)`.
- Consumes: existing Dexie ChatSession records and runtime history operations.

- [ ] **Step 1: Write failing isolation tests**

Create a character-chat session, send a parsed reply containing game-looking variables, and assert the real GameStore state is unchanged. Create a game-run session and assert the retained projection still occurs.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/features/tavern/runtime/tavern-runtime.test.tsx`

Expected: FAIL because ChatSession lacks purpose and every assistant message projects into GameStore.

- [ ] **Step 3: Implement session purpose**

Add `purpose` and optional `runId`; normalize legacy records to game-run. Skip `projectTavernTurn` and projection activation for character-chat. Allow callers to address an explicit chat ID so game direction never depends on whichever session the settings UI selected.

- [ ] **Step 4: Preserve editing and branching**

Branches inherit purpose and runId. Retry, edit, truncate and delete operate on the addressed session and keep the same isolation rule.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/tavern/runtime/tavern-runtime.test.tsx src/sillytavern/backup.test.ts && npm run typecheck`

Commit: `refactor: isolate tavern session purposes`

---

### Task 3: Build the Tavern Game Prompt Bridge

**Files:**
- Create: `src/llm/tavernGamePromptBridge.ts`
- Create: `src/llm/tavernGamePromptBridge.test.ts`
- Modify: `src/sillytavern/prompt-assembler.ts`
- Modify: `src/sillytavern/prompt-assembler.test.ts`
- Modify: `src/llm/gameContentClient.ts`
- Modify: `src/llm/gameContentClient.test.ts`

**Interfaces:**
- Produces: `assembleGameDirectorPrompt(input): AssembledGamePrompt`.
- Consumes: explicit game-run session, bound character, persona, preset, lorebooks and `GameDirectorSnapshot`.

- [ ] **Step 1: Write failing bridge tests**

Use literal character, persona, preset and lorebook fixtures. Assert the result contains their content in preset order, reports matched entry IDs, appends the locked contract last, and never treats snapshot text as executable instructions.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/llm/tavernGamePromptBridge.test.ts`

Expected: FAIL because the bridge does not exist.

- [ ] **Step 3: Implement the bridge**

```ts
export interface AssembledGamePrompt {
  messages: GamePromptMessage[];
  matchedLorebookEntryIds: string[];
  model: string;
  temperature?: number;
  maxTokens?: number;
}
```

Call the real `assemblePrompt`, build scan text from the snapshot and recent summaries, then append one final system message containing the schema and authority boundary.

- [ ] **Step 4: Route structured transport parameters through the bridge**

Extend `requestStructuredGameContent` to accept model, temperature and maxTokens from the active preset while preserving timeout, abort and strict JSON behavior.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/llm/tavernGamePromptBridge.test.ts src/sillytavern/prompt-assembler.test.ts src/llm/gameContentClient.test.ts && npm run typecheck`

Commit: `feat: assemble game director prompts through tavern`

---

### Task 4: Add Versioned Director Schemas and Local Driver Parity

**Files:**
- Create: `src/llm/schemas/gameDirectorV1.ts`
- Create: `src/llm/schemas/gameDirectorV1.test.ts`
- Create: `src/llm/gameplayRegistry.ts`
- Create: `src/llm/gameplayRegistry.test.ts`
- Create: `src/llm/contentDriver.ts`
- Create: `src/llm/contentDriver.test.ts`
- Modify: `src/llm/directorState.ts`
- Modify: `src/store/slices/llmDirectorSlice.ts`

**Interfaces:**
- Produces: `NodePresentation`, `ValidatedEnemyPlan`, `GameContentDriver`, `LocalContentDriver`.
- Consumes: node catalog, preset events, combat intents and local quotes.

- [ ] **Step 1: Write parser and parity tests**

Assert valid registered IDs parse; unknown IDs, more than three intents, duplicate modifiers and direct numeric effects fail. Assert LocalContentDriver returns a complete NodePresentation for every MazeNodeType and never needs a transport.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/llm/schemas/gameDirectorV1.test.ts src/llm/contentDriver.test.ts`

- [ ] **Step 3: Implement registry, parser and local driver**

Use immutable registries. The parser outputs IDs only. LocalContentDriver adapts existing local content instead of cloning gameplay rules.

- [ ] **Step 4: Persist accepted presentations**

Replace one-off event and quote state with per-node presentation records keyed by Run and node. Preserve legacy records during migration until all consumers move.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/llm/schemas/gameDirectorV1.test.ts src/llm/gameplayRegistry.test.ts src/llm/contentDriver.test.ts src/llm/directorState.test.ts && npm run typecheck`

Commit: `feat: validate ai director gameplay plans`

---

### Task 5: Integrate One Shared Node Template and Failure Choice

**Files:**
- Create: `src/features/game/GameDirectorBoundary.tsx`
- Create: `src/features/game/GameDirectorBoundary.test.tsx`
- Modify: `src/features/game/GamePage.tsx`
- Modify: `src/features/game/GamePage.test.tsx`
- Modify: `src/features/game/NodeScene.tsx`
- Modify: `src/features/operation/EncounterPanel.tsx`
- Modify: `src/features/game/game.css`
- Delete after migration: `src/features/operation/LlmEventDirector.tsx`
- Delete after migration: `src/features/tavern/game/TavernGameView.tsx`

**Interfaces:**
- Consumes: one `NodePresentation` regardless of source.
- Produces: same DOM structure for local and AI gameplay plus an optional AI command capability slot.

- [ ] **Step 1: Write shared-template behavior tests**

Render the real GamePage in local and AI modes. Assert both contain the same node shell ID; local has no AI director status, natural-language input or generation region; AI has a fused presentation and command slot without a second encounter panel.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/features/game/GameDirectorBoundary.test.tsx src/features/game/GamePage.test.tsx`

- [ ] **Step 3: Implement the boundary**

Resolve LocalContentDriver synchronously. In AI mode assemble, stream, parse, validate and accept Tavern content. Pass the resulting presentation into NodeScene. Render no AI placeholder in local mode.

- [ ] **Step 4: Add explicit failure decisions**

For ask policy expose Retry, Continue Local and Always Fallback. Pause retains the unresolved director stage. Auto fallback resolves the same request key through LocalContentDriver. Persist the decision and prevent duplicate resolution.

- [ ] **Step 5: Remove obsolete parallel panels**

After consumer tests are green, remove the appended LlmEventDirector and TavernGameView path and their unused CSS, Prompt and request maps.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- src/features/game src/features/operation && npm run typecheck`

Commit: `refactor: unify local and ai node presentation`

---

### Task 6: Drive Combat Plans and Natural-Language Commands

**Files:**
- Create: `src/llm/schemas/tacticalCommandV1.ts`
- Create: `src/llm/schemas/tacticalCommandV1.test.ts`
- Create: `src/llm/tacticalCommand.ts`
- Create: `src/llm/tacticalCommand.test.ts`
- Modify: `src/game/encounterProtocol.ts`
- Modify: `src/game/encounterProtocol.test.ts`
- Modify: `src/features/operation/GreatswordActions.tsx`
- Modify: `src/features/operation/CommandConsole.tsx`

**Interfaces:**
- Produces: `TacticalCommandPlan { actions: EncounterAction[]; explanation: string }`.
- Consumes: registered action IDs and existing local encounter reducer.

- [ ] **Step 1: Write failing validator tests**

Assert a legal two-action plan parses and executes through the real reducer. Assert insufficient AP, cooldown, illegal target, unknown action and more than four actions are rejected without partial mutation.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/llm/tacticalCommand.test.ts src/game/encounterProtocol.test.ts`

- [ ] **Step 3: Implement atomic validation**

Dry-run every action against a cloned rule state; only return the final accepted resolution when all actions succeed. Never let LLM-provided numbers enter the reducer.

- [ ] **Step 4: Consume enemy plans without replacing numeric rules**

Map the next validated intent ID to `combatIntents`; keep damage and stagger scaling local. Generate a new segment only when the accepted three-step plan ends or a Boss phase changes.

- [ ] **Step 5: Integrate the optional command slot**

Show CommandConsole only for ready AI director combat. Card controls remain primary and use the same actions. Correct remote-data helper text and provide loading, stop and inline error behavior.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- src/llm/tacticalCommand.test.ts src/game/encounterProtocol.test.ts src/features/operation/GreatswordActions.test.tsx && npm run typecheck`

Commit: `feat: add validated ai tactical commands`

---

### Task 7: Add the Independent Rosmontis Chat Route

**Files:**
- Create: `src/features/chat/RosmontisChatPage.tsx`
- Create: `src/features/chat/RosmontisChatPage.test.tsx`
- Create: `src/features/chat/chat.css`
- Modify: `src/app/router.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/AppShell.test.tsx`
- Reuse: `src/features/tavern/game/HistoryDrawer.tsx`
- Reuse: `src/features/tavern/game/MainTextPane.tsx`

**Interfaces:**
- Consumes: purpose-bound character-chat sessions and the current character, persona, preset and lorebooks.
- Produces: top route `/chat` with no GameStore projection.

- [ ] **Step 1: Write failing navigation and isolation tests**

Assert the top menu contains “迷迭香对话”. Without remote readiness the page shows a settings link and no input. With a remote transport it can create a character-chat, stream a reply, retry, edit, branch and return while a captured GameStore snapshot remains identical.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/app/AppShell.test.tsx src/features/chat/RosmontisChatPage.test.tsx`

- [ ] **Step 3: Implement route and page**

Use the current character card name and firstMessage, current persona and preset. Filter the session list by character-chat. Use existing history operations and show a visible Stop button while streaming.

- [ ] **Step 4: Add responsive and accessible styling**

Use a single readable conversation column, sticky input that does not cover focus, 44px controls, Lucide icons, visible labels and reduced-motion fallbacks. At 375px avoid document-level horizontal overflow.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/app/AppShell.test.tsx src/features/chat/RosmontisChatPage.test.tsx src/test/accessibility.test.tsx src/test/uniqueIds.test.tsx && npm run typecheck`

Commit: `feat: add isolated rosmontis character chat`

---

### Task 8: Bind AI Runs, Summaries and Save Restoration

**Files:**
- Modify: `src/features/title/TitlePage.tsx`
- Modify: `src/features/game/GamePage.tsx`
- Modify: `src/features/game/NodeSettlement.tsx`
- Modify: `src/features/diary/DiaryDirector.tsx`
- Modify: `src/features/operation/NovelRunDirector.tsx`
- Modify: `src/game/saveSlots.ts`
- Modify: associated tests.

**Interfaces:**
- Consumes: game-run Tavern sessions and accepted NodePresentation.
- Produces: one bound session per AI save slot and one node/floor summary per accepted trigger.

- [ ] **Step 1: Write failing binding tests**

Start two AI saves and assert distinct chat IDs. Restore each and assert requests use its stored binding even if the management UI selected another chat. Start local and assert no chat is created.

- [ ] **Step 2: Verify failure**

Run: `npm test -- src/features/title/TitlePage.test.tsx src/game/saveSlots.test.ts src/features/game/GamePage.test.tsx`

- [ ] **Step 3: Bind sessions at Run creation**

Create the game-run session before starting AI mode and pass a snapshot of character, persona, preset and lorebook IDs. Apply configuration changes only to the next unstarted director stage.

- [ ] **Step 4: Persist summaries exactly once**

Append a structured node summary after settlement and a floor summary after advancing. Use trigger keys in director state to deduplicate refresh, retry and StrictMode.

- [ ] **Step 5: Migrate diary and mindsea through the bridge**

Use the bound Tavern context for diary and floor generation. Keep local drafts and deterministic mindsea fallbacks.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- src/features/title/TitlePage.test.tsx src/features/game/GamePage.test.tsx src/features/diary/DiaryDirector.test.tsx src/features/operation/NovelRunDirector.test.tsx && npm run typecheck`

Commit: `feat: bind ai runs to tavern history`

---

### Task 9: Cleanup, Browser Acceptance and Remote Push

**Files:**
- Delete obsolete LLM and Tavern gameplay files after `rg` proves no consumers.
- Modify: `e2e/helpers/mockLlm.ts`
- Create: `e2e/dual-mode-director.spec.ts`
- Create: `e2e/rosmontis-chat.spec.ts`
- Modify: `e2e/five-floor-offline.spec.ts`
- Modify: `e2e/llm-fallback.spec.ts`
- Create: `docs/verification/2026-08-31-dual-mode-ai-director-chat-audit.md`

**Interfaces:**
- Consumes: final application and mock Tavern transport.
- Produces: requirement-by-requirement completion evidence.

- [ ] **Step 1: Add browser tests**

Cover local zero-AI UI and zero remote requests, AI node worldbook provenance and validated plan, Ask fallback choices, save isolation, chat streaming and GameStore isolation, 375px layout and reduced motion.

- [ ] **Step 2: Run focused E2E and fix only evidenced failures**

Run: `npx playwright test e2e/dual-mode-director.spec.ts e2e/rosmontis-chat.spec.ts e2e/five-floor-offline.spec.ts e2e/llm-fallback.spec.ts`

- [ ] **Step 3: Remove redundancy**

Run `rg` for LlmEventDirector, TavernGameView, direct buildEventPrompt consumers, duplicate active request maps and local offline command simulation. Delete only code with no production consumer and re-run affected tests.

- [ ] **Step 4: Run the full verification matrix**

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
git diff --check
```

- [ ] **Step 5: Write the audit and verify every objective**

Record each fixed boundary, file or test evidence, command result and unresolved issue. Mark an item complete only with direct evidence.

- [ ] **Step 6: Commit, push and prove parity**

```bash
git add -A
git commit -m "test: verify dual-mode ai director and chat"
git push origin codex/rosemary-memory-maze
git rev-parse HEAD
git rev-parse origin/codex/rosemary-memory-maze
git status --short
```
