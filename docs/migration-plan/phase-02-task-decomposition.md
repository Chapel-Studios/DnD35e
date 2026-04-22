# Phase 2 Task Decomposition: Active Effect on Item (Material)

**Milestone**: POC  
**Phase Duration**: N/A (structure, no timeline)  
**Total Complexity**: Large

---

## Executive Summary

Phase 2 decomposes into **17 work tracks** spanning two major subsystems plus closeout follow-up work:

1. **Material AE + Bonus Type Stacking**: Core game mechanic
2. **Secret AE + Identification System**: Player masking / GM transparency
3. **Phase 2 Closeout Follow-Ups**: Material dev testing, General AE cleanup, then deferred secret image work

Tracks run in **3 concurrent streams** with carefully managed dependencies. The Material subsystem gates the Secret subsystem only at one synchronization point (GeneralSystemModel exists). Both subsystems enable Phase 5's actor-level integration.

**Lead dev effort**: ~50% (Tracks 1, 4, 5, 7, 8, 9, 10, 12)  
**Jr dev effort**: ~40% (Tracks 2, 3, 6, 11)  
**Pair opportunities**: Testing, documentation, data validation

### Progress Snapshot (2026-04-22)

Completed in current implementation pass:

- Track 3 parity fix: `bonusType` / `condition` now typed to match schema reality (`null` allowed in persisted change rows).
- Track 6 boundary fix: stacking bridge normalizes "untyped" bonus values (`null`/`''` -> `undefined`) before grouping/history.
- Track 7 tooltip UX fix: effect bonus types are localized for display; empty values render nothing.
- Track 13 render-mode sync fix: `hasSecrets` is no longer constructor-captured only; RenderModeStore now supports live secret-state updates and the sheet syncs from the live document on render.
- Data-layer boundary cleanup: Secret system data now imports base AE data types directly from the data module (not barrel exports).

Phase 2 remains in progress; several implementation tracks are still open and can be delegated.

---

## Work Tracks

### TRACK 1: Stacking Engine Foundation [LEAD DEV]

**Goal**: Implement the generic, reusable bonus type stacking resolution algorithm.

**Rationale**: This is the foundational piece that both Material AE and Secret AE depend on. It's generic and doesn't know about specific effect types or fields — it just resolves bonuses and tracks history.

**Dependencies**: None (parallel with everything)

**Blocking**: Track 5, Track 9 (consumers of the algorithm)

**Complexity**: Large (algorithmic core, multiple interfaces, history tracking logic)

**Tasks**:

1. **Create `src/helpers/stacking.mts` with interfaces**
   - `ResolvedChanges`: `{ winners: Change[], history: ChangeHistory[] }`
   - `ChangeHistory`: per-field tracking of applied/ignored changes with reasons
   - `ChangeApplication`: applied change with source, value, bonusType, reason
   - `ChangeIgnored`: rejected change with rejection reason
   - Export all interfaces
   - ✅ **Verify**: File compiles, all interfaces exported, matches Phase 2 §2.5.1 spec

2. **Implement `resolveActiveEffectChanges()` function**
   - Group changes by `{ field, bonusType }`
   - Apply stacking rules:
     - `'untyped'` and `'dodge'`: always stack (sum)
     - Named types: highest-wins per field
     - Penalties: always apply
   - Track which changes were applied and which were rejected with reasons
   - Return `{ winners[], history[] }`
   - ✅ **Verify**: 
     - Three changes, same bonusType, same field → only highest returned
     - Untyped changes sum across all types
     - Dodge changes don't block other dodge bonuses
     - Penalties always apply (never ignored by stacking)
     - History accurately lists applied and ignored with reasons
     - Zero-value changes excluded from output

3. **Document the dual-stack pattern** (Phase 2 §2.5.2)
   - Algorithm accepts optional `excludeEffectIds` parameter for masked resolution
   - When called with excluded IDs, produces a "player-perceived" stack separate from the real stack
   - Add code comment explaining use case (masks, dual-stack for chat cards)
   - ✅ **Verify**: Comments explain the exclusion pattern; code is defensible for later chat card integration

**Acceptance Criteria**:
- Function signature, interfaces, and return type match Phase 2 spec exactly
- 3+ unit tests (deferred to Phase 4) outline expected test cases
- Code comments document bonus type rules and history tracking
- No dependencies on Item, Actor, or specific AE types — pure bonus resolution

---

### TRACK 2: Bonus Type Constants [FLEXIBLE / JR DEV]

**Goal**: Define the initial bonus type set and export it as a constant union.

**Rationale**: Simple, high-confidence enabler for Material AE and stacking. Should be done early so both subsystems have it ready.

**Dependencies**: None (parallel)

**Blocking**: Track 5, Track 6 (consumers need the type)

**Complexity**: Small

**Tasks**:

1. **Create `src/constants/bonusTypes.mts`**
   - Export `BonusType` type union
   - Initial types only: `'material'` | `'broken'` | `'masterwork'`
   - Add a code comment: "Add new types only when a consumer exists — no speculative types" (Phase 2 §2.5)
   - ✅ **Verify**: Union exports 3 types only, not more; compiles without circular deps

2. **Document extensibility principle**
   - Code comment listing which phases will add which new types:
     - Phase 10 (Feats): dodge, untyped
     - Phase 15 (Equipment): armor, shield, natural, deflection, enhancement
     - etc.
   - ✅ **Verify**: Comment is clear for future readers

**Acceptance Criteria**:
- Small file, easy to review
- Type is imported by Track 3 (Dnd35eEffectChangeData) and Track 5 (integration)
- No impl changes needed later — just additions to the union

---

### TRACK 3: Dnd35eEffectChangeData Update [LEAD DEV]

**Goal**: Extend the AE change data interface and schema to include `bonusType` and `condition` fields.

**Rationale**: Foundation for stacking (bonusType) and action phases (condition). Both interface and schema must match.

**Dependencies**: Track 2 (BonusType constant)

**Blocking**: Track 4, Track 5 (consumers depend on schema)

**Complexity**: Small

**Tasks**:

1. **Update `Dnd35eEffectChangeData` TypeScript interface**
  - Add `bonusType?: BonusType | null` (optional; persisted rows may carry `null`)
  - Add `condition?: string | null` (optional; action phases only — Phase 8)
   - Verify `phase` already exists in interface (it's in schema, may be missing from TS interface)
   - ✅ **Verify**: Interface compiles, extends foundry.EffectChangeData correctly

2. **Update `ActiveEffectSystemModelBase` schema**
   - Add `bonusType` as optional `new StringField()` (allow null for legacy)
   - Add `condition` as optional `new StringField()` (Phase 8 will add validation)
  - No constraints needed in Phase 2 — values are set at collection time
  - ✅ **Verify**: Schema compiles; field may persist as `null`/`''` in legacy/UI paths and is normalized at runtime where needed

3. **Verify schema → TS interface parity**
   - Both have bonusType and condition (or neither)
   - ✅ **Verify**: No build warnings about mismatched types

**Acceptance Criteria**:
- Optional fields don't break existing changes that don't set them
- Both interface and schema updated together
- No breaking changes to existing change rows

---

### TRACK 4: Core AE Registration & Routing [LEAD DEV]

**Goal**: Replace Foundry's legacy `'base'` effect type with a custom `'general'` type, establish CONFIG registration pattern for custom AE types.

**Rationale**: All custom effect types (General, Material, Secret) follow the same registration pattern. This track establishes the pattern early. Foundry v14 moved schema to system model, so we register via `CONFIG.ActiveEffect.dataModels`. All new AEs must have a registered type.

**Dependencies**: None (parallel, but Phase 2 needs this before Materials/Secrets can register)

**Blocking**: Track 5, Track 7 (Secret registration depends on this pattern)

**Complexity**: Large (CONFIG, routing, type registration)

**Tasks**:

1. **Create `GeneralSystemModel` and `General` document class**
   - Location: `src/entities/activeEffects/general/`
   - `GeneralSystemModel.mts`: extends `Dnd35eActiveEffectSystemModel`, no additional schema fields
   - `General.mts` document class: bare minimum, just the type constant
   - Type constant: `GENERAL_EFFECT_TYPE = 'general'` exported from `effectTypes.mts`
   - ✅ **Verify**: Class compiles, has proper type constant

2. **Register GeneralSystemModel in CONFIG**
   - Location: `src/entities/activeEffects/registration.mts` (new or existing registration file)
   - Add to `CONFIG.ActiveEffect.dataModels`:
     ```typescript
     CONFIG.ActiveEffect.dataModels['general'] = GeneralSystemModel;
     ```
   - Set `CONFIG.ActiveEffect.baseTypeAllowed = false` (force all AEs to have a type; we'll set defaults to 'general')
   - Set `CONFIG.ActiveEffect.legacyTransferral = false` (prevent Foundry's auto-migration of old AEs)
   - ✅ **Verify**: CONFIG updates don't error; plain AE creation defaults to 'general' type

3. **Update `effectTypes.mts`**
   - Replace `BASE_EFFECT_TYPE = 'base'` with `GENERAL_EFFECT_TYPE = 'general'`
   - Add `'general'` to `EFFECT_TYPES` array
   - Add `'general'` to `EffectType` union
   - Remove references to `'base'` type (search codebase)
   - ✅ **Verify**: EffectType union compiles, exports are correct

4. **Update `ActiveEffectProxyDnd35e` routing**
   - Route `type === 'general'` through `DnD35eActiveEffect` (our custom class)
   - Remove fallback to vanilla `ActiveEffect` for unknown types
   - All AEs must be routed explicitly (no catch-all)
   - ✅ **Verify**: Proxy correctly instantiates General AEs as DnD35eActiveEffect subclass

5. **Register custom AE phases**
   - Add to `CONFIG.ActiveEffect.phases`:
     ```typescript
     CONFIG.ActiveEffect.phases.core = {
       label: 'DND35E.ActiveEffect.Phase.Core',
       hint: 'Core stat modifiers (racial mods, BAB, saves)'
     };
     // 'initial' and 'final' are already in Foundry — no need to re-register
     // Action phases registered in Phase 8
     ```
   - ✅ **Verify**: Core phase is selectable in AE change UI

6. **Register FAMILIAR change type** (Part 1)
   - Register in `CONFIG.ActiveEffect.changeTypes`:
     ```typescript
     CONFIG.ActiveEffect.changeTypes.familiar = {
       label: 'DND35E.ChangeMode.FormulaFamiliar',
       defaultPriority: 50,
       handler: null // handler deferred to Phase 7
     };
     ```
   - ✅ **Verify**: Type is registered; handler can be null (Phase 7 fills it in); type appears in AE change mode picker

7. **Relocate CONFIG.dnd35e to dedicated module**
   - Current: defined inline in `main.mts` (line 15, TODO comment)
   - Create: `src/constants/config/system.mts` (new file)
   - Move the entire CONFIG.dnd35e object there
   - Import and assign in `main.mts` or `init` hook
   - ✅ **Verify**: CONFIG.dnd35e still accessible globally; no import errors; build passes

**Acceptance Criteria**:
- All AE types follow the same registration pattern
- No legacy 'base' type remaining
- CONFIG setup is clean and documented for future type additions
- Existing AE creation (without explicit type) defaults to 'general' with our schema

---

### TRACK 5: Material Subtype Field [JR DEV]

**Goal**: Add `materialSubtype` field to Material AE, map subtype to bonus type during buildChanges().

**Rationale**: Distinguishes standard/broken/masterwork materials. Independent of Track 1 (stacking engine).

**Dependencies**: Track 2 (BonusType constant), Track 3 (Dnd35eEffectChangeData updated)

**Blocking**: Track 6 (consumers of the subtype)

**Complexity**: Medium

**Tasks**:

1. **Add `materialSubtype` field to `MaterialSystemModel` schema**
   - Location: `src/entities/activeEffects/material/data/MaterialSystemModel.mts`
   - Field definition:
     ```typescript
     materialSubtype: new foundry.data.fields.StringField({
       required: true,
       initial: 'standard',
       choices: ['standard', 'broken', 'masterwork'],
     })
     ```
   - ✅ **Verify**: Field exists in schema, defaults to 'standard', only 3 choices

2. **Map materialSubtype to bonus type in buildChanges()**
   - Location: same file, `buildChanges()` method
   - Logic:
     - `'standard'` → `bonusType: 'material'` (highest-wins, material type)
     - `'broken'` → `bonusType: 'broken'` (penalty, always applies)
     - `'masterwork'` → `bonusType: 'masterwork'` (highest-wins, masterwork type)
   - Attach `source` label at collection time (e.g., "Material (Steel)", "Broken Material", "Masterwork")
   - ✅ **Verify**: 
     - Standard material generates changes with bonusType: 'material'
     - Broken material generates changes with bonusType: 'broken'
     - Masterwork generates changes with bonusType: 'masterwork'
     - Source labels are descriptive

3. **Verify `bonusType` locked from Material AE sheet UI**
   - Material AE sheet should NOT expose `bonusType` as an editable field
   - `bonusType` is auto-set from subtype, read-only
   - Standard AE/General AE changes SHOULD expose bonusType (so users can set bonus types on arbitrary AEs)
   - ✅ **Verify**: Material sheet UI test confirms bonusType not visible (or read-only); General AE sheet shows bonusType field

**Acceptance Criteria**:
- materialSubtype is user-editable (Phase 5 UI will improve this)
- Each subtype maps to correct bonus type
- buildChanges() regenerates with correct bonusType every prep cycle
- bonusType hidden from Material AE UI but visible on generic AEs

---

### TRACK 6: Stacking Integration into Item Apply [LEAD DEV]

**Goal**: Insert stacking pre-filter into `ItemDnd35e.applyActiveEffects()` before applying changes, enrich Override type with stacking metadata.

**Rationale**: The consumer of Track 1. This is where the stacking algorithm enters the game loop.

**Dependencies**: Track 1 (stacking algorithm exists), Track 2 (BonusType), Track 3 (Dnd35eEffectChangeData), Track 4 (routing works), Track 5 (Material produces changes)

**Blocking**: Track 8, Track 9 (UI that consumes enriched overrides)

**Complexity**: Large (refactor existing method, add new data structures)

**Tasks**:

1. **Refactor `ItemDnd35e.applyActiveEffects()` to run stacking pre-filter**
   - Location: `src/entities/items/baseItem/ItemDnd35e.mts`
   - New flow:
     1. Collect all changes (existing code)
     2. Attach `source` label to each: `change.source = change.effect.displayName`
     3. Separate penalties (value < 0) from bonuses (value >= 0)
     4. Call `resolveActiveEffectChanges(bonuses, penalties)` → get `{ winners, history }`
     5. Only pass **winners** to `ActiveEffect.applyChange()`
     6. Record losers in overrides with rejection reason
     7. Normalize `bonusType` to stacking semantics at boundary (`null`/`''` => `undefined`) before grouping
   - ✅ **Verify**:
     - Two materials both add +10, +20 hardness → only +20 applied (not +30)
     - Penalties still applied (always apply rule)
     - Untyped bonuses stack
     - Null/blank bonusType does not create fake typed groups
     - History is produced and captured

2. **Extend `Override` type with stacking metadata**
   - Location: type definition for ItemDnd35e.overrides
   - New optional fields:
     - `bonusType?: BonusType`
     - `stackResult?: 'applied' | 'ignored'`
     - `stackReason?: string` (e.g., "highest-wins rejected (10 < 20)")
   - ✅ **Verify**: Override entries can be enriched with metadata

3. **Enrich `this.overrides` with stacking metadata after resolution**
   - For each applied change in history:
     - Find matching override entry (by field and source)
     - Set: `stackResult: 'applied'`, `stackReason: history.applied[i].reason`, `bonusType`
   - For each ignored change in history:
     - Create override entry (since it wasn't applied):
       ```typescript
       {
         fieldPath: field,
         value: ign.value,
         effectName: ign.source,
         type: 'add',
         bonusType: ign.bonusType,
         stackResult: 'ignored',
         stackReason: ign.reason
       }
       ```
   - ✅ **Verify**: Overrides include applied and ignored entries with full metadata

4. **Verify overrides repopulate every cycle**
   - Overrides are derived data (not persisted)
   - Every `applyActiveEffects()` call repopulates from scratch
   - ✅ **Verify**: Re-preparing the item clears and rebuilds overrides; no stale metadata

**Acceptance Criteria**:
- Material stacking is correct (highest-wins per field)
- Stacking history is captured in overrides
- Overrides can be consumed by UI components (Track 8)
- No breaking changes to existing override consumers

---

### TRACK 7: Material & Stacking UI [JR DEV / FLEXIBLE]

**Goal**: Update HasActiveEffectsNotification to display enriched stacking metadata; create single-material enforcement setting.

**Rationale**: User-facing feedback for stacking results. Settings control for house-ruling material limits.

**Dependencies**: Track 6 (Override enrichment)

**Blocking**: None (standalone)

**Complexity**: Medium

**Tasks**:

1. **Update `HasActiveEffectsNotification.vue` tooltip**
   - Location: `src/vue/components/Effects/HasActiveEffectsNotification.vue` (or similar)
   - Tooltip now shows:
     - Effect name (existing)
     - Bonus type (new) — from override.bonusType
     - Stack result (new) — "Applied" or "Ignored"
     - Rejection reason (new) — from override.stackReason (if ignored)
   - Display ignored effects dimmed or with a "rejected" badge
   - ✅ **Verify**:
     - Tooltip shows localized bonusType label for enriched overrides
     - Empty/null bonusType is hidden
     - Ignored effects display rejection reason
     - Tooltip is readable and helpful

2. **Create `dnd35e.combat.enforceSingleMaterial` setting**
   - Location: `src/settings/` (settings registration file)
   - Boolean setting, default: `true`
   - Label: "DND35E.Setting.EnforceSingleMaterial"
   - Hint: "Prevent items from having multiple standard Material effects"
   - ✅ **Verify**: Setting appears in game settings menu, can be toggled

3. **Implement validation logic for single-material enforcement**
   - When: Adding Material AE to item with subtype 'standard'
   - If: Setting enabled AND item already has a standard Material AE
   - Then: Throw error, prevent add (validation system — see Phase 4 architecture)
   - Else: Allow
   - Broken and Masterwork always allowed (checked separately)
   - ✅ **Verify**:
     - Setting enabled → can't add second standard material (error)
     - Setting disabled → can add multiple, but warning logged
     - Broken/Masterwork always allowed
     - Setting toggle doesn't break stacking

4. **Verify Material AE sheet UI hiding for bonusType**
   - Material effect sheet should NOT expose `bonusType` field (locked, auto-set from subtype)
   - Other/General AE sheets SHOULD expose bonusType (so users can manually set it)
   - ✅ **Verify**: Material sheet test passes; Generic AE shows bonusType field

**Acceptance Criteria**:
- Users can see which effects are applied/ignored and why
- Single-material limit is configurable
- No breaking changes to Material AE creation workflow

---

### TRACK 8: Secret AE System Model [LEAD DEV]

**Goal**: Create SecretSystemModel and register the 'secret' effect type.

**Rationale**: Foundational for the Secret subsystem. Must exist before masking infrastructure (Track 9).

**Dependencies**: Track 4 (GeneralSystemModel pattern established)

**Blocking**: Track 9, Track 10, Track 11 (all Secret work depends on type existing)

**Complexity**: Small (follows GeneralSystemModel pattern)

**Tasks**:

1. **Create `SecretSystemModel` and `Secret` document class**
   - Location: `src/entities/activeEffects/secret/`
   - `SecretSystemModel.mts`: extends `Dnd35eActiveEffectSystemModel`, no additional schema fields (MVP)
   - `Secret.mts` document class: bare minimum
   - Type constant: `SECRET_EFFECT_TYPE = 'secret'` exported from `effectTypes.mts`
   - ✅ **Verify**: Class compiles, type constant correct

2. **Register SecretSystemModel in CONFIG**
   - Add to `CONFIG.ActiveEffect.dataModels`:
     ```typescript
     CONFIG.ActiveEffect.dataModels['secret'] = SecretSystemModel;
     ```
   - ✅ **Verify**: Secret AEs instantiate with SecretSystemModel

3. **Update `effectTypes.mts`**
   - Add `SECRET_EFFECT_TYPE = 'secret'`
   - Add `'secret'` to `EFFECT_TYPES` array
   - Add `'secret'` to `EffectType` union
   - ✅ **Verify**: Type exports correctly

4. **Filter 'secret' from AE creation dialog**
   - AE creation modal lists types: General, Material, etc., but NOT Secret
   - Secret AEs created only via dedicated "Add Secret" button (Track 11)
   - ✅ **Verify**: Secret type not in dialog; "Add Secret" button works

**Acceptance Criteria**:
- Secret type follows same pattern as General and Material
- Non-GMs cannot select secret type in UI
- API restrictions enforced at field level (Task Track 11)

---

### TRACK 9: MASK Change Mode [LEAD DEV]

**Goal**: Register MASK change mode; exclude MASK changes from stacking engine.

**Rationale**: MASK is the primitive for masking. It must be excluded from stacking so masks don't interfere with bonuses.

**Dependencies**: Track 4 (CONFIG registration pattern), Track 1 (stacking engine to exclude from)

**Blocking**: Track 10 (masks dictionary), Track 12 (Pinia store)

**Complexity**: Small

**Tasks**:

1. **Define MASK constant and register in CONFIG**
   - Location: `src/entities/activeEffects/` (change types constants file, or directly in registration)
   - Constant:
     ```typescript
     export const MASK_CHANGE_MODE = 'mask';
     ```
   - Register in `CONFIG.ActiveEffect.changeTypes`:
     ```typescript
     CONFIG.ActiveEffect.changeTypes['mask'] = {
       label: 'DND35E.ChangeMode.Mask',
       defaultPriority: 10,
       handler: null  // MASK changes are not applied via applyChange()
     };
     ```
   - ✅ **Verify**: Constant exports; registration doesn't error

2. **Exclude MASK changes from stacking engine**
   - In `ItemDnd35e.applyActiveEffects()` (or relevant AE application location):
     - Filter changes before calling `resolveActiveEffectChanges()`
     - Skip changes with `mode === 'mask'`
     - MASK changes are NOT passed to stacking resolution
     - ✅ **Verify**: MASK changes never entered stacking engine; they're preserved on the AE

3. **Verify MASK changes preserved on AE and readable at prep time**
   - MASK changes live on the AE in `system.changes[]` with `mode: 'mask'`
   - During `prepareDerivedData()`, document can read them to build masks dictionary
   - ✅ **Verify**: MASK changes readable from `effect.system.changes` filter

**Acceptance Criteria**:
- MASK changes exist but don't interfere with stacking
- MASK changes are readable by masks dictionary builder (Track 10)
- No handler needed yet (deferred to later phases)

---

### TRACK 10: Masks Dictionary & Pinia Integration [LEAD DEV]

**Goal**: Build `_masks` dictionary at document prep time from Secret AE changes; integrate Pinia store to return real or masked values based on view mode.

**Rationale**: Core masking infrastructure. Decides whether player sees real or fake values.

**Dependencies**: Track 8 (Secret type exists), Track 9 (MASK mode defined), Track 12 (RenderModeStore 3-state model)

**Blocking**: Track 11 (UI depends on masks working), Track 13 (Secrets List / visibility)

**Complexity**: Large (prep integration, store logic, view-mode awareness)

**Tasks**:

1. **Build `_masks` dictionary in document prep**
   - Location: `ItemDnd35e.prepareDerivedData()` or Identifiable mixin
   - Logic:
     ```typescript
     this._masks = {};
     const secrets = this.effects
       .filter(e => e.type === 'secret' && !e.disabled)
       .sort((a, b) => (b.system.changes[0]?.priority ?? 0) - (a.system.changes[0]?.priority ?? 0));
     for (const secret of secrets) {
       for (const change of secret.system.changes) {
         if (change.mode === 'mask' && !(change.key in this._masks)) {
           this._masks[change.key] = change.value;  // Highest priority wins per field
         }
       }
     }
     ```
   - ✅ **Verify**:
     - Empty if no active Secrets
     - Populated if Secrets exist
     - Priority correctly sorts Secrets (higher priority first)
     - Highest-priority mask wins per field

2. **Update Pinia store to read `_masks` and return view-aware values**
   - Location: Item sheet store (e.g., `useItemSheetStore()` or document getter)
   - Method: `getFieldValue(fieldPath: string)` or similar
   - Logic:
     ```typescript
     function getFieldValue(fieldPath: string): unknown {
       if (shouldShowMasks.value && fieldPath in item._masks) {
         return item._masks[fieldPath];  // Show masked value
       }
       return foundry.utils.getProperty(item, fieldPath);  // Show real value
     }
     ```
   - `shouldShowMasks` computed from:
     - If GM and in unidentified view mode: `true`
     - If player: depends on whether item has active Secrets
     - If GM in identified view: `false` (show real)
   - ✅ **Verify**:
     - GM in unidentified view sees masked values
     - GM in identified view sees real values
     - Player always sees masked (if Secrets active) or real (if no Secrets)

3. **Integrate with DocumentSheetStore**
  - Replace existing `getViewAwareFieldValue()` legacy wrapper logic
   - New version reads from store getter above
   - ✅ **Verify**: Form fields show correct values based on view mode

4. **Verify masks recalculate on every cycle**
   - When Secrets are added, removed, or toggled, `prepareDerivedData()` rebuilds `_masks`
   - No caching across cycles
   - ✅ **Verify**: Adding/removing Secret AE updates masks; values change appropriately

**Acceptance Criteria**:
- Masked values are served to UI correctly
- Real data never mutated
- View mode correctly gates visibility
- Performance acceptable (dict lookup at field read time)

---

### TRACK 11: Identification System: isIdentified & Reveal [LEAD DEV]

**Goal**: Derive `isIdentified` from absence of active Secrets; implement `revealAllSecrets()` method; replace "Identify" toggle with "Reveal All" button.

**Rationale**: Simplifies identification logic by deriving it from effects instead of storing a toggle. Reveal is just disabling all Secrets.

**Dependencies**: Track 8 (Secret type), Track 10 (masks dictionary)

**Blocking**: Track 12 (RenderModeStore depends on isIdentified), Track 13 (UI)

**Complexity**: Medium

**Tasks**:

1. **Make `isIdentified` a derived getter**
   - Location: `ItemDnd35e` or Identifiable mixin
   - Definition:
     ```typescript
     get isIdentified(): boolean {
       return !this.effects.some(e => e.type === 'secret' && !e.disabled);
     }
     ```
   - No persisted field (removes old `system.isIdentified` if present)
   - ✅ **Verify**: Returns `true` when no active Secrets, `false` when at least one Secret active

2. **Implement `revealAllSecrets()` method**
   - Location: `ItemDnd35e` or Identifiable mixin
   - Logic:
     ```typescript
     async revealAllSecrets(): Promise<void> {
       const secrets = this.effects.filter(e => e.type === 'secret' && !e.disabled);
       const updates = secrets.map(e => ({ _id: e.id, disabled: true }));
       await this.updateEmbeddedDocuments('ActiveEffect', updates);
     }
     ```
   - ✅ **Verify**: Disables all Secrets; `isIdentified` becomes `true`

3. **Update item sheet to call `revealAllSecrets()`**
   - Location: Item sheet component (`*.vue`)
   - Replace "Identify" toggle button with "Reveal All" button
   - Button calls `revealAllSecrets()` on click
   - Button visible only to GMs on identifiable items
   - ✅ **Verify**: Button visible, clicking reveals all Secrets, item becomes identified

4. **Emit `revealSecret` event on disabled Secret** (optional in Phase 2)
   - Status: Documented, registered in Phase 6 (not implemented Phase 2)
   - Placeholder: Add code comment marking where Phase 6 will emit event
   - ✅ **Verify**: Comment exists, reminds where to add

**Acceptance Criteria**:
- isIdentified correctly reflects current Secret state
- revealAllSecrets() works
- Identify UI replaced with Reveal All
- No persisted isIdentified field remains

---

### TRACK 12: AE Visibility & Secrets List UI [JR DEV]

**Goal**: Add `isHidden` field to AE schema; implement AE list filtering; create GM-only Secrets List; add per-AE toggle buttons.

**Rationale**: UI for managing what players see. Secrets always hidden; other AEs optionally hidden.

**Dependencies**: Track 8 (Secret type exists)

**Blocking**: None (standalone UI)

**Complexity**: Medium

**Tasks**:

1. **Add `isHidden` field to `ActiveEffectSystemModelBase` schema**
   - Location: `src/entities/activeEffects/BaseActiveEffect/data/ActiveEffectSystemModelBase.mts`
   - Field:
     ```typescript
     isHidden: new foundry.data.fields.BooleanField({
       required: true,
       initial: false
     })
     ```
   - Secret AEs override initial to `true`
   - ✅ **Verify**: Field on schema, defaults correctly

2. **Filter hidden AEs from standard AE list for non-GMs**
   - Location: AE list component (e.g., `ActiveEffectsList.vue`)
   - Logic: Show all AEs to GMs; non-GMs only see AEs where `!isHidden`
   - ✅ **Verify**: Non-GM users don't see hidden AEs

3. **Create GM-only Secrets List**
   - Location: Same sheet as standard AE list
   - Component:
     - Wrapped in `<GmOnly>` component (only GMs see it)
     - Displays Secret AEs (filter by type === 'secret')
     - Each Secret shows enable/disable toggle
     - "Reveal All" button at top (calls `revealAllSecrets()`)
   - ✅ **Verify**:
     - Only GMs see Secrets List
     - Players never see it
     - Toggle disables individual Secrets

4. **Add per-AE `isHidden` toggle in standard AE list**
   - Location: Standard AE list, next to each AE
   - Button (GM-only, `v-if="isGM"`): toggle `isHidden` on click
   - Visual: eye icon or similar
   - ✅ **Verify**:
     - GM sees toggle on every AE
     - Non-GM doesn't see toggle
     - Clicking toggle hides/shows AE

5. **Add "Add Secret" button (GM-only)**
   - Location: Item sheet header or AE panel
   - Wrapped in `<GmOnly>` component
   - Clicking opens Secret AE creation form (simplified)
   - ✅ **Verify**:
     - Only GMs see button
     - Clicking creates new Secret AE with `isHidden: true`

**Acceptance Criteria**:
- Hidden AEs truly hidden from non-GM users
- Secrets List is GM-only
- Toggles work correctly
- No visual glitches when toggling visibility

---

### TRACK 13: RenderModeStore 3-State Model [LEAD DEV]

**Goal**: Replace 2-axis (Edit/Play × Identified/Unidentified) with single 3-state enum (Edit/Play/True); update button-bar UI; remove FormGroup short-circuits.

**Rationale**: Cleaner architecture. Edit/Unidentified is an impossible state (you always edit real data). 3-state eliminates it.

**Dependencies**: Track 10 (masks dictionary), Track 11 (isIdentified derived), Track 12 (AE visibility)

**Blocking**: None (but affects all sheet rendering)

**Complexity**: Large (refactor across sheets, stores, components)

**Tasks**:

1. **Create 3-state `ViewMode` type in `RenderModeStore`**
  - Type: `ViewMode = 'edit' | 'play' | 'true'`
   - Replace state properties:
     - Old: `isEditViewMode: boolean`, `identifiedViewMode: 'identified' | 'unidentified'`
     - New: `viewMode: ViewMode` (single source of truth)
   - Add computed properties for backward compatibility:
     - `isEditMode = computed(() => viewMode === 'edit')`
     - `isPlayMode = computed(() => viewMode === 'play')`
     - `isTrueMode = computed(() => viewMode === 'true')`
   - ✅ **Verify**: Existing code that reads old properties still works via computed getters

2. **Update button-bar rendering (`renderViewModeBar()`)**
   - Replace: `renderEditModeButton()` + `renderIdentifiedViewButton()` (two methods)
   - With: Single `renderViewModeBar()` method
   - Logic:
     ```
     buttons = []
     if canEdit:   buttons.push({ mode: 'edit', icon: 'lock-open' })
     buttons.push(               { mode: 'play', icon: 'play' })
     if isGM && isIdentifiable:
       buttons.push(             { mode: 'true', icon: 'eye' })
     
     Render as horizontal bar:
     - Active button: full opacity
     - Inactive buttons: dimmed (reduced opacity)
     - Click → setViewMode(button.mode)
     ```
   - ✅ **Verify**:
     - Button bar renders correctly
     - Buttons have proper opacity based on active state
     - Clicking switches modes
     - Secret presence is refreshed from the live document while the sheet stays open (True button appears/disappears without reopening)

3. **Update `canEdit` logic — players always have Edit**
   - Non-GM owners always see the Edit button (Player Edit Secrets protect masked data)
   - O3 decision superseded: no longer hide Edit when Secrets active
   - ✅ **Verify**:
     - Non-GM sees Edit+Play always (with or without Secrets)
     - GM always sees all buttons (unless read-only)

4. **Remove FormGroup `isIdentifiedViewMode` short-circuits**
   - Location: All FormGroup component files
   - Old pattern (anti-pattern):
     ```typescript
     // Anti: FormGroup shouldn't decide whether to mask
     if (!isIdentifiedViewMode.value && sourceValue.unidentifiedValue) {
       return sourceValue.unidentifiedValue;
     }
     ```
   - New pattern: Store handles masking via `_masks`
   - FormGroup simply receives correct value from store
   - ✅ **Verify**:
     - All FormGroups use store-provided values
     - No view-mode logic in FormGroups
     - Masking works correctly at store level

5. **Initialize constructor params to compute viewMode**
   - Signature unchanged: `isIdentified`, `isIdentifiable`, `isEditMode` passed in
   - Constructor logic:
     ```typescript
     const initialViewMode = isEditMode 
       ? 'edit'
       : (!isIdentifiable || isIdentified) 
         ? 'identified'
         : 'unidentified';
     ```
   - ✅ **Verify**: Initial state computed correctly from caller params

6. **Document state transitions**
  - Edit → Play/True (exit edit mode)
  - Play ↔ True (GM only)
   - No Edit ↔ anything direct; must go via Play mode
   - ✅ **Verify**: State machine is documented

**Acceptance Criteria**:
- 3-state model is simpler and clearer
- Button bar UI is usable and visually consistent
- Non-GM players with owner permissions always have Edit button; Player Edit Secrets (Track 14) protect masked data
- All sheets work with new model
- No regressions in existing view-mode behavior

---

### TRACK 14: Player Edit Secrets [LEAD DEV]

**Goal**: Intercept non-GM writes to masked fields and route them into a system-managed Player Edit Secret AE, preserving the GM's real data.

**Rationale**: Replaces the O3 approach (hiding Edit button when Secrets active) with a more elegant solution. Players always have edit access, masked fields are silently protected, and the GM retains full control.

**Depends on**: Track 10 (masks dictionary), Track 13 (RenderModeStore — players always have Edit)

**Tasks**:

1. **Define Player Edit Secret constants**
   - `isPlayerEditSecret`: boolean field on `SecretSystemModel` schema (default `false`)
  - Priority: 3001 (above regular Secret priority of 10)
   - Localization keys: `dnd35e.EFFECT.Secret.PlayerOverride`
   - ✅ **Verify**: Constants exported and localization key in effects.json

2. **Implement `findOrCreatePlayerEditSecret(item)` helper**
   - Find existing Player Edit Secret AE on item (by `system.isPlayerEditSecret === true`)
   - If none, create one with correct type (`'secret'`), flag, priority, name ("Player Override"), icon (`icons/svg/pencil.svg`)
   - ✅ **Verify**: Creates or reuses single Player Edit Secret AE; correct priority, name, flag

3. **Implement `addOrUpdatePlayerEditMask(ae, fieldPath, value)` helper**
   - If AE already has a MASK change for this fieldPath: update its value
  - If not: add a new MASK change with priority 3001
   - ✅ **Verify**: Changes accumulate on single AE; updating same field overwrites value

4. **Wire interception into `viewModeAwareUpdateDocument()`**
   - For each field in update data:
     - If `!game.user.isGM && field in document._masks` → route to Player Edit Secret
     - Else → normal document write
   - Mixed updates: split into masked (→ AE route) and non-masked (→ document write)
   - Await both paths
   - ✅ **Verify**:
     - Player edits masked field → AE created, real data untouched
     - Player edits non-masked field → normal write
     - Mixed update → correctly split

5. **Verify `_buildMasks()` priority resolution**
  - Player Edit Secret at priority 3001 naturally wins over regular Secret at 10
   - After player edits a masked field, subsequent reads return player's value (not GM's mask)
   - ✅ **Verify**: Player override value shown in masked view; GM real values unaffected in identified view

6. **GM UI: distinguish Player Edit Secrets in Secrets list**
   - Pencil icon (`fa-solid fa-pencil`) instead of regular eye icon
   - "Player Override" label
   - Standard delete button works (GM can remove to reset overrides)
   - Enable/disable toggle works
   - ✅ **Verify**: Player Edit Secret visually distinct in GM's Secrets list

7. **`revealAllSecrets()` includes Player Edit Secrets**
   - Existing `revealAllSecrets()` disables all Secret AEs — Player Edit Secrets are Secrets, so they're included automatically
   - ✅ **Verify**: Reveal All disables Player Edit Secrets too

8. **Dual-stack exclusion**
   - Real stack: filter out Player Edit Secrets by `system.isPlayerEditSecret` field
   - Masked stack: Player Edit Secrets participate at highest priority
   - ✅ **Verify**: Real values unaffected; player view shows their edits

**Acceptance Criteria**:
- Non-GM player can edit items with active Secrets without destroying GM data
- Masked-field edits are intercepted and stored in Player Edit Secret AE
- Non-masked field edits go through normally
- GM sees Player Edit Secrets with distinct icon and label
- GM can delete Player Edit Secrets to reset player overrides
- _buildMasks() correctly resolves Player Edit at higher priority

---

### TRACK 15: Material Dev Testing Follow-Up [FLEXIBLE]

**Goal**: Run a deliberate dev-world validation pass on the Material workflow and close any Material-specific gaps while Phase 2 context is still fresh.

**Rationale**: The Material architecture is in place, but the phase still needs a practical verification pass in the real dev environment. This is where subtype UX, propagation behavior, and stacking presentation gaps are most likely to surface.

**Depends on**: Track 5, Track 6, Track 7

**Blocking**: Track 17 (secret image work stays deferred until this and Track 16 are complete)

**Tasks**:

1. **Exercise Material authoring in the dev world**
   - Create/edit Material AEs on real dev items
   - Switch `materialSubtype` values and verify propagation
   - ✅ **Verify**: Material AE editing works in normal sheet use, not just in isolated code paths

2. **Verify live item propagation and stacking UX**
   - Confirm item stats and sheet presentation update as expected
   - Check whether stacking feedback is understandable to a developer/GM using the UI
   - ✅ **Verify**: Material behavior is defensible from the live app, not only the implementation

3. **Capture and resolve Material-specific polish issues**
   - Fix or document any concrete Material workflow gaps found during dev testing
   - ✅ **Verify**: Remaining Material issues are either resolved or explicitly documented for later phases

**Acceptance Criteria**:
- Material workflow has been exercised in the dev world end-to-end
- Any remaining Material gaps are known, not accidental
- Phase 2 can treat Material as practically verified, not only architecturally implemented

---

### TRACK 16: General AE Cleanup [LEAD DEV]

**Goal**: Bring the `general` AE type onto the intended dnd35e sheet/tabs experience instead of leaving it on a default Foundry-like fallback path.

**Rationale**: General AE is the baseline effect authoring surface for future phases. If it still behaves like a default fallback, later phases inherit that friction.

**Depends on**: Track 4, Track 12, Track 13

**Blocking**: Track 17 (secret image work remains deferred until General AE is cleaned up)

**Tasks**:

1. **Audit the current General AE sheet path**
   - Confirm where it is still using default Foundry/Handlebars behavior or default tabs
   - ✅ **Verify**: The fallback behavior is identified concretely, not just suspected

2. **Move General AE onto the intended dnd35e sheet structure**
   - Align tabs/layout/authoring flow with the system's sheet patterns
   - ✅ **Verify**: General AE behaves like a first-class dnd35e effect type

3. **Re-check standard change authoring on General AE**
   - Confirm the shared change list, visibility controls, and related UX behave correctly there
   - ✅ **Verify**: General AE is a clean baseline for future non-secret effect work

**Acceptance Criteria**:
- General AE no longer feels like a default fallback surface
- Standard effect authoring works cleanly on the General AE sheet
- Later phases can treat General AE as the canonical baseline effect type

---

### TRACK 17: Deferred Follow-Up — Secret Images [LEAD DEV]

**Goal**: Revisit masked root-level image support after the Material dev-testing pass and General AE cleanup are complete.

**Rationale**: The remaining work is image-specific, not just another field mask. It involves top-level refresh behavior, Foundry's expected file/image field handling, and the image-picker authoring story.

**Depends on**: Track 15, Track 16

**Tasks**:

1. **Design masked `img` update flow**
  - Account for root-level refresh behavior similar to name
  - Account for Foundry's image/file field expectations
  - ✅ **Verify**: Chosen update path is concrete and defensible

2. **Resolve image-picker authoring story**
  - Determine how masked image values are stored and edited from the secret sheet
  - ✅ **Verify**: Secret image authoring UX is clear before implementation

3. **Implement secret image masking when ready**
  - Apply the same level of rigor used for special fields like name and price
  - ✅ **Verify**: Secret image support works in both sheets and directory/sidebar-style consumers

**Acceptance Criteria**:
- `img` secret work is explicitly queued after the two closeout tracks
- The problem is framed as image-specific authoring/storage/refresh work, not an undefined TODO
- Phase 2 documentation makes the ordering explicit

---

## Parallelization Map

```
PHASE 2 PARALLELIZATION STREAMS
═════════════════════════════════════════════════════════════════════

STREAM A: Material + Stacking Foundation
─────────────────────────────────────────
 WEEK 1-2
 ├─ TRACK 1: Stacking Engine [LEAD] ◄─┐
 ├─ TRACK 2: BonusType const [FLEX]   │ Independent parallel work
 ├─ TRACK 3: EffectChangeData [LEAD]  │
 └─ TRACK 4: AE Registration [LEAD] ◄─┘
                 │
                 ├─ Converges at: Track 5 (integration)
                 │
 WEEK 3-4
 └─ TRACK 5: Stacking Integration [LEAD]
                 │
 WEEK 4
 └─ TRACK 6: Material UI [JR/FLEX]


STREAM B: Secret AE Foundation
──────────────────────────────────
 WEEK 1-2
 TRACK 4: AE Registration [LEAD] ──────┐
          (creates pattern)             │
                                        ├─ Waits for pattern
 WEEK 2-3                               │
 TRACK 8: Secret Model [LEAD] ◄────────┘
                 │
                 ├─ TRACK 9: MASK mode [LEAD] ◄───┐ Independent
                 │                                 │ parallel work
                 ├─ TRACK 10: Masks dict [LEAD] ◄─┘
                 │
                 ├─ TRACK 11: isIdentified [LEAD]
                 │
 WEEK 3-4
 ├─ TRACK 12: AE Visibility/Secrets UI [JR]
 │
 ├─ TRACK 13: RenderModeStore 3-state [LEAD]
 │
 └─ TRACK 14: Player Edit Secrets [LEAD]
     (depends on Track 10 masks dict + Track 13 canEdit)


SYNC POINTS
──────────
 After TRACK 1+2+3: Both streams converge at TRACK 4
                    (pattern established, enables Secrets)

 After TRACK 5+6: Material subsystem ready for testing

 After TRACK 13+14: Both subsystems ready for Phase 5 actors


PARALLEL WORK ZONES
───────────────────
 ✓ TRACK 1 (stacking) ← independent of Material details
 ✓ TRACK 2 (BonusType) ← can happen as soon as TRACK 3 exists
 ✓ TRACK 5 (stacking integration) ← only needs TRACK 1
 ✓ TRACK 6 (Material UI) ← independent of Secrets (TRACK 8+)
 ✓ TRACK 9+10 (MASK + masks dict) ← parallel after TRACK 8
 ✓ TRACK 14 (Player Edit Secrets) ← after TRACK 10+13

 SEQUENTIAL (hard blocks)
 ✗ TRACK 4 must finish before TRACK 8 (pattern established)
 ✗ TRACK 8 must finish before TRACK 9+10 (type must exist)
 ✗ TRACK 10 must finish before TRACK 12+13 (infrastructure)
 ✗ TRACK 10+13 must finish before TRACK 14 (masks + canEdit)
```

---

## Skill Routing

| Track | Role | Justification |
|-------|------|---------------|
| **1: Stacking Engine** | Lead dev | Algorithmic core, interfaces, dual-stack pattern — needs deep system knowledge |
| **2: BonusType const** | Flexible (Jr/Lead) | Simple enum, can be done by anyone after Track 3 |
| **3: EffectChangeData** | Lead dev | Type system, schema parity — lead dev's expertise |
| **4: AE Registration** | Lead dev | CONFIG registration, proxy routing, architectural pattern — complex |
| **5: Stacking Integration** | Lead dev | Consumer of Track 1, refactors existing method, adds data structures |
| **6: Material UI** | Jr dev + Flexible | UI updates, settings, verification — straightforward |
| **7: Secret Model** | Lead dev | Creates new system model, registration — follows pattern but needs lead guidance |
| **8: MASK mode** | Lead dev | New change mode, registry entry, exclusion logic — lead responsibility |
| **9: Masks dict** | Lead dev | Core masking infrastructure, store integration — requires deep Pinia knowledge |
| **10: isIdentified & Reveal** | Lead dev | Derived getters, effects integration — lead dev responsibility |
| **11: AE Visibility UI** | Jr dev | UI components, toggles, filtering — Jr dev can handle |
| **12: RenderModeStore 3-state** | Lead dev | Large refactor across stores and components — leads refactors, jrs might help |
| **13: Player Edit Secrets** | Lead dev | Core interception logic, AE creation, dual-stack interaction — deep system knowledge required |

**Pairing Opportunities**:
- **Lead + Jr**: Track 6 (Material UI) — Jr dev builds UI components, lead dev reviews stacking logic integration
- **Lead + Jr**: Track 11 (AE Visibility) — Jr dev builds components, lead dev guides Secret AE interaction design
- **Jr + Jr**: Track 2 (BonusType) — parallel low-risk tasks
- **Flexible**: Track 2, part of Track 6 — good for newer contributors or when lead/jr availability shifts

---

## Resolved Design Decisions

### D1: Schema Walker — Default-Include with Opt-Out

**Decision**: The FormulaFamiliar schema walker includes **all fields by default**. Fields opt out with `familiar: { formulaVisible: false }`. This replaces the previous opt-in model where only fields with `isFamiliarField === true` or explicit `formulaVisible: true` were included.

**Rationale**: The walker captures the full data shape. Consumers (autocomplete, formula resolution, `getRollData()`) subscribe to what they need. This eliminates the need to register every new field for formula visibility — it's automatic.

**Implementation** (completed):
- `schemaWalker.mts`: `walkFields()` treats non-opted-out, non-SchemaField fields as simple leaves
- Two static markers recognized on field constructors:
  - `isFamiliarField = true` → compound leaf with `.value` access path
  - `isFamiliarLeaf = true` → opaque leaf, not recursed into (PriceField, FormulaField)
- Opt-out: `slug` field in `Dnd35eDocumentSystemModel` uses `familiar: { formulaVisible: false }`
- Fields that already opt out: `nameFormula`, `description` (via `withFamiliar(..., { formulaVisible: false })`)

**Opaque leaf fields** (handle their own inner structure):
- **PriceField** — renders via `PriceData.toString()`; inner stacks/srdEquivalent hidden from walker
- **FormulaField** — the formula string is an implementation detail; future phases surface `resolvedValue`

---

## Open Decisions

Questions that require hands-on exploration at phase start (not blockers, just "we'll know when we try it"):

### O1: Chat Card History Storage Format

**Question**: How should `stacking.history` be stored and serialized in chat messages for durability?

**Impact**: Phase 8 (Action System) will consume this history. Chat cards must re-render correctly after page refresh.

**Mitigation**: 
- Phase 2 establishes the interface and algorithm
- Phase 8 team decides: store in chat message `flags`, or reconstruct from action context?
- Decision doesn't block Phase 2 stacking implementation — interface is stable
- Default assumption: Store in `flags.dnd35e.stackingHistory` on the message

---

### O2: Mask Priority Ordering

**Question**: When multiple Secrets mask the same field, which priority system wins?

**Current spec**: Sorted descending by `change.priority` field on MASK changes.

**Exploration**:
- Phase 2 implements current spec (highest priority wins)
- Phase 5+ may discover edge cases (e.g., should master Secret AE have special priority?)
- Decision deferred; current impl is defensible

**Default assumption**: MASK changes sorted by priority field, highest first

---

### O3: Non-GM Player Edit Restriction with Active Secrets — **RESOLVED**

**Question**: When a non-GM player owns an item with active Secrets, should they lose the Edit button?

**Resolution**: **Superseded by Player Edit Secrets (§2.7.10, Track 14).** Players always have Edit access. Writes to masked fields are intercepted and routed to a system-managed Player Edit Secret AE. The GM's real data is never touched. This eliminates the UX concern of players noticing a missing Edit button.

**Previous spec**: Edit button hidden. **New spec**: Edit always shown; masked-field writes intercepted.

---

### O4: Broken Material as Penalty vs. Bonus Type

**Question**: Should Broken Material be bonusType: 'penalty' or bonusType: 'broken'?

**Current spec**: bonusType: 'broken' (named type, always stacks)

**Rationale**: Broken is semantically different from generic penalties (e.g., –2 Str modifier). Grouping it as 'broken' allows future filtering/tracking.

**Exploration**: None needed — spec is clear. Mentioned for completeness.

**Default assumption**: Use 'broken' type for broken materials

---

## Risk Assessment

```yaml
risk_1:
  name: "Stacking pre-filter must exclude MASK changes before processing"
  severity: "CRITICAL"
  impact: "If MASK changes enter the stacking engine, they could suppress legitimate bonuses. A mask value of +0 would override a bonus value of +20 if the mask is 'highest-wins' ranked."
  mitigation: "MASK changes filtered out in applyActiveEffects() BEFORE calling resolveActiveEffectChanges(). MASK is never in the stacking winners set."
  verification: "Unit test (Phase 4): MASK change present alongside ADD change for same field → ADD change wins, MASK excluded from stacking"
  assigned_to: "Track 9 (MASK mode task 2)"

risk_2:
  name: "Stacking must run BEFORE applyChange(), not after"
  severity: "CRITICAL"
  impact: "If two materials both ADD hardness, and stacking runs after Foundry applies both, the field ends up with both values summed. Stacking metadata can't fix incorrect final value."
  mitigation: "Filter winners before the applyChange() loop. Only winners are applied. Losers recorded in history but never touch the field."
  verification: "Integration test (Phase 4): two materials (+10, +20 hardness) → item has +20 hardness (not +30)"
  assigned_to: "Track 6 (integration task 1)"

risk_3:
  name: "Override enrichment adds fields that might break existing UI"
  severity: "MEDIUM"
  impact: "Optional bonusType/stackResult/stackReason fields. If UI iterates overrides and assumes only 4 fields, it could malfunction."
  mitigation: "Fields are optional. UI is updated in Track 7 (task 1) to handle them. Tested before phase completion."
  verification: "HasActiveEffectsNotification still renders correctly with enriched overrides"
  assigned_to: "Track 7 (task 1)"

risk_4:
  name: "CONFIG.ActiveEffect.baseTypeAllowed = false might break external modules"
  severity: "MEDIUM"
  impact: "Third-party modules that create base-type AEs will fail. Post-release migration needed."
  mitigation: "Phase 2 note: Set baseTypeAllowed = false for POC. Post-release (Phase 31), re-enable with transform logic to auto-upgrade base → general. Documented in code comment."
  verification: "Add TODO comment in registration marking post-release transformation plan"
  assigned_to: "Track 4 (task 6)"

risk_5:
  name: "Masks dictionary recalculation on every prep might hurt performance"
  severity: "LOW"
  impact: "If items have 10+ Secrets with 100+ MASK changes each, rebuilding _masks every cycle could slow down. Most items won't hit this."
  mitigation: "Iteration over effects is already O(n) during AE prep. _masks dict is flat dict lookup — fast. Profile if issues arise."
  verification: "No explicit test needed for Phase 2; Phase 5 performance test if actors use same pattern"
  assigned_to: "Track 10 (task 4 — verify step)"

risk_6:
  name: "isIdentified becomes read-only (no toggle field)"
  severity: "LOW"
  impact: "If there's code that writes to `system.isIdentified` as a field (not via revealAllSecrets), it will fail. Should be rare."
  mitigation: "Search codebase for `isIdentified` writes. Rewrite as Secret AE management. Document in migration notes."
  verification: "Grep codebase for isIdentified assignments; all converted to revealAllSecrets() or Secret creation"
  assigned_to: "Track 11 (task 1 — implementation)"

risk_7:
  name: "RenderModeStore refactor affects all sheets"
  severity: "MEDIUM"
  impact: "3-state model touches every sheet that renders a button bar. Regressions possible if not tested carefully."
  mitigation: "All FormGroup short-circuits removed in Track 13 (task 4). Backward-compat computed getters for old properties. Staged rollout per sheet type."
  verification: "Manual test: each sheet type (item, actor) button bar works; view modes switch correctly"
  assigned_to: "Track 13 (tasks 1-4)"

risk_8:
  name: "Bonus type collision: what if two phases want different stacking rules for same type?"
  severity: "LOW"
  impact: "E.g., Phase 10 wants dodge = always stack. Phase 15 wants dodge = highest-wins only for shields. Type collision."
  mitigation: "Bonus types are global enums. If collision happens, rename one (e.g., shieldDodge). Document the principle: bonus types are immutable once introduced. New behaviors need new types."
  verification: "Comment in BonusType union explaining immutability and collision avoidance"
  assigned_to: "Track 2 (task 2 — documentation)"
```

---

## Complexity Estimates

**No timelines, just relative size and confidence:**

| Track | Complexity | Confidence | Notes |
|-------|-----------|------------|-------|
| **1: Stacking Engine** | **LARGE** | High | Algorithmic core, interfaces, history tracking. Well-spec'd. Lead dev writes this. ~2-3 weeks solo. |
| **2: BonusType const** | **SMALL** | Very High | Enum file. ~2 hours. |
| **3: EffectChangeData** | **SMALL** | Very High | Interface + schema update. ~4 hours. |
| **4: AE Registration** | **LARGE** | High | CONFIG setup, proxy routing, pattern establishment. ~1-2 weeks. Many files, careful review needed. |
| **5: Stacking Integration** | **LARGE** | Medium | Integrating algorithm into applyActiveEffects(). Override enrichment adds complexity. ~1-2 weeks. |
| **6: Material UI** | **MEDIUM** | High | Updates to existing components. Settings addition. ~1 week. |
| **7: Secret Model** | **SMALL** | High | Follows Track 4 pattern. ~4 hours. |
| **8: MASK mode** | **SMALL** | High | Registry entry + exclusion logic. ~4 hours. |
| **9: Masks dict** | **LARGE** | Medium | Prep integration + Pinia store logic. View-aware masking is subtle. ~1-2 weeks. |
| **10: isIdentified & Reveal** | **MEDIUM** | High | Derived getter, method, UI update. ~3-4 days. |
| **11: AE Visibility UI** | **MEDIUM** | Medium | New component (Secrets List), filtering logic, toggles. ~1 week. |
| **12: RenderModeStore 3-state** | **LARGE** | Medium | Refactor across stores/components. Remove short-circuits. Button bar UI. ~1-2 weeks. Large surface area. |

**Total Phase 2 Complexity**: 
- Lead dev: ~7-9 weeks (Tracks 1, 4, 5, 9, 10, 12) — can parallelize 1+4, 9+10
- Jr dev: ~3-4 weeks (Tracks 2, 6, 7, 11) — runs concurrent with lead work
- **Concurrent delivery**: ~4-5 weeks wall-clock (parallelization helps)

---

## Success Criteria

### By Phase End

**Material AE Subsystem**:
- ✅ Material AE generates changes with correct bonusType (standard/broken/masterwork)
- ✅ Multiple materials on same item resolve correctly (highest-wins per field, not sum)
- ✅ Single-material enforcement works (when enabled)
- ✅ HasActiveEffectsNotification shows stacking result (applied/ignored + reason)
- ✅ bonusType hidden from Material UI; visible on generic AE UI
- ✅ Override enrichment includes bonusType/stackResult/stackReason

**Secret AE Subsystem**:
- ✅ Secret AE type exists, registers correctly
- ✅ MASK changes excluded from stacking
- ✅ _masks dictionary built at prep time, excludes disabled Secrets
- ✅ Pinia store returns masked/real values based on identifiedViewMode
- ✅ isIdentified derived (no persisted toggle)
- ✅ revealAllSecrets() works; "Reveal All" button replaces "Identify"
- ✅ Secrets List visible to GMs only, per-Secret toggles work
- ✅ "Add Secret" button (GM-only) creates Secret AEs
- ✅ Non-GM + active Secrets: Edit button hidden (player locked to masked view)
- ✅ RenderModeStore 3-state works: Edit/Play/True
- ✅ Button bar renders correctly, modes switch correctly

**Architecture**:
- ✅ Stacking algorithm is generic (reusable in Phase 5 for actors)
- ✅ No wrapper-based `unidentifiedValue` storage needed; masks replace it
- ✅ CONFIG setup pattern established for future effect types
- ✅ Both subsystems tested manually (Phase 4 will add unit/integration tests)

---

## Integration with Phase 5

**Phase 5 (Actor Foundation)** reuses Phase 2 infrastructure:

1. **`resolveActiveEffectChanges()`** — imported, called during actor `applyActiveEffects()`
2. **`_masks` dictionary** — actors build their own from embedded Secret AEs
3. **Stacking metadata** — enriched into actor `overrides` like items
4. **RenderModeStore** — shared across item and actor sheets
5. **Bonus type system** — extended with actor-specific types (armor, shield, natural, etc.)

No Phase 2 code needs rewriting. Phase 5 adds actor-specific integration.

---

## Files Modified / Created

| Action | Path | Owner |
|--------|------|-------|
| **Create** | `src/helpers/stacking.mts` | Track 1 |
| **Create** | `src/constants/bonusTypes.mts` | Track 2 |
| **Modify** | `src/entities/activeEffects/BaseActiveEffect/data/ActiveEffectSystemData.mts` | Track 3 |
| **Modify** | `src/entities/activeEffects/BaseActiveEffect/data/ActiveEffectSystemModelBase.mts` | Track 3, Track 11 |
| **Modify** | `src/entities/activeEffects/BaseActiveEffect/resolveChangeValue.mts` | Track 3 / Track 6 boundary normalization pass |
| **Create** | `src/entities/activeEffects/general/` | Track 4 |
| **Modify** | `src/entities/activeEffects/effectTypes.mts` | Track 4 |
| **Modify** | `src/entities/activeEffects/BaseActiveEffect/DnD35eActiveEffect.mts` | Track 4 |
| **Create** | `src/entities/activeEffects/registration.mts` (or extend existing) | Track 4, Track 8 |
| **Modify** | `src/entities/items/baseItem/ItemDnd35e.mts` | Track 5 |
| **Modify** | `src/vue/components/Fields/FormGroups/HasActiveEffectsNotification.vue` | Track 7 |
| **Modify** | `src/entities/components/CoreMixin/sheet/stores/RenderModeStore.mts` | Track 13 |
| **Modify** | `src/vue/apps/VueDocumentSheetMixin.mts` | Track 13 |
| **Modify** | `src/entities/activeEffects/secret/data/SecretSystemData.mts` | Data-layer import boundary cleanup |
| **Modify** | Item sheet components (vue) | Track 6, Track 10, Track 11, Track 12 |
| **Modify** | `src/settings/` — settings registration | Track 6 |
| **Modify** | `src/vue/components/Effects/HasActiveEffectsNotification.vue` | Track 6 |
| **Create** | `src/entities/activeEffects/secret/` | Track 8 |
| **Modify** | `src/constants/config/system.mts` | Track 4 |
| **Modify** | `src/stores/DocumentSheetStore.mts` or item store | Track 10, Track 12 |
| **Create/Modify** | `src/stores/RenderModeStore.mts` | Track 13 |
| **Create** | AE visibility components (Secrets List, etc.) | Track 11, Track 12 |

---

## Documentation Deliverables

By Phase End:

1. **Stacking Algorithm Documentation** (Track 1)
   - How bonus type resolution works
   - Dual-stack pattern for masked effects
   - Chat card integration plan (Phase 8)

2. **Material Pattern Explainer** (Track 5)
   - AE → buildChanges() → applyActiveEffects() → enriched overrides
   - Why Material AE bonus types are locked from UI
   - Reuse in Phase 5

3. **Secret AE Design Document** (Tracks 8-13)
   - How masking works
   - _masks dictionary and Pinia store integration
   - View mode states and transitions
   - GM-only Secrets List UI

4. **CONFIG Registration Pattern Guide** (Track 4)
   - How to register new effect types
   - GeneralSystemModel as the pattern
   - Future type registration (Phase 5+)

5. **Code Comments & TODOs**
   - Phase 5 extraction plan for applyStackedChanges() helper
   - Phase 8 chat card history integration
   - Phase 31 baseTypeAllowed re-enable plan

---

## Review Checkpoints

Suggested review gates:

1. **After Track 4**: CONFIG registration pattern approved. GeneralSystemModel ready.
2. **After Track 5**: Stacking integration + Material integration approved. Override enrichment working.
3. **After Track 10**: Masks dictionary + Pinia store working. isIdentified derived correctly.
4. **After Track 13**: RenderModeStore refactor complete. All sheets tested.

---

## Phase 2 → Phase 5 Handoff

At Phase 2 completion, document:

- ✅ Stacking algorithm (ready to reuse)
- ✅ Bonus type system (ready to extend)
- ✅ _masks / Pinia integration pattern (ready to replicate for actors)
- ✅ Override enrichment (ready to replicate for actor overrides)
- ⚠️ TODO: Extract `applyStackedChanges()` helper for actor reuse
- ⚠️ TODO: Decide actor-side masking (actors don't have embedded Secrets yet — Phase 28)

**Phase 5 Scope**: Actor DataModel, ActorDnd35e, actor sheet, actor-side stacking.
**Phase 28 Scope**: Actor-embedded Secrets (if needed), player-scoped identification.
