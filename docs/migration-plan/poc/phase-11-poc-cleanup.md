# POC Phase 11: POC Cleanup

**Status**: 📖 Rough Sketch

> **Milestone**: POC  
> **Dependencies**: poc.1, poc.2, poc.3, poc.4, poc.5, poc.6, poc.7, poc.8, poc.9, poc.10  
> **Goal**: Capture and execute end-of-POC cleanup tasks in one place so we can harden patterns before moving into Alpha.

---

## Table of Contents

1. [Overview & Scope](#overview--scope)
2. [Initial Task Seed](#initial-task-seed)
3. [Checklist](#checklist)
4. [Notes for Future Additions](#notes-for-future-additions)

---

## Overview & Scope

This phase is intentionally a catch-all cleanup bucket at the tail end of POC.

Use it to collect debt discovered while implementing earlier POC phases, especially where behavior is already working but patterns are inconsistent, hard to reason about, or risky to carry into Alpha.

Current shape is intentionally light-weight (rough sketch). We will keep appending tasks as cleanup candidates are discovered.

---

## Initial Task Seed

### Task 11.1 — FormGroup updater contract pass

**Objective**: Make FormGroup updater callbacks consistently async and Promise-returning.

**Why now**:
- We currently have mixed sync/async updater patterns across FormGroup wrappers.
- `DocumentSheetStore` updater APIs already return `Promise<boolean>`.
- A uniform async contract will simplify wrapper composition, test expectations, and future masking/view-mode routing work.

**Draft acceptance criteria**:
- All FormGroup-like wrappers use updater functions that return Promises.
- Explicit `onUpdate` props accept Promise-returning handlers consistently.
- No wrapper silently drops async completion state.
- Unit tests cover at least one async update path per major FormGroup category.

---

### Task 11.2 — AE pipeline codebase TODOs (moved from poc.7)

**Objective**: Resolve remaining TODO notes left in the AE apply pipeline during poc.7 work, none of which needed to block poc.7 itself.

- [ ] **Remove `ActiveEffect._shimChanges` compat shim** (`ItemDnd35e.mts:131`): The `_shimChanges(changes)` call is explicitly marked `// todo remove in v16`. **Blocked — not actionable yet**: the system currently targets Foundry v14; revisit once the project actually upgrades to v16. If v16 migration transforms old AE data, remove the shim call and its TODO comment. If the shim is still required for pre-migration data, keep it but update the comment with the specific migration that will obsolete it.
- [ ] **Integrate Hooks.onError pattern into LogHelper** (`ItemDnd35e.mts:93`): The `applyActiveEffects()` method uses `LogHelper.error()` as a substitute for Foundry's `Hooks.onError()` pattern. Evaluate whether `LogHelper` should wrap `Hooks.onError()` for consistency with Foundry's error surfacing (e.g., error hooks that modules can listen to), or if the current direct logging is sufficient.

---

## Checklist

### ✅ Complete
- [ ] Create cleanup phase stub and register in roadmap tracking.

### 🔶 In Progress
- None yet.

### ❌ Not Started
- [ ] 11.1 FormGroup updater contract pass (async Promise-returning callbacks).
- [ ] 11.2 AE pipeline codebase TODOs (`_shimChanges` blocked on v16 upgrade; `Hooks.onError`/`LogHelper` still open) — moved from poc.7. `createDialog` type cast fixed directly (no `as any` needed).
- [ ] Add more POC cleanup tasks as they are discovered during final POC work.

---

## Notes for Future Additions

When adding tasks to this phase:
- Prefer concrete, verifiable cleanup items (not broad themes).
- Add a short rationale and expected verification for each task.
- Keep tasks scoped to cleanup/hardening, not net-new feature delivery.
