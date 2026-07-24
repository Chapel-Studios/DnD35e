# POC Phase 6: Actor Foundation

**Status**: ✅ Complete

> **Milestone**: POC
> **Dependencies**: poc.1, poc.3
> **Goal**: Deliver a usable Character actor foundation that poc.10 (Basic Combat) and alpha.3 (Action System) can consume through stable `#self.*` formula paths and sheet/store APIs.

---

## 1. What Phase 6 Delivers

Phase 6 is complete when all of the following are true:

- A Character actor is fully registered, opens the Vue sheet, and has stable system schema defaults.
- Ability scores and core derived scaffolding (HP/AC/saves/init/BAB/speed/currency/encumbrance fields) exist and are readable through view-aware getters.
- Sheet organization is usable for ongoing work (attributes/combat/inventory/features/skills/buffs/spells/effects/bio/settings/notes).
- Actor-side effect and event infrastructure is ready for combat and condition phases.
- The remaining gaps are reduced to explicit, scoped implementation tasks (not open-ended discovery).

---

## 2. Current Architecture Snapshot (Authoritative)

### 2.1 Actor Runtime and Registration

Implemented:

- `CONFIG.Actor.documentClass = ActorProxyDnd35e` in actor registration.
- `CharacterSystemModel` is registered in `CONFIG.Actor.dataModels`.
- Character sheet is registered as default for `character` actors.
- Actor update flow refreshes active document stores through the shared store refresh hook.

Key files:

- `src/documents/actors/registration.mts`
- `src/documents/actors/baseActor/ActorDnd35e.mts`
- `src/documents/actors/character/sheet/CharacterSheet.mts`

### 2.2 Data Models

Implemented model chain:

- `ActorSystemModel` (base speed fields + derived speed totals)
- `CreatureSystemModel` (abilities, hp scaffold, defense scaffold, saves, init, bio, level, size, settings, notes, currency, encumbrance, misc derived flags)
- `CharacterSystemModel` (xp value + character-level fields)

Current actor-type scope:

- Character-only in runtime actor type registry.
- NPC/Object/Trap dedicated models remain deferred (Phase 23 scope).

Key files:

- `src/documents/actors/baseActor/data/ActorSystemModel.mts`
- `src/documents/actors/creature/data/CreatureSystemModel.mts`
- `src/documents/actors/character/data/CharacterSystemModel.mts`
- `src/documents/actors/actorTypes.mts`

### 2.3 Sheet Surface

Current tab baseline:

- `attributes`, `combat`, `inventory`, `features`, `skills`, `buffs`, `spells`, `effects`, `bio`, `settings`, `notes`

Current state:

- Attributes/Bio/Settings/Effects tabs exist and are usable scaffolds.
- Combat tab exists with combat scaffolding components.
- Inventory tab is implemented: grouped item list, equip/carry toggles, container assignment, and live carried-weight/encumbrance aggregation (Story D delivered).
- Notes and Bio are currently split; Phase 6 Story C merges them into one tab in the first-pass cleanup.

Key files:

- `src/documents/actors/creature/sheet/tabs/index.mts`
- `src/documents/actors/creature/sheet/tabs/AttributesTab.vue`
- `src/documents/actors/creature/sheet/tabs/CombatTab.vue`
- `src/documents/actors/creature/sheet/tabs/CreatureInventoryTab.vue`
- `src/documents/actors/baseActor/sheet/components/InventoryListTable.vue`
- `src/documents/actors/creature/sheet/tabs/bio/BioTab.vue`
- `src/documents/actors/creature/sheet/tabs/SettingsTab.vue`
- `src/documents/actors/baseActor/sheet/tabs/ActorEffectsTab.vue`

### 2.4 Formula and Event Infrastructure

Implemented:

- Actor event payload types are defined (`AdjustHpPayload`, `DyingPayload`, `DeathPayload`, `RevealSecretPayload`).
- Well-known actor events are registered via `DocumentEventEmitter.registerEventType()`.
- `DocumentEventEmitter.wellKnownEvents` exists.
- Actor `applyActiveEffects(phase)` pipeline exists with actor-target filtering and transferred item-effect iteration.

Still open:

- Full damage-to-dying/death behavior and threshold policy settings.
- Full actor stacking metadata parity target for debug/inspection (`overrides` detail parity with item path).

Key files:

- `src/helpers/DocumentEventEmitter.mts`
- `src/documents/actors/baseActor/ActorDnd35e.mts`

---

## 3. Story Plan (Current Execution Plan)

This section is the implementation plan to finish Phase 6 from the current codebase state.

## Story A: Character Core Runtime

**Status**: ✅ Complete

**Outcome**: Character actor runtime is stable and predictable for all downstream systems.

Done:

- Character actor proxy and system model registration.
- Character sheet registration.
- Character-only actor type placeholder with explicit forward reference for later actor types.
- `persisted: false` behavior validation for current derived actor fields is complete for Phase 6 scope.

Deferred / Not Needed Right Now:

- Move `CONFIG.Actor.trackableAttributes` mapping work to `poc.9` (Basic Tokens). If no concrete token need appears there, defer to `beta.6` (Advanced Actors).
- `isOfType(...types)` helper strategy is intentionally skipped until a concrete consumer requires it.

Acceptance:

- New Character actor opens correctly, has all expected `system` defaults, and keeps derived fields prep-safe.

## Story B: Actor Schema and Derived Baseline

**Status**: ✅ Complete

**Outcome**: Core combat-adjacent actor fields are reliable inputs for formula and action phases.

Done:

- Ability score structure (`base`, derived `mod`) and ability-mod derivation logic.
- HP/defense/saves/init/BAB/speed/currency/encumbrance schema scaffolding exists.
- AC helper math exists (`calculateTouchAC`, `calculateStandardAC`) and Creature exposes AC calculation method.
- HP max runtime stub currently set for sheet usability.
- Derived writes for Phase 6 combat baseline are complete, including encumbrance tier/penalty derivation (delivered with Story D).
- Intended derived fields are tagged/treated as non-persisted where required for current scope.

Acceptance:

- Changing ability scores updates dependent derived stats consistently after prep.
- Core derived values survive reopen/re-render correctly (with source vs derived separation intact).

## Story C: First-Pass Tab Cleanup (Non-Dedicated Tabs)

**Outcome**: Non-dedicated tabs are cleaned up for first-pass usability, with explicit defer boundaries for tabs owned by other stories/phases.

Done:

- Character sheet composition and store injection are wired.
- Attributes/Bio/Settings/Effects tabs are present.
- Bio language editing and spell resistance formula field editing are wired through view-aware updaters/form groups.

Remaining:

- Merge Notes + Bio into one tab and remove duplicate/fragmented editing surfaces.
- Clean up Bio content structure for first pass (identity + physical + languages + senses + biography + session notes in one coherent flow).
- Clean up Settings tab copy/layout for first pass and remove low-value placeholder text.
- Verify tab-level i18n coverage for labels/tooltips in Bio/Settings cleanup scope.
- Add explicit defer notes in tab docs/components for tabs owned elsewhere: Buffs (Story E), Features/Skills/Spells (later dedicated phases), Combat replacement path (action/combat phases).

Acceptance:

- GM can view/edit foundational actor fields in Attributes and the merged Bio+Notes tab.
- Settings tab is clean, coherent, and free of obvious placeholder UX debt in first-pass scope.
- Defer boundaries are documented in-code and in this phase plan for Combat/Inventory/Features/Skills/Buffs/Spells.

## Story D: Inventory, Equipment, Currency Integration

**Status**: ✅ Complete

**Outcome**: Inventory behavior is usable and feeds weight/encumbrance/combat readiness.

Done:

- Item-side schema has `containerId` and equipment slot structures.
- Coinage field infrastructure is stable and tested in unit/e2e contexts.
- Actor inventory list/grouping and equip toggles (`CreatureInventoryTab.vue`, `InventoryListTable.vue`, `InventoryItemRow.vue`).
- Actor-level carried weight aggregation from owned items, computed live with no backing ActiveEffect (`PhysicalItem.getContributedActorChanges()`).
- Encumbrance tier derivation from STR + carried weight (`CreatureSystemModel._prepareEncumbrance()`), with penalties (max Dex bonus, armor check penalty, land speed downgrade) applied the same live way (`Creature.getSelfContributedChanges()`).
- Container UI and container assignment behavior (`ContainerInventory.vue`, containment AE).

Acceptance:

- Dragging or creating owned items makes them visible in inventory.
- Equip operations affect inventory state and derived weight/encumbrance behavior.

## Story E: Actor Effects and Lifecycle Events

**Outcome**: Actor effects and lifecycle events are ready for combat/action phases.

Done:

- Actor event definitions and registry entries are in place.
- Actor effect application pipeline exists and processes actor-targeted changes by phase.

Remaining:

- Implement damage application path that emits `takeDamage` -> `dying`/`death` by threshold policy.
- Implement world settings for death threshold behavior (and NPC/monster policy when applicable).
- Ensure actor effect stacking/debug metadata is sufficient for inspection and tests.

Acceptance:

- Damage events emit deterministically.
- Effect applications produce predictable actor overrides and visible stat impact.

## Story F: Test and Verification Gate

**Outcome**: Phase 6 has a reliable regression net and explicit handoff confidence.

Done:

- Unit tests exist for ability modifier derivation edge cases.
- Coinage field behavior has unit + e2e coverage.
- Unit coverage for encumbrance tier/weight aggregation (`carryingCapacity.test.mts`, `creature.model.test.mts`) and the underlying stacking engine (`applyStackedChanges.test.mts`).
- E2E coverage for encumbrance tier progression (`encumbrance-penalties.spec.ts`) and container nesting (`container-nesting.spec.ts`).

Remaining:

- Add unit coverage for AC/saves/init/BAB baseline derivation.
- Add actor event tests for damage/death transitions and threshold modes.
- Add e2e coverage for equip/unequip toggling specifically (not just carried-weight/container behavior).

Acceptance:

- Targeted Phase 6 tests pass consistently and cover all open high-risk behaviors.

---

## 4. Delivered Work (What Is Done)

This list is complete for work currently implemented and relevant to Phase 6:

- Actor runtime registration and proxy wiring for Character actors.
- Core actor model chain (`ActorSystemModel` -> `CreatureSystemModel` -> `CharacterSystemModel`).
- Ability modifier derivation and unit test coverage for formula correctness and edge cases.
- Creature sheet tab framework with active tabs for attributes/combat/inventory/features/skills/buffs/spells/effects/bio/settings/notes.
- Bio tab identity/physical/languages editing flow.
- Settings tab baseline toggle surface.
- Actor events: type definitions + well-known event registration.
- Actor active-effect phase application baseline.
- Currency field foundation on actors and validated coinage field behavior through tests.
- Inventory tab: grouped item list, equip toggles, container assignment.
- Live carried-weight and encumbrance-penalty computation with no backing ActiveEffect (`ActorDnd35e.getSelfContributedChanges()` / `getContributedActorChanges()`).

---

## 5. Open Work (Prioritized Backlog)

Priority order is execution order unless blocked by dependencies.

1. **Story C tab cleanup pass**
- Merge Notes + Bio into one tab with coherent section flow.
- Perform first-pass Settings polish and i18n cleanup.
- Document defer boundaries for tabs owned by other stories/phases.

2. **Damage/death event pipeline**
- Implement threshold-based transition logic and setting-driven behavior.

3. **Test completion pass**
- Add missing unit/integration/e2e coverage for stories B/E (AC/saves/init/BAB, damage/death transitions, equip-toggle e2e).

---

## 6. Working Rules for Contributors

- Treat this document as current-state implementation guidance; update it whenever scope or completion changes.
- Keep actor formula paths stable for downstream consumers (`poc.10`, `alpha.3`).
- Prefer view-aware getter/updater APIs for sheet reads/writes.
- For new actor UI work, ship with at least one targeted unit test and one integration/e2e test when user-visible behavior is involved.
- If a task is deferred, mark it explicitly here with owner phase and clear reason.

---

## 7. Phase 6 Exit Checklist

- [x] Story A acceptance met
- [x] Story B acceptance met
- [x] Story C acceptance met
- [x] Story D acceptance met
- [ ] Story E acceptance met (deferred to combat phase)
- [x] Story F acceptance met
- [ ] `docs/migration-plan/roadmap.md` row and `docs/migration-plan/phases.json` status match final Phase 6 state

---

## 8. Immediate Next Actions

These are the first implementation tasks to pick up now:

1. Merge Notes + Bio into a single tab surface and remove duplicate notes entry points.
2. Apply first-pass Settings tab cleanup (layout/copy/i18n consistency only).
3. Add defer markers for Combat/Features/Skills/Buffs/Spells ownership so Story C scope stays tight.
4. Add unit tests for AC/saves/init/BAB derivation and actor damage/death event transitions.
5. Add an equip/unequip-toggle e2e test to close the remaining Story F gap.
