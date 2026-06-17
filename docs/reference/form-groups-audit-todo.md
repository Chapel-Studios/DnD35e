# Form Groups Audit TODO

Purpose: track implementation work that came out of the FormGroups audit.

Related:
- [Form Groups Cheat Sheet](docs/reference/form-groups-cheatsheet.md)
- [fieldBuilders.mts](src/fields/fieldBuilders.mts)
- [DocumentSheetStore.mts](src/documents/document/sheet/DocumentSheetStore.mts)

## Status Legend

- [ ] Not started
- [-] In progress
- [x] Done

## Audit Completion Definition (Done = all true)

- [ ] Every FormGroup call site is assigned to exactly one use case (A-H).
- [ ] No remaining `direct-update` usage in Vue call sites.
- [ ] No remaining `edit-derived` / `editDerived` usage in FormGroup APIs or call sites.
- [ ] Every remaining `:on-update` is non-pass-through and justified by Use Case C or F.
- [ ] Strict-permissions `forceEdit` behavior is implemented consistently across all FormGroup variants.
- [ ] `readOnly` + `forceEdit` are exposed consistently across all target FormGroup variants.
- [ ] Label/hint overrides are reduced to intentional exceptions only.
- [ ] Tests cover masked strategy behavior, projection pair behavior, and mode/permission behavior.

## Phase 0: Inventory and Classification

### 0.1 Freeze inventory baseline
- [ ] Regenerate FormGroup usage inventory (component + option combinations + files).
- [ ] Save/refresh inventory artifact (`tmp/form-group-usage.json`) for this audit pass.
- [ ] Create a working classification sheet mapping each usage to Use Case A-H.

### 0.2 Identify mandatory migrations
- [ ] Produce explicit list of call sites using legacy options:
  - `direct-update`
  - `edit-derived` / `editDerived`
  - `:on-update` pass-through wrappers with no behavior
- [ ] Produce explicit list of likely-redundant `label`/`hint` overrides.

## Phase 1: Field-Level Mask/Edit Strategy (start here)

### 1.1 Add schema metadata for masked edit behavior
- [ ] Extend `SchemaFieldMeta` in [fieldBuilders.mts](src/fields/fieldBuilders.mts) with:
  - `maskable?: boolean` (default `true`)
  - `maskedEditStrategy?: 'playerSecretRoute' | 'deltaMirror'` (default `'playerSecretRoute'`)
- [ ] Wire both options into `useDnd35eField(...)` options bag.
- [ ] Document defaults and intended behavior in code comments.

### 1.2 Store routing implementation
- [ ] Update masked write flow in [DocumentSheetStore.mts](src/documents/document/sheet/DocumentSheetStore.mts) to consult schema metadata.
- [ ] Keep current behavior as default (`playerSecretRoute`).
- [ ] Implement `deltaMirror` strategy for numeric fields:
  - player masked edit: compute delta vs visible value; apply to true value and visible side.
  - GM true edit: compute delta vs true value; apply to visible side.
- [ ] Add guard/fallback for non-numeric `deltaMirror` fields (warn + no-op or route default).

### 1.3 Initial field adoption
- [ ] Mark actor HP state fields with `maskedEditStrategy: 'deltaMirror'` (`current`, `temp`, `nonlethal`).
- [ ] Mark item HP state fields with `maskedEditStrategy: 'deltaMirror'` where applicable.
- [ ] Confirm behavior for:
  - masked player edit (no paradox)
  - GM edit while masks exist
  - unmasked normal edit

## Phase 2: FormGroup API Standardization

### 2.1 Shared contract types
- [ ] Add shared form-group prop contract types in [types.mts](src/vue/components/fields/formGroups/types.mts).
- [ ] Standardize support for `readOnly` + `forceEdit` across all FormGroup variants.

### 2.2 Permission-safe `forceEdit`
- [ ] Enforce strict-permissions forceEdit rule across all FormGroup components:
  - `forceEdit` controls editor visibility only.
  - final input enabled/disabled state follows resolved field editability.
  - `readOnly` and explicit `disabled` still win.

### 2.3 Remove obsolete direct-update usage
- [ ] Audit all `direct-update` call sites.
- [ ] Remove all `direct-update` props from FormGroup call sites.
- [ ] Remove `directUpdate` from FormGroup prop contracts and component implementations.
- [ ] Ensure all writes route through view-aware updater flow plus field strategy metadata.

### 2.4 Projection pair contract (Use Case C)
- [ ] Define future FormGroup contract: projected editors use `:value` + `:on-update` pair; updater wraps `getViewAwareFieldUpdater(fieldPath)`.
- [ ] Remove `editDerived` / `edit-derived` from all FormGroup variants and shared docs.
- [ ] Standardize edit-input value resolution across variants:
  - If `value` prop is provided, use it for edit display.
  - Else use source value for standard field-path editing.
- [ ] Migrate all current `edit-derived` call sites to projection-pair pattern (Distance/Weight/EffectDuration/Masterwork/Broken and any remaining).
- [ ] Ensure transformed editors include explicit inverse mapping function in component code.

### 2.5 Callback necessity audit (Use Case F)
- [ ] Audit every `:on-update` call site and classify as:
  - projection pair (Use Case C)
  - domain callback (Use Case F)
  - unnecessary passthrough (remove)
- [ ] Remove all unnecessary pass-through `:on-update` usage.
- [ ] For remaining callbacks, ensure inline/docs comment clarifies why callback is required.

### 2.6 Use-case alignment sweep (A-H)
- [ ] For each use case, verify call sites match minimal settings and intent:
  - A: plain `field-path`
  - B: schema strategy (`deltaMirror`) + simple FormGroup usage
  - C: projection pair (`value` + wrapped `onUpdate`)
  - D: `read-only`
  - E: `force-edit` with strict permission enforcement
  - F: callback-only where domain logic is required
  - G: explicit `disabled` as hard-stop UI override
  - H: intentional label/hint overrides only
- [ ] Reassign or refactor outliers until all call sites conform.

## Phase 3: Cleanup and Correctness

### 3.1 Redundant override removal
- [ ] Remove explicit `label`/`hint` overrides where schema-derived labels are equivalent.
- [ ] Keep intentional overrides (abbreviations, alternate wording, non-schema settings UIs).
- [ ] Audit likely redundant label overrides:
  - `SettingsTab.vue` (`system.settings.isPartyMember`)
  - `BioTab.vue` (`system.bio.senses`)
  - `ActorSpeed.vue` (`system.speed.flyManeuverability`)
  - `ItemSize.vue` (`system.size`)
- [ ] Confirm intentional overrides remain intentional:
  - `AbilityScores.vue`, `AbilityScoresSection.vue`, `AbilityScoresTable.vue` (abbreviated labels)
  - `UniqueId.vue` (`UID` label)
  - `HealthSettingsApp.vue` labels/hints (non-schema settings surface)

### 3.2 Tests
- [ ] Add tests for masked edit strategies (`playerSecretRoute`, `deltaMirror`).
- [ ] Add tests for forceEdit authorization across edit/play/true and GM/non-GM.
- [ ] Add regression tests for HP paradox scenarios.
- [ ] Add tests for projection-pair behavior:
  - projected value renders in edit mode when `value` prop supplied
  - custom updater wraps `getViewAwareFieldUpdater` (no direct path bypass)
  - inverse mapping round-trip (localized display -> stored base value)

## Phase 4: Verification and Sign-off

### 4.1 Static verification gates
- [ ] Search gate: zero `direct-update` usage in Vue templates.
- [ ] Search gate: zero `edit-derived` / `editDerived` usage in FormGroup public APIs and call sites.
- [ ] Search gate: every remaining `:on-update` mapped to Use Case C or F.

### 4.2 Runtime/behavior verification
- [ ] Manual verification pass for each use case A-H on representative sheets.
- [ ] Verify strict-permissions `forceEdit` behavior for GM and non-GM in play/true modes.
- [ ] Verify HP delta-mirror behavior with masks and role-aware clamping behavior.

### 4.3 Documentation sync
- [ ] Ensure cheat sheet remains final-state only and reflects implemented behavior.
- [ ] Keep this TODO as the sole location for migration/audit execution detail.

## Notes / Open Questions

Implementation findings moved from cheat sheet:
- `forceEdit` currently bypasses disable in NumberFormGroup and can allow permission bypass behavior.
- `forceEdit` is not exposed on all primitive groups yet.
- `readOnly` is not exposed on all primitive groups yet.
- Permission enforcement is split between FormGroup slot rendering and per-component disabled logic.
- `directUpdate` usage still exists and conflicts with schema-driven masked edit routing.
- `editDerived` usage still exists and conflicts with projection-pair semantics (`value` + `onUpdate`).

1. Delta mirror clamping behavior:
- Decision: clamp mirrored updates.
- Remaining design detail: clamp source must be role/view-aware for HP-like fields.
  - player edits should clamp against masked max.
  - GM edits should clamp against true max.
  - unresolved edge case: when a secret increases max, GM should still be able to set current to true max.

2. Conflict resolution:
- Decision: deltaMirror updates only two destinations:
  - true value
  - the single player-edit secret path for that field
- Assumption: there is only one player-edit secret path participating in this flow.

3. Migration path:
- No migration work in current phase.
- Migration strategy decisions are deferred to alpha.
