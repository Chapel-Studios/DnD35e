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

### Task 11.3 — Wire up weapon Property flags

**Objective**: `dnd35e.WEAPON.Property.*` (`blocking`, `brace`, `double`, `disarm`, `finesse`, `fragile`, `grapple`, `improvised`, `monk`, `nonLethal`, `nonLethalNoPenalty`, `performance`, `reach`, `sunder`, `thrown`, `trip`) exist in `src/lang/en/weapons.json` but have no corresponding schema field on `WeaponSystemModel` at all — not even as unwired booleans. There is no `system.properties` (or similar) shape on the weapon DataModel, and none of these strings are referenced anywhere in `src/documents/items/physical/weapon/`.

**Draft acceptance criteria**:
- Decide the field shape (e.g. a `SetField`/boolean-map of weapon properties) and add it to `WeaponSystemModel`.
- Sheet exposes the properties (even as a plain checklist, no mechanical hookup required yet).
- Each property's actual rules effect (disarm, trip, reach, etc.) is out of scope for this task — tracked separately once combat mechanics phases need them.

---

### Task 11.4 — Lang file cleanup (organization & deduplication)

**Objective**: `src/lang/en/*.json` has grown ad hoc across phases — audit for inconsistent key organization and duplicate/near-duplicate strings (e.g. the same label defined under more than one document type's file, or both a `FIELDS.*` entry and a bespoke top-level entry for the same concept).

**Draft acceptance criteria**:
- Inventory all `src/lang/en/*.json` files and flag duplicate string values/keys that should share one localization key.
- Establish (or confirm) a consistent key-ordering/section convention per file and apply it uniformly.
- Cross-check against `_old_lang/en.json` only for coverage gaps, not as a structural template.
- No functional/rendering changes — this is a content-organization pass, verified by `npm run build` (lang bundling) still succeeding and no `game.i18n.localize` misses.

---

### Task 11.5 — Review `_displayName`/`displayName` getters on `ItemDnd35e`

**Objective**: `ItemDnd35e._displayName`/`.displayName` (`src/documents/items/baseItem/ItemDnd35e.mts`) duplicate the exact same `getDisplayName(fallbackName, this.system, this)` logic as the `name` getter directly above them. Confirm whether any caller actually needs a separate accessor from `name`, or if these are leftover from before `name` itself became formula-driven.

**Draft acceptance criteria**:
- Find all consumers of `.displayName`/`._displayName` across `src/` and Vue components.
- If no consumer needs a distinct value from `.name`, remove both getters and repoint callers to `.name`.
- If a real distinction is needed (e.g. a non-masked/true-value variant), document why and rename for clarity instead of leaving `_displayName`/`displayName` as unexplained duplicates.

---

## Checklist

### ✅ Complete
- [ ] Create cleanup phase stub and register in roadmap tracking.

### 🔶 In Progress
- None yet.

### ❌ Not Started
- [ ] 11.1 FormGroup updater contract pass (async Promise-returning callbacks).
- [ ] 11.2 AE pipeline codebase TODOs (`_shimChanges` blocked on v16 upgrade; `Hooks.onError`/`LogHelper` still open) — moved from poc.7. `createDialog` type cast fixed directly (no `as any` needed).
- [ ] 11.3 Wire up weapon Property flags (`dnd35e.WEAPON.Property.*` has no schema field on `WeaponSystemModel`).
- [ ] 11.4 Lang file cleanup — organize and deduplicate `src/lang/en/*.json`.
- [ ] 11.5 Review `_displayName`/`displayName` getters on `ItemDnd35e` (duplicate `name` getter's logic — still needed?).
- [ ] Add more POC cleanup tasks as they are discovered during final POC work.

---

## Notes for Future Additions

When adding tasks to this phase:
- Prefer concrete, verifiable cleanup items (not broad themes).
- Add a short rationale and expected verification for each task.
- Keep tasks scoped to cleanup/hardening, not net-new feature delivery.
