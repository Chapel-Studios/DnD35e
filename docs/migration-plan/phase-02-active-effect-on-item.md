# Phase 2: Active Effect on Item (Material)

**Status**: ✅ Approved

> **Milestone**: POC  
> **Dependencies**: Phase 1  
> **Goal**: A Material active effect that lives on a weapon and modifies the weapon's data. Establishes the "Material pattern" (items/effects generate AE changes dynamically in `prepareDerivedData()`), the **bonus type stacking engine** (per-field highest-wins resolution), and the `materialSubtype` field that distinguishes standard materials from broken and masterwork effects. Broken and masterwork AE **content and sync logic** are deferred to Phase 5 (Compendium Foundation) because they pull defaults from compendium packs.

**For execution planning**, see [Phase 2 Task Decomposition](phase-02-task-decomposition.md) — documents the 12-track breakdown with parallelization analysis and skill routing.

---

## Completion Checklist

### ✅ Complete
- [x] Material AE creates system changes via `buildChanges()` targeting parent weapon
- [x] Multi-phase effect application (core/initial/final/action.*) infrastructure
- [x] `ActiveEffectProxyDnd35e` dispatches by effect type
- [x] Effect type registry with `'material'` type
- [x] Replace `'base'` type with `'general'` type backed by `GeneralSystemModel`
- [x] `isMasterwork` flag exists on WeaponSystemModel
- [x] `isBroken` field referenced in PropertyMap
- [x] **Foundry v14 CONFIG Setup**:
  - [x] Set `CONFIG.ActiveEffect.legacyTransferral = false` in `init` hook
  - [x] Set `CONFIG.ActiveEffect.baseTypeAllowed = false` in `init` hook
  - [x] Register `GeneralSystemModel` in `CONFIG.ActiveEffect.dataModels` as `'general'` type
  - [x] Update `ActiveEffectProxyDnd35e` — route `'general'` through `DnD35eActiveEffect`
  - [x] Update `effectTypes.mts` — `GENERAL_EFFECT_TYPE = 'general'` in `EFFECT_TYPES` and `EffectType` union
  - [x] Register custom AE phases: `CONFIG.ActiveEffect.phases.core`
  - [x] Register custom change type: `CONFIG.ActiveEffect.changeTypes.familiar` (handler deferred to Phase 7)
  - [x] Relocate `CONFIG.dnd35e` to dedicated config module (`src/constants/config/`)
- [x] **Dnd35eEffectChangeData Interface Update**:
  - [x] Add `bonusType?: BonusType` to `Dnd35eEffectChangeData` interface
  - [x] Add `condition?: string` to `Dnd35eEffectChangeData` interface
  - [x] Add `bonusType` to `ActiveEffectSystemModelBase` change schema
  - [x] Verify `phase` exists in both schema and TypeScript interface
- [x] **Bonus Type Stacking Engine**:
  - [x] Create `src/helpers/stacking.mts` with `resolveActiveEffectChanges()` function
  - [x] Implement interfaces: `ResolvedChanges`, `ChangeHistory`, `ChangeApplication`, `ChangeIgnored`
  - [x] Implement stacking rules: untyped always stacks, dodge always stacks, named types highest-wins, penalties always apply
  - [x] Write history tracking logic that captures applied/ignored bonuses with reasons
  - [x] Export `BonusType` with initial types: 'material' | 'broken' | 'masterwork'
- [x] **Material Subtype Field**:
  - [x] Add `materialSubtype: 'standard' | 'broken' | 'masterwork'` to MaterialSystemModel schema
  - [x] Map each subtype to correct bonus type when generating changes
  - [x] Ensure `buildChanges()` includes source labels for history
  - [x] Verify subtype selection in UI doesn't expose bonus type
- [x] **ItemDnd35e.applyActiveEffects() Integration**:
  - [x] Before applying changes, run `resolveActiveEffectChanges()` to filter winners/losers
  - [x] Only pass winning changes to Foundry's `ActiveEffect.applyChange()`
  - [x] Derive `source` label per change from parent effect
  - [x] Enrich `this.overrides` entries with stacking metadata (bonusType, stackResult, stackReason)
  - [x] Verify overrides repopulate correctly every preparation cycle
- [x] **System Setting for Single-Material Enforcement**:
  - [x] Create `dnd35e.combat.enforceSingleMaterial` boolean setting
  - [x] Implement validation warning when adding second standard Material AE
  - [x] Verify setting can be toggled without breaking stacking resolution
- [x] **Material AE Sheet Validation**:
  - [x] Verify effect sheet UI does NOT expose `bonusType` field for Material AEs
  - ~~Ensure `materialSubtype` selector is visible and functional~~ — **deferred to Phase 5**
  - ~~Test Material AE creation workflow end-to-end~~ — **deferred to Phase 5**
  - ~~Verify Material AE updates propagate immediately to weapon stats~~ — **deferred to Phase 5**
- [x] **Override Enrichment (Stacking Metadata)**:
  - [x] Extend `Override` type with optional `bonusType`, `stackResult`, `stackReason` fields
  - [x] After stacking resolution, enrich `this.overrides` entries with stacking metadata
  - [x] Update `HasActiveEffectsNotification.vue` to display enriched stacking info in tooltip (TODO: view-mode filtering)
  - [x] Verify overrides are cleared and repopulated every preparation cycle
- [x] **Test Coverage** — **deferred to Phase 4/5**:
  - ~~Unit tests for `resolveActiveEffectChanges()`~~ — **deferred to Phase 4**
  - ~~Unit tests: stacking rules~~ — **deferred to Phase 4**
  - ~~Integration tests for material stacking~~ — **deferred to Phase 5**
  - ~~Integration test: History tracking~~ — **deferred to Phase 5**
- [x] **Secret AE Type Registration (§2.7)**:
  - [x] Create `src/entities/activeEffects/secret/` directory with `SecretSystemModel`, document class, type constant `'secret'`
  - [x] Register `SecretSystemModel` in `CONFIG.ActiveEffect.dataModels` as `'secret'`
  - [x] Add `'secret'` to `EFFECT_TYPES` union and `effectTypes.mts`
  - [x] Register MASK change mode in `CONFIG.ActiveEffect.changeTypes`
  - [x] Filter `'secret'` from AE creation modal type selector
  - [x] All AE types registered in `system.json.template` (`general`, `material`, `secret`)
- [x] **MASK Change Mode (§2.7.3)**:
  - [x] Define `MASK` constant in change mode constants (`DND35E_CHANGE_TYPE.MASK`)
  - [x] Exclude MASK changes from `applyActiveEffects()` processing
  - [x] Verify MASK changes are preserved on the AE and accessible at document prep time
- [x] **Masks Dictionary (§2.7.4)**:
  - [x] Build `_masks` dictionary during `prepareDerivedData()` from active Secret AE changes
  - [x] Pinia store reads `_masks` and returns real or masked value based on `identifiedViewMode`
  - [x] Verify masks recalculate correctly every preparation cycle
- [x] **isIdentified Derivation (§2.7.4)**:
  - [x] `isIdentified` derived from active Secrets in Identifiable mixin (`_deriveIdentifiableState()`)
  - [x] `revealAllSecrets()` implemented — disables all Secret AEs
  - [x] Existing `isIdentified` consumers work with derived value
- [x] **Identify UI (§2.7.8)**:
  - [x] `IsIdentifiedToggle` component with "Reveal All" functionality
  - [x] "Reveal All" disables all Secret AEs on the item
  - [x] GM can also disable individual Secrets for partial reveals

### 🔶 In Progress (Remaining for Phase 2 Completion)

- [x] **AE Visibility & Secrets List (§2.7.6)** — Track 12:
  - [x] Add `isHidden: boolean` to `ActiveEffectSystemModelBase` schema (default: `false`)
  - [x] Secret AEs force `isHidden: true` in `prepareBaseData()`
  - [x] AE list components filter hidden AEs for non-GM users
  - [x] Secrets displayed in a **separate GM-only list** (wrapped in `DmControl`) on item sheets
  - [x] Per-Secret enable/disable toggle in the Secrets list
  - [x] Per-AE `isHidden` toggle button in the standard AE list (GM-only)
  - [x] "Add Secret" button on item sheet (GM-only)
  - [x] Effect list bucketing: type-based sections (Material, Secret) with fallback general list for everything else

- [x] **RenderModeStore Update — 3-State Model (§2.7.7)** — Track 13:
  - [x] Replace 2-axis model with 3-state `ViewMode`: `'edit' | 'identified' | 'unidentified'`
  - [x] Button-bar UI: all mode buttons in horizontal bar at sheet header; active = full opacity, inactive = dimmed
  - [x] GM sees: Edit + Play + Unidentified (identifiable) or Edit + Play (non-identifiable)
  - [x] Player sees: Edit + Play (always — Player Edit Secrets protect masked data)
  - [x] "Unidentified" button hidden from non-GM users entirely
  - [x] Replace `renderEditModeButton()` + `renderIdentifiedViewButton()` with single `renderViewModeBar()`
  - [x] `DocumentSheetStore.getViewAwareFieldValue()` reads `_masks` dictionary instead of `Dnd35eField.getEffective()`
  - [x] Remove `isIdentifiedViewMode` short-circuit from all FormGroup components (store handles it)

- [ ] **Player Edit Secrets (§2.7.10)** — Track 14:
  - [ ] Define constants: `isPlayerEditSecret` boolean field on SecretSystemModel (read-only in UI), player edit priority (3001), localization keys
  - [ ] Implement `findOrCreatePlayerEditSecret(item)` helper — finds existing by flag or creates new; default name "Player Edit" (localized)
  - [ ] Implement `addOrUpdatePlayerEditMask(ae, fieldPath, value)` helper — adds/updates MASK change on AE
  - [ ] Wire interception into `viewModeAwareUpdateDocument()` — non-GM + field in `_masks` → route to Player Edit Secret; split mixed updates
  - [ ] Verify `_buildMasks()` resolves Player Edit Secret at higher priority (3001 > 10)
  - [ ] GM UI: Player Edit Secrets appear in normal Secrets list, sorted to top, with pencil icon indicator
  - [ ] `isPlayerEditSecret` displayed as read-only boolean on Secret AE sheet (non-editable)
  - [ ] GM can edit Player Edit Secret mask values like any normal Secret
  - [ ] GM can delete Player Edit Secret to reset player overrides
  - [ ] `revealAllSecrets()` also disables Player Edit Secrets
  - [ ] Player Edit Secrets excluded from real stack (filtered by `system.isPlayerEditSecret` field)

- [ ] **Material Dev Testing Follow-Up**:
  - [ ] Run a dedicated dev-world verification pass on Material AE authoring and propagation
  - [ ] Verify subtype switching, stacking presentation, and live item updates in practical use
  - [ ] Capture and resolve any Material-specific UX gaps found during that pass before calling Phase 2 closed

- [ ] **General AE Cleanup Follow-Up**:
  - [ ] Move General AE off the default Foundry-style fallback workflow and onto the intended dnd35e sheet/tabs flow
  - [ ] Verify General AE is the clean baseline for standard change editing and future effect work

- [ ] **Secret Images — Deferred Until After Phase 2 Follow-Ups**:
  - [ ] Revisit masked `img` support after Material dev testing and General AE cleanup are complete
  - [ ] Design the image-picker, root-field refresh, and Foundry file-field handling story before implementing secret images

- [ ] **Documentation & Code Comments**:
  - [ ] Document Material pattern (AE → buildChanges() → applyActiveEffects() → history)
  - [ ] Explain bonus type system
  - [ ] Document that Phase 5 will reuse this exact stacking engine for actors

- [ ] **Secret AE Tests (§2.7)** — **deferred to Phase 4** (testing infrastructure):
  - ~~Secret AE masks a field → masked value returned by store, real data unchanged~~
  - ~~Disable Secret → store returns real value~~
  - ~~Multiple Secrets with priority → highest priority mask wins per field~~
  - [ ] ~~`isIdentified` derived: no Secrets = true, active Secret = false~~
  - [ ] ~~MASK changes excluded from stacking engine~~
  - [ ] ~~Compendium item with embedded Secret transfers correctly~~
  - [ ] ~~GM eye toggle switches between real and masked values in store~~
  - [ ] ~~Player always sees masked values regardless of view mode~~

---

## 2.1 The Material Pattern

This is the foundational pattern used by all "modifier" types throughout the system:

1. An Active Effect lives on a parent document (item or actor)
2. In its `prepareDerivedData()`, it reads its own system data (e.g., material properties)
3. It calls `buildChanges()` to generate `system.changes[]` — an array of `Dnd35eEffectChangeData` entries
4. The parent document's `applyActiveEffects()` runs stacking resolution, then applies only the winning changes
5. **Source of truth stays on the effect** — the changes are regenerated every preparation cycle

> **v14 Note**: Foundry v14 moved `changes` from the top-level effect document into `system`. Our `ActiveEffectSystemModelBase` already defines `changes` in its schema, and both `applyActiveEffects()` methods correctly iterate `effect.system.changes`. No reconciliation is needed — `system.changes` IS the canonical location.

```typescript
// In MaterialSystemModel.buildChanges()
// Generates isSystem: true changes from material stat fields:
//   price       → system.price        (add, target: item)
//   magicEquiv  → system.magicEquiv   (upgrade, target: item)
//   hardness    → system.hardness     (add, target: item)
//   bonusHp     → system.hp.max       (add, target: item)
//   drTypes     → system.damageReductionTypes (add, target: item)
// User-added changes (isSystem: false) are preserved alongside system changes.
```

## 2.2 Phase Application

The system registers custom AE phases beyond Foundry's built-in `initial`/`final`. See [AE Architecture PropertyMap](../architecture/property-maps/PropertyMap-ActiveEffectSystem.md) for the full phase model.

**Prep-cycle phases** (run every data preparation):
- **`core`** (custom, during `prepareEmbeddedDocuments`): Character identity — racial mods, BAB, base saves, HD, size, speed
- **`initial`** (Foundry built-in, after `_computeCoreStats()`): Equipment, feats, buffs, conditions — changes that need core stats resolved
- **`final`** (Foundry built-in, after `prepareDerivedData()`): Late-binding overrides

**Action phases** (on-demand, NOT during prep):
- **`action.attack`**, **`action.save`**, **`action.check`**: Collected by the action system when needed, with formula-familiar conditions

For Material AEs (Phase 2 scope), changes use `core` or `initial` phases only. Each change specifies which phase it runs in and whether it targets the parent Item or the owning Actor.

## 2.3 Effect Change Data

```typescript
interface Dnd35eEffectChangeData extends foundry.EffectChangeData {
  target: 'Actor' | 'Item';
  isSystem: boolean;        // Generated by system code vs user-configured
  bonusType?: BonusType;    // Stacking resolution — see §2.5
  condition?: string;       // Formula familiar → boolean (action phases only, Phase 8)
}
```

> **Note**: `phase` is already provided by Foundry v14's base `EffectChangeData` (`'initial' | 'final'`). Custom phases like `core` and `action.*` are registered via `CONFIG.ActiveEffect.phases` and extend the valid set.

## 2.4 Multiple Materials & Stacking Behavior

A weapon can have multiple standard Material AEs. Effects from different materials **do not stack per field** — the stacking engine (§2.5) resolves conflicts by taking the highest value per field across all materials.

**Example**: Material A (+100 max HP, +10 hardness) + Material B (+85 max HP, +20 hardness) → the weapon gets +100 max HP and +20 hardness. Each field independently picks the best value.

All standard Material AE changes use `bonusType: 'material'`. The stacking engine groups changes by `{ targetField, bonusType }` and applies highest-wins for the `'material'` type — this is generic stacking behavior, not material-specific code.

### Single-Material Enforcement (System Setting)

A system setting (`game.settings: dnd35e.combat.enforceSingleMaterial`) controls whether items are limited to one standard Material AE (subtypes `'broken'` and `'masterwork'` are always allowed regardless):
- **Enabled (default)**: Adding a second standard Material AE is **blocked** — the system throws an error and does not add it. This is part of the broader validation system (see leveling/validation architecture).
- **Disabled**: Multiple standard materials are allowed, but the system **flags it as not-RAW** via a warning. Stacking resolution handles the per-field highest-wins automatically.

When enabled, this is a hard constraint. When disabled, the stacking engine still resolves correctly — the warning is informational, not blocking.

## 2.5 Bonus Type Stacking Engine

The stacking engine is the core resolution system for all AE changes across the entire system. Bonus type is **normally exposed in the AE change UI** — users can see and set it on standard changes. It is only **hidden and auto-set** when the effect type locks it out, such as Material AEs where mechanical "fake" bonus types (`'material'`, `'broken'`, `'masterwork'`) handle stacking behavior behind the scenes.

During `applyActiveEffects()`, after collecting all changes for a target:
1. Group changes by `{ targetField, bonusType }`
2. **Untyped** (`bonusType: undefined` or `'untyped'`): always stack (sum all values)
3. **Dodge**: always stacks (sum all values)
4. **All other named types**: only apply the highest value per type per field
5. **Penalties**: always apply (always stack)
6. Sum the winning values across all bonus types for each target field

**Example**: A weapon with standard Material (+10 hardness, `bonusType: 'material'`), Broken (-2 attack, `bonusType: 'broken'`), and Masterwork (+1 attack, `bonusType: 'masterwork'`) all apply because they have different bonus types. If two standard Materials both specified hardness, only the highest wins.

**User perspective**: Users see "add a Material effect" or "check masterwork" in the UI. They never see or think about bonus types. The system automatically tags each change with the correct bonus type.

Bonus type assignments (all hidden from UI for Material AEs):
- Material AEs (subtype `standard`): `bonusType: 'material'`
- Material AEs (subtype `broken`): `bonusType: 'broken'`
- Material AEs (subtype `masterwork`): `bonusType: 'masterwork'`

Bonus type for other AE types is handled per-phase as those types are designed.

Start with only the bonus types that have a consumer in this phase:

```typescript
type BonusType = 'material' | 'broken' | 'masterwork';
// Add new types only when a phase introduces a consumer:
// Phase 10 (Feats): 'dodge' | 'untyped'
// Phase 15 (Equipment): 'armor' | 'shield' | 'natural' | 'deflection' | 'enhancement'
// etc.
```

**Principle**: Only add a bonus type when there's an implementation that uses it. No speculative types.

**Scope**: The stacking engine only processes **numeric ADD changes** with a `bonusType`. Non-numeric changes (e.g., `damageReductionTypes` string arrays) and changes without `bonusType` bypass stacking entirely and are passed directly to `applyChange()` as winners. Revisit when a non-numeric stacking use case emerges.

### 2.5.1 Stacking Algorithm Implementation with History Tracking

The `resolveActiveEffectChanges()` function resolves bonuses and **tracks detailed history** of what was applied, what was ignored, and why. This history serves two consumers:

1. **Item/Actor `overrides`** — enriched with stacking detail so field controls can show *why* a field has its current value (which effects contributed, which were rejected). The existing `Override` type on `ItemDnd35e` is extended to include stacking metadata.
2. **Chat cards** — when an action is executed (Phase 8), the stacking resolution for that specific calculation is passed to the chat card builder. Foundry preserves chat cards, so history is durable without persisting it on the document.

**No separate `_stackingHistory` property.** The existing `overrides` property on `ItemDnd35e` (and later `ActorDnd35e`) is the single source of truth for "what effects are currently modifying this field." We enrich it, not duplicate it.

### 2.5.2 Dual-Stack Resolution (Real vs. Player-Perceived)

When an item has **masked effects** (e.g., a hidden +2 enhancement the player doesn't know about), the stacking engine must run **twice** to produce two independent resolutions:

1. **Real stack** — includes ALL bonuses (visible + hidden). Used for the **actual die roll** that determines mechanical outcomes.
2. **Masked stack** — includes only bonuses the player **knows about**. Used for the **chat card display** shown to non-GM players.

This is not just cosmetic filtering — the two stacks can produce **different winners** in highest-wins resolution:

**Example**: Sword with hidden +2 enhancement. Player casts Magic Weapon (+1 enhancement).

| | Real Stack | Player-Perceived Stack |
|---|---|---|
| Hidden +2 enhancement | **+2 (applied)** | *(invisible — not in this stack)* |
| Magic Weapon +1 enhancement | +1 (suppressed — same type, lower) | **+1 (applied — only enhancement source)** |
| **Enhancement total** | +2 | +1 |

The player sees "+1 enhancement from Magic Weapon" in their chat card. The actual roll uses +2. The player's character doesn't understand why they hit more often.

**Implementation**: The `resolveActiveEffectChanges()` function accepts an optional `excludeEffectIds` set. The ExecutionEngine calls it twice when masked effects exist:

```typescript
// Real resolution — all effects, used for the actual roll
const realResult = resolveActiveEffectChanges(allChanges, allPenalties);

// Masked resolution — excluding hidden effects, used for player chat card
const maskedChanges = allChanges.filter(c => !hiddenEffectIds.has(c.effectId));
const maskedPenalties = allPenalties.filter(p => !hiddenEffectIds.has(p.effectId));
const maskedResult = resolveActiveEffectChanges(maskedChanges, maskedPenalties);
```

**What "hidden" means**: An effect is hidden from the player when its source item `isIdentifiable && !isIdentified`. The set of hidden effect IDs is derived from the item's identification state — not from individual change rows.

**Chat card rendering**:
- **Player view**: Shows `maskedResult.history` — they see only the bonuses they know about, with correct stacking among those bonuses.
- **GM view**: Shows `realResult.history` — full transparency, plus indicators marking which bonuses are hidden from the player.
- **Die result**: Always uses `realResult.values` — the actual mechanical outcome. The die total reflects reality.
- **The gap is intentional**: When the player's perceived total doesn't match the die result, that's working as designed. The character genuinely doesn't know why the sword seems to perform better than expected.

**Where this gets stored**: Both `realResult` and `maskedResult` are stored in the chat message's `flags.dnd35e.stackingHistory` so the card can re-render for either audience. The message itself is visible to all, but the render function checks `game.user.isGM` to pick which history to display.

> **Player Edit Secrets**: When a player with edit permission modifies a masked field, the edit is routed into a **Player Edit Secret** AE at higher priority than the mask (see §2.7.10). The real stack ignores it (filtered by `system.isPlayerEditSecret` field); the masked stack treats it as the highest-priority override. This prevents player edits from destroying the GM's hidden data.

### 2.5.3 Dual-Stack in Sheet UI (HasActiveEffectsNotification & Overrides)

The dual-stack pattern extends beyond chat cards — it also affects the **sheet field UI**. The `HasActiveEffectsNotification` component (sparkle icon + tooltip showing which effects modify a field) and the `getEffectsForField` / `hasEffectsForField` store getters must be **view-mode-aware**:

- **GM (or identified view)**: Sees all effect overrides for the field, including those from unidentified sources. Hidden effects are marked with a `[hidden]` indicator so the GM knows the player can't see them.
- **Player (or unidentified view)**: Sees only effect overrides from **identified** sources. If the only modifier on a field comes from an unidentified effect, the sparkle icon doesn't appear at all — the player has no reason to suspect the field is being modified.

**Implementation path**: The `ItemSheetStore.getEffectsForField()` currently reads raw from `document.value.overrides[fieldPath]`. It needs to filter based on the `RenderModeStore.isIdentifiedViewMode` and the source effect's identification state:

```typescript
// Current: returns all overrides (no filtering)
const getEffectsForField = (fieldPath: string) => computed(() =>
  document.value.overrides?.[fieldPath] ?? []
);

// Updated: filters by identification state when in unidentified view mode
const getEffectsForField = (fieldPath: string) => computed(() => {
  const overrides = document.value.overrides?.[fieldPath] ?? [];
  if (isGM.value || isIdentifiedViewMode.value) return overrides;
  // In unidentified view: exclude overrides from unidentified effect sources
  return overrides.filter(o => !hiddenEffectIds.value.has(o.effectId));
});
```

This means `hasEffectsForField` (which derives from `getEffectsForField`) automatically returns `false` when all modifiers on a field come from hidden sources — the sparkle icon vanishes for non-GM players.

**UX consequence**: A player looking at their sword's stats sees no sparkle, no hint of hidden bonuses. They cast Magic Weapon and now the sparkle appears showing "+1 enhancement from Magic Weapon." Meanwhile the GM's view shows both the hidden +2 and the suppressed Magic Weapon +1.

```typescript
// src/helpers/stacking.mts

export interface ChangeHistory {
  field: string;
  applied: ChangeApplication[]; // Changes that actually affected the result
  ignored: ChangeIgnored[]; // Changes rejected by stacking rules
  total: number; // Final resolved value for this field
}

export interface ChangeApplication {
  source: string; // "Material (Steel)" or "Masterwork" or effect name
  value: number;
  bonusType: BonusType;
  reason: string; // "applied" | "highest-wins" | "stacking" | "penalty"
}

export interface ChangeIgnored {
  source: string;
  value: number;
  bonusType: BonusType;
  reason: string; // "highest-wins rejected (lower)" | "same-type limit"
}

export interface ResolvedChanges {
  winners: Dnd35eEffectChangeData[]; // Changes that should be applied via applyChange()
  history: ChangeHistory[];          // Full audit trail for overrides enrichment
}

export function resolveActiveEffectChanges(
  changes: AppliedItemEffectChange[],
  penalties: AppliedItemEffectChange[]
): ResolvedChanges {
  const winners: AppliedItemEffectChange[] = [];
  const history: ChangeHistory[] = [];

  // Group bonus changes by { field, bonusType }
  const grouped = new Map<string, AppliedItemEffectChange[]>();
  for (const change of changes) {
    const key = `${change.key}|${change.bonusType ?? 'untyped'}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(change);
  }

  // Process each field
  const fieldsByName = new Map<
    string,
    {
      types: Map<BonusType, { applied: ChangeApplication; ignored: ChangeIgnored[]; winnerChanges: AppliedItemEffectChange[] }>;
    }
  >();

  for (const [key, list] of grouped) {
    const [fieldName, bonusType] = key.split('|');
    if (!fieldsByName.has(fieldName)) {
      fieldsByName.set(fieldName, { types: new Map() });
    }

    const fieldData = fieldsByName.get(fieldName)!;
    const typedBonusType = bonusType as BonusType;

    // Apply stacking rules per bonus type
    if (bonusType === 'untyped' || bonusType === 'dodge') {
      // Always stack: all changes are winners
      const total = list.reduce((sum, c) => sum + (c.value as number), 0);
      const applied: ChangeApplication = {
        source: list.map(c => c.source).join(' + '),
        value: total,
        bonusType: typedBonusType,
        reason: 'stacking (untyped/dodge)',
      };
      fieldData.types.set(typedBonusType, { applied, ignored: [], winnerChanges: list });
    } else {
      // Named types: only highest wins
      const sorted = [...list].sort((a, b) => (b.value as number) - (a.value as number));
      const winner = sorted[0];
      const losers = sorted.slice(1);

      const applied: ChangeApplication = {
        source: winner.source,
        value: winner.value as number,
        bonusType: typedBonusType,
        reason: 'highest-wins',
      };

      const ignored: ChangeIgnored[] = losers.map(c => ({
        source: c.source,
        value: c.value as number,
        bonusType: typedBonusType,
        reason: `highest-wins rejected (${c.value} < ${winner.value})`,
      }));

      fieldData.types.set(typedBonusType, { applied, ignored, winnerChanges: [winner] });
    }
  }

  // Collect winners and build history per field
  for (const [fieldName, fieldData] of fieldsByName) {
    let sum = 0;
    const applied: ChangeApplication[] = [];
    const ignored: ChangeIgnored[] = [];

    for (const [, { applied: app, ignored: ign, winnerChanges }] of fieldData.types) {
      applied.push(app);
      ignored.push(...ign);
      sum += app.value;
      winners.push(...winnerChanges);
    }

    history.push({
      field: fieldName,
      applied,
      ignored,
      total: sum,
    });
  }

  // Penalties always apply — add to winners unconditionally
  const penaltyHistory = new Map<string, ChangeApplication[]>();
  for (const penalty of penalties) {
    winners.push(penalty);

    const penList = penaltyHistory.get(penalty.key) ?? [];
    penList.push({
      source: penalty.source,
      value: penalty.value as number,
      bonusType: 'penalty' as BonusType,
      reason: 'penalty (always applies)',
    });
    penaltyHistory.set(penalty.key, penList);
  }

  // Merge penalty history into field history
  for (const [field, penApplied] of penaltyHistory) {
    const existing = history.find(h => h.field === field);
    if (existing) {
      existing.applied.push(...penApplied);
      existing.total += penApplied.reduce((sum, p) => sum + p.value, 0);
    } else {
      history.push({
        field,
        applied: penApplied,
        ignored: [],
        total: penApplied.reduce((sum, p) => sum + p.value, 0),
      });
    }
  }

  return { winners, history };
}
```

> **`source` property**: Changes don't carry a `label` field. The caller attaches `source` at collection time: `change.source = change.effect.displayName`. This keeps the stacking engine decoupled from effect document internals.

### 2.5.2 Chat Card Integration

When an attack or action is executed, the history is passed to the chat card renderer:

```typescript
// Example chat card display (from Phase 8 / Phase 9):
// 
// ===== ATTACK BONUS CALCULATION =====
// Base BAB: +5
// Ability (Strength +3): +3
// Masterwork +1 (enhancement)
// Material (Steel) +2 (material)
// ─────────────────────────────────
// TOTAL: +11
//
// Ignored bonuses:
// Material (Mithral) +0 — rejected (highest-wins, lower than Steel)
//
```

The `stacking.history` array is attached to the action result and rendered by the chat card template. Players can expand/collapse the calculation to see exactly what stacked and what was ignored.

> **Timing**: The first actual chat cards are produced in **Phase 10 (Action System)**. The first few chat card designs should be hand-prototyped to match the existing Foundry chat card look as closely as possible before building templates.

### 2.5.3 Integration into Item.applyActiveEffects()

The existing `applyActiveEffects()` on `ItemDnd35e` collects changes and applies them via `ActiveEffect.applyChange()`. Phase 2 inserts stacking resolution **before** application:

1. Collect all changes for the phase (existing code)
2. Attach `source` label to each change: `change.source = change.effect.displayName` (derived on the fly from the parent effect — changes don't carry their own label)
3. Separate penalties from bonuses
4. Run `resolveActiveEffectChanges(bonuses, penalties)` → get winners, losers, and history
5. Only pass **winning** changes to Foundry's `ActiveEffect.applyChange()`
6. Write enriched `Override` entries (with `bonusType`, `stackResult`, `stackReason`) into `this.overrides`

```typescript
// In ItemDnd35e.applyActiveEffects() — REPLACES the existing change application loop:

// 1. Collect changes (existing code, unchanged)
// ...

// 2. Attach source labels (derived from parent effect, not stored on change)
for (const change of changes) {
  change.source = change.effect.displayName;
}

// 3. Separate penalties from bonuses
const bonusChanges = changes.filter(c => c.value >= 0);
const penaltyChanges = changes.filter(c => c.value < 0);

// 4. Run stacking resolution BEFORE application
const { winners, history } = resolveActiveEffectChanges(bonusChanges, penaltyChanges);

// 5. Only apply winners via Foundry's standard mechanism
for (const change of winners) {
  const EffectClass = change.effect.constructor as typeof ActiveEffect;
  const result = (ActiveEffect.CHANGE_TYPES[change.type].handler?.(this, change)
    ?? EffectClass.applyChange(this, change, { replacementData }) ?? {}) as Record<string, unknown>;
  // ... populate overrides
}

// 6. Enrich overrides with stacking metadata
for (const entry of history) {
  const existing = this.overrides[entry.field] ?? [];
  for (const override of existing) {
    const applied = entry.applied.find(a => a.source === override.effectName);
    if (applied) {
      override.bonusType = applied.bonusType;
      override.stackResult = 'applied';
      override.stackReason = applied.reason;
    }
  }
  // Record ignored entries (no override exists for them since they weren't applied)
  for (const ign of entry.ignored) {
    if (!existing.some(o => o.effectName === ign.source)) {
      existing.push({
        fieldPath: entry.field,
        value: ign.value,
        effectName: ign.source,
        type: 'add', // original change type
        bonusType: ign.bonusType,
        stackResult: 'ignored',
        stackReason: ign.reason,
      });
    }
  }
}
```

**Critical**: The stacking engine filters changes **before** they reach `applyChange()`. If two materials both ADD +10 and +20 hardness, only +20 is applied. Without pre-filtering, Foundry would apply both for +30 — an incorrect result. Penalties bypass stacking and are always applied.

### 2.5.4 Actor Integration (Phase 5)

Actors use the same stacking engine. Phase 2 keeps the stacking integration directly in `ItemDnd35e.applyActiveEffects()` for now. When Phase 5 implements actor-side stacking, the shared logic should be **extracted into a helper** (e.g., `applyStackedChanges()` in `src/helpers/stacking.mts`) that both `ItemDnd35e` and `ActorDnd35e` call, rather than duplicating the collect → resolve → apply flow.

```typescript
// Phase 5 TODO: Extract shared stacking application logic into helper:
// applyStackedChanges(document, changes, replacementData) → { overrides, history }
// Used by both ItemDnd35e.applyActiveEffects() and ActorDnd35e.applyActiveEffects()
```

The `resolveActiveEffectChanges()` function is entirely generic — it knows nothing about whether it's being called by an item or an actor.

## 2.6 Material Subtypes

All Material AEs share the same `'material'` effect type and `MaterialSystemModel` data model, distinguished by a `materialSubtype` field:

```typescript
// In MaterialSystemModel.defineSchema()
schema.materialSubtype = new foundry.data.fields.StringField({
  required: true,
  initial: 'standard',
  choices: ['standard', 'broken', 'masterwork'],
});
```

| Subtype | Bonus Type (locked) | Per-item limit | Created by |
|---------|---------------------|----------------|------------|
| `standard` | `'material'` (highest-wins) | 1 if setting enabled, unlimited otherwise | User (drag from compendium or manual) |
| `broken` | `'broken'` (penalty, always stacks) | 1 | System auto-creates from compendium (Phase 5) |
| `masterwork` | `'masterwork'` (highest-wins) | 1 | System or user from compendium (Phase 5) |

- Single-material enforcement (§2.4): when enabled, blocks adding a second `standard` with error; `broken` and `masterwork` always allowed
- The `materialSubtype` field is user-editable at any time; since `buildChanges()` is regenerated during every preparation cycle, changes to this field are reflected immediately

### Deferred to Phase 5

The actual broken/masterwork **content** (default compendium entries), **sync logic** (`isBroken` ↔ Broken AE, `isMasterwork` ↔ Masterwork AE), **UI elements** (materialSubtype selector, Material AE creation workflow), and **integration tests** for material subtypes require the compendium pipeline and are implemented in Phase 5. Phase 2 only establishes the subtype field and ensures the stacking engine treats each subtype's bonus type correctly.

---

## 2.7 Secret Active Effect Type

The Secret AE type replaces the `Dnd35eField` `{ value, unidentifiedValue }` compound system. Instead of every field carrying its own unidentified value, items store only real values in plain fields. A GM-authored Secret AE **masks** specific fields at the display layer.

> **Schema walker update**: The FormulaFamiliar schema walker now includes **all fields by default** (opt-out via `formulaVisible: false`). When `Dnd35eField` wrappers are removed and fields become plain, no re-registration is needed — the walker already captures them. Fields like `slug` that shouldn't appear in autocomplete opt out explicitly. PriceField and FormulaField are treated as **opaque leaves** (`isFamiliarLeaf = true`), preventing the walker from recursing into their internal structure. See task decomposition §D1.

### 2.7.1 Core Concept

- **Real values live on the item** — plain fields, no compound wrappers
- **Fake values live on the Secret AE** — each change row masks one field
- **MASK change mode** — a new operator that writes to a display overlay, never mutates the real data
- **Reveal = disable, not delete** — disabling a Secret reveals the real values; the AE is preserved so the GM can re-hide if needed. Prevents accidental data loss.
- **`isIdentified` is derived** — computed from whether any enabled Secrets exist on the item. No persisted toggle. An item with no active Secrets is identified.

### 2.7.2 SecretSystemModel

```typescript
// src/entities/activeEffects/secret/data/SecretSystemModel.mts
class SecretSystemModel extends Dnd35eActiveEffectSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // changes[] inherited — each change row uses mode MASK
      // No additional fields needed for MVP
    };
  }
}
```

Each change row on a Secret AE:
- `key`: the field path to mask (e.g. `system.hardness`, `system.price`, `system.weaponType`)
- `value`: the display value to show instead of the real value
- `mode`: `MASK` (new — display overlay only)
- `priority`: determines layering when multiple Secrets target the same field

A GM can have **multiple Secret AEs** on one item. Priority controls which mask wins per-field when Secrets overlap. A GM can reveal secrets individually (disable one AE) or all at once.

### 2.7.3 MASK Change Mode

```typescript
// Registered in CONFIG.ActiveEffect.changeTypes
CONFIG.ActiveEffect.changeTypes.mask = {
  label: 'DND35E.ChangeMode.Mask',
  defaultPriority: 10,
  handler: null, // MASK changes are NOT applied during applyActiveEffects()
};
```

MASK is an internal change mode — not currently exposed in the standard AE change mode picker (Secret AEs have their own dedicated UI), but the label is registered for potential future use. MASK changes are **excluded from `applyActiveEffects()`** entirely. They never reach the stacking engine. Instead, the document builds a masks dictionary during data preparation (§2.7.4).

### 2.7.4 Masks Dictionary & Document Preparation

The masks dictionary is built **at document data preparation time**, not in the Pinia store. Any system that needs to know masked values (API consumers, chat cards, macros, etc.) can read the dictionary from the document.

```typescript
// In ItemDnd35e.prepareDerivedData() (or the Identifiable mixin):
this._masks = {};
const secrets = this.effects
  .filter(e => e.type === 'secret' && !e.disabled)
  .sort((a, b) => (b.system.changes[0]?.priority ?? 0) - (a.system.changes[0]?.priority ?? 0));
for (const secret of secrets) {
  for (const change of secret.system.changes) {
    if (!(change.key in this._masks)) {
      this._masks[change.key] = change.value; // highest-priority wins per field
    }
  }
}
```

The **Pinia store** is responsible for deciding which value to return when asked for a field. Based on the current `identifiedViewMode` (from `RenderModeStore`), the store returns either the real value or the masked value from `_masks`:

```typescript
// In the item's sheet store:
function getFieldValue(fieldPath: string): unknown {
  // Non-GM players always see masked values; GMs see masked when in "player view"
  if (shouldShowMasks.value && fieldPath in item._masks) {
    return item._masks[fieldPath];
  }
  return foundry.utils.getProperty(item, fieldPath);
}
```

No `displayData` property duplication — the Pinia store is the single gatekeeper that decides real vs masked per-field, on demand.

### 2.7.5 Formula Field Masking

When a Secret AE masks a formula field (e.g., `nameFormula`, `system.price.formula`), the mask targets the **formula** itself, not the resolved value. The display pipeline (`formula → resolvedValue → display`) naturally picks up the masked formula and resolves it, showing the masked output.

For `nameFormula` specifically: the display chain flows `nameFormula → FormulaData.resolvedValue → name`. `derivedName` is redundant with `FormulaData.resolvedValue` and is **deleted as part of Phase 1** (TODO 1.N). Masking `nameFormula` at the formula level causes the entire display name to show the masked value. The actual formula and resolved name on the real document remain untouched.

> **General rule**: Always mask the formula, never the resolved value. This ensures formula-dependent systems (autocomplete, validation, FormulaFamiliar) all see the correct masked output without special-casing.

### 2.7.6 AE Visibility & Secrets List

All Active Effects gain a **hidden/identified** toggle (2 states for MVP):

| State | Player sees | GM sees |
|-------|------------|---------|
| **Hidden** | AE not visible in effects list | AE visible, marked as hidden |
| **Identified** | AE fully visible | AE fully visible |

This is a simple `isHidden: boolean` on the base AE system model. For Secrets, `isHidden` is always `true` (players never see the Secret AE itself — they see the masked values). For other AEs (materials, buffs, etc.) the GM can choose to hide or show them.

**Secrets List (GM-only)**: Secret AEs are displayed in a **separate list** from standard AEs on both the item sheet and the actor sheet. This list is wrapped in the `GmOnly` component — players never see it. The list includes:
- A per-Secret toggle button to enable/disable (reveal/hide) individual Secrets
- A "Reveal All" button at the top to disable all Secrets at once
- Visual distinction (icon, styling) so GMs immediately recognize the Secrets section

**Standard AE list**: The standard AE effects list gains a toggle button per AE to flip `isHidden`. GMs can hide any AE (not just Secrets) from players. The toggle is only visible to GMs.

### 2.7.7 RenderModeStore Impact — 3-State Model

The existing 2-axis model (Edit/Play × Identified/Unidentified) is replaced by a **single 3-state enum**:

| State | Label | Who sees the button | What it shows |
|-------|-------|---------------------|---------------|
| **EDIT** | "Edit" | Owners (GM always; non-GM only when no active Secrets) | Source data — always the real/identified values |
| **IDENTIFIED** | "Play" | Everyone | Real values — the item as it truly is |
| **UNIDENTIFIED** | "Unidentified" | GM only | Masked values from `_masks` dictionary (§2.7.4) — GM preview of what players see |

The two old booleans (`isEditViewMode`, `identifiedViewMode`) collapse into one `viewMode: ViewMode` where `ViewMode = 'edit' | 'identified' | 'unidentified'`.

**Why 3-state?** There is no "edit unidentified" mode. Secrets handle masking at the display layer — you always edit the real data. Combining edit and play identity into one axis eliminates an impossible state.

#### Button Bar UI

All view-mode buttons are rendered in a **horizontal button bar** at the top of the sheet header. The active button uses full opacity; non-active buttons are **dimmed** (reduced opacity / muted styling). Clicking a dimmed button switches to that mode.

**GM sees** (identifiable item): three buttons — `[Edit] [Play] [Unidentified]`
**GM sees** (non-identifiable item): two buttons — `[Edit] [Play]`
**Player-owner sees**: two buttons — `[Edit] [Play]` (always — Player Edit Secrets protect masked data)
**Non-owner sees**: one button — `[Play]` (or no bar at all)

Players never see the "Unidentified" button. They see "Play" and "Edit." They don't know whether "Play" is showing them identified or unidentified data — it's just the item as they know it. The system decides: if active Secrets exist, "Play" returns masked values; if not, real values.

**Player Edit Secrets replace edit-mode locking**: Previously, non-GM owners with active Secrets would lose the Edit button (O3). This hinted at the secret's existence and felt heavy-handed. Instead, players always have Edit access, and any writes to masked fields are intercepted and routed into a Player Edit Secret AE (§2.7.10). The GM's real data is never overwritten.

#### Store Architecture

**Constructor — unchanged signature**: `isIdentified` and `isIdentifiable` are still passed in by the caller (`VueDocumentSheetMixin` via `DocumentStore`). The `DocumentStore` computes them from the document's effects and pushes updates via `updateIsViewIdentified()` when Secret AEs are added, removed, or toggled.

**`updateIsViewIdentified()` — stays**: `DocumentStore` calls this whenever the Secret AE collection changes (e.g., a Secret is revealed). This re-derives `isIdentified` in the reactive state and the 3-state model reacts: if the item was unidentified and all Secrets are now disabled, the player's "Play" view transitions from serving masked values to real values. For the GM, their selected preview state persists.

**Button bar rendering**: The two separate `renderEditModeButton()` / `renderIdentifiedViewButton()` methods are replaced by a single `renderViewModeBar()` method that builds the full button bar based on role and identifiability:

```
renderViewModeBar():
  buttons = []
  if canEdit:   buttons.push({ mode: 'edit',         label: 'Edit',         icon: 'fa-lock-open' })
  buttons.push(               { mode: 'identified',   label: 'Play',         icon: 'fa-play' })
  if isGM && isIdentifiable:
    buttons.push(             { mode: 'unidentified', label: 'Unidentified', icon: 'fa-eye-slash' })

  for each button:
    active = (button.mode === viewMode)
    render with active ? full-opacity : dimmed
    onClick → setViewMode(button.mode)
```

**`canEdit` logic**: `editable && (isGM || isOwner)` — non-GM owners always have the Edit button. Player Edit Secrets (§2.7.10) protect masked data when players edit.

#### Key Migration Steps

- Replace `isEditViewMode: boolean` + `identifiedViewMode: EditorViewMode` → `viewMode: ViewMode`
- `isEditViewMode` becomes `computed(() => viewMode === 'edit')`
- `isIdentifiedViewMode` becomes `computed(() => viewMode === 'identified')`
- Add `isUnidentifiedViewMode: computed(() => viewMode === 'unidentified')`
- `updateIsEditViewMode()` → sets `viewMode = 'edit'` or back to previous play state
- `updateIdentifiedViewMode()` → cycles IDENTIFIED ↔ UNIDENTIFIED (GM only, play modes only)
- `renderEditModeButton()` + `renderIdentifiedViewButton()` → replaced by `renderViewModeBar()`
- `DocumentSheetStore.getViewAwareFieldValue()` → reads `_masks` instead of `Dnd35eField.getEffective()`; returns masked value when `viewMode === 'unidentified'`, real value otherwise
- FormGroup `isIdentifiedViewMode` short-circuits → removed; store gives correct value
- Player "Play" mode: store internally checks `hasActiveSecrets` to decide whether to serve real or masked values — player is unaware

```typescript
type ViewMode = 'edit' | 'identified' | 'unidentified';

const useRenderModeStore = (
  isOwner: boolean,
  isIdentified: boolean = true,   // caller computes from Secret AEs
  isIdentifiable: boolean = true, // caller computes: does doc support Secrets?
  isEditMode: boolean = false
): RenderModeStore => {
  // Initial viewMode:
  //   isEditMode → 'edit'
  //   !isIdentifiable || isIdentified → 'identified'
  //   else → 'unidentified'
};
```

### 2.7.8 Identify Flow

Identification = disabling all Secret AEs on an item:

```typescript
// On ItemDnd35e or via the Identifiable mixin:
revealAllSecrets(): Promise<void> {
  const secrets = this.effects.filter(e => e.type === 'secret' && !e.disabled);
  const updates = secrets.map(e => ({ _id: e.id, disabled: true }));
  await this.updateEmbeddedDocuments('ActiveEffect', updates);
  // Each disabled Secret fires the 'revealSecret' document event (Phase 6)
}
```

The existing "Identify" toggle in the UI becomes a **"Reveal All"** button that calls `revealAllSecrets()`. Individual Secrets can also be disabled one-at-a-time by the GM for partial reveals via the Secrets List toggle buttons (§2.7.6).

### 2.7.9 Creation Restrictions

- **GM-only**: Only GMs can create Secret AEs
- **Item-only**: Secrets can only exist on items (not actors directly)
- **Dedicated button**: Created via an "Add Secret" button on the item sheet (wrapped in `GmOnly` component), NOT through the standard AE creation modal
- **Hidden from AE modal**: The `secret` type is filtered out of the AE type selector in the creation dialog

> **Note**: Compendium items can carry embedded Secret AEs (v14 supports embedded AEs on compendium items). Items dragged from compendium arrive pre-configured with secrets.

### 2.7.10 Player Edit Secrets

When a non-GM player with edit permission modifies a field that is **currently masked** by an active Secret AE, the edit must not overwrite the GM's real data. Instead, the system intercepts the write and routes it into a **Player Edit Secret** — a system-managed Secret AE that sits at higher priority than regular masks.

#### Why This Exists

Without interception, a player editing a masked field would write directly to the document's real data, destroying the GM's carefully arranged values. Player Edit Secrets preserve the GM's data while letting the player's edit appear in the masked (player-visible) view.

#### Design Constraints

1. **Schema-identified**: A Player Edit Secret is a regular Secret AE with `system.isPlayerEditSecret: true` (boolean field on SecretSystemModel). No new AE subtype or data model.
2. **Higher priority**: Player Edit Secret MASK changes use priority 3001 (vs 10 for regular Secrets). The existing `_buildMasks()` sorts by priority descending, so player edits naturally win per-field while normal UI entry stays below the user-facing cap.
3. **Single AE per item**: All player edits to masked fields on one item accumulate as MASK changes on **one** Player Edit Secret AE, not one AE per field.
4. **Only masked fields**: If a field has no active mask (not in `_masks`), the player writes normally to the document. Interception only fires when the field is currently masked.
5. **No match-checking**: We do not check whether the player's edit happens to match the real value. The override just stays.
6. **GM-deletable**: The GM can delete a Player Edit Secret from the Secrets list to reset the player's overrides.
7. **System-managed**: Created and updated automatically — players never interact with it as an AE.

#### Interception Point

The interception lives in `viewModeAwareUpdateDocument()` in the base `DocumentSheetStore`. Before writing, each field path is checked against `_masks`:

```typescript
// In viewModeAwareUpdateDocument():
// For each field in the update data:
//   if (!game.user.isGM && field in document._masks):
//     → route to Player Edit Secret AE (create or update)
//     → remove from normal update data
//   else:
//     → write normally to document

// Mixed updates are split: masked fields → AE route, non-masked → normal write
```

#### Player Edit Secret Structure

```typescript
// Created on first masked-field edit:
{
  name: game.i18n.localize('dnd35e.EFFECT.Secret.PlayerOverride'),
  img: 'icons/svg/pencil.svg',   // distinct from regular Secret eye icon
  type: 'secret',
  origin: item.uuid,
  disabled: false,
  system: {
    isPlayerEditSecret: true,  // boolean field on SecretSystemModel schema
    changes: [
      // Each masked-field edit becomes a MASK change:
      {
        key: 'system.hardness',    // the field path the player edited
        value: '15',               // the value the player typed
        type: 'mask',              // MASK change mode
        priority: 3001,            // above regular Secret priority (10)
        target: 'item',
        targetField: 'value',
      },
    ],
  },
}
```

#### Interaction with Dual-Stack Resolution (§2.5.2)

Player Edit Secrets participate in the **masked stack** but are **excluded from the real stack**:

- **Real stack** (GM / die roll): Player Edit Secret is filtered out by `system.isPlayerEditSecret` field. Real values determine mechanical outcomes.
- **Masked stack** (player view / chat card): Player Edit Secret participates at highest priority. The player sees their edit reflected.

This means: if a player edits "hardness" to 15 on a secretly +20-hardness sword, the real hardness remains 20 for mechanics, but the player sees 15 in their view.

#### GM Visibility

Player Edit Secrets appear in the GM-only Secrets list with:
- **Pencil icon** (`fa-solid fa-pencil`) instead of the regular eye icon
- **"Player Override"** label to distinguish from GM-authored Secrets
- Standard delete button — GM can remove to reset player overrides
- Enable/disable toggle — GM can temporarily suppress player overrides

#### Cleanup on Reveal

When the GM uses "Reveal All" to disable all Secrets, Player Edit Secrets are also disabled. Since the item is now fully identified, the player sees real values and their overrides become moot. If the GM later re-hides the item (creates new Secrets), the Player Edit Secret stays disabled — the player would need to re-edit to create new overrides. Automatic cleanup (deleting stale Player Edit Secrets) is a stretch goal, not required for Phase 2.

---

## 2.8 Strategic Note: Actor Integration Timing

**Question**: Should Phase 2 include the actor-side `applyActiveEffects()` implementation, or defer it to Phase 5?

**Decision**: Defer to Phase 5 (Actor Foundation).

**Reasoning**:
1. **Dependency order**: Phase 2 finishes before Phase 5 begins, but actors don't exist yet until Phase 5
2. **Generic design**: The stacking engine (`resolveActiveEffectChanges()`) is built generically in Phase 2. Phase 5 reuses it with no changes
3. **Parallel work**: By keeping Phase 2 item-focused, both phases can be worked on independently:
   - Phase 2: Finish Material AE + stacking engine on items
   - Phase 5: Implement Actor foundation + apply stacking engine to actors
4. **Code clarity**: Keeping Material AE logic in Phase 2 and actor integration in Phase 5 preserves the "one thing at a time" principle
5. **Testing**: Phase 2 tests item stacking (Material pattern). Phase 5 proves actor-level stacking independently

The `resolveActiveEffectChanges()` utility (§2.5.1) lives in `src/helpers/stacking.mts` and is imported by both phases when they're ready — no duplication, single source of truth.

---

## 2.9 Files

| Action | Path |
|--------|------|
| Verify | `src/entities/activeEffects/material/` — completeness |
| Create | `src/entities/activeEffects/general/` — `GeneralSystemModel` (extends `Dnd35eActiveEffectSystemModel`, no additional schema fields), `General` document class, type constant `'general'` |
| Create | `src/helpers/stacking.mts` — `resolveActiveEffectChanges()` returning `{ winners, history }`; interfaces: `ResolvedChanges`, `ChangeHistory`, `ChangeApplication`, `ChangeIgnored` |
| Modify | `src/entities/activeEffects/BaseActiveEffect/data/ActiveEffectSystemData.mts` — add `bonusType?: BonusType` and `condition?: string` to `Dnd35eEffectChangeData` |
| Modify | `src/entities/activeEffects/BaseActiveEffect/data/ActiveEffectSystemModelBase.mts` — add optional `bonusType` StringField to change schema |
| Modify | `src/entities/items/baseItem/ItemDnd35e.mts` — extend `Override` type with `bonusType?`, `stackResult?`, `stackReason?`; replace change application loop with pre-filter stacking flow |
| Modify | `src/entities/activeEffects/material/data/MaterialSystemModel.mts` — add `materialSubtype` field; map subtype → bonusType in `buildChanges()` |
| Modify | `src/entities/activeEffects/effectTypes.mts` — replace `BASE_EFFECT_TYPE = 'base'` with `GENERAL_EFFECT_TYPE = 'general'` |
| Modify | `src/entities/activeEffects/BaseActiveEffect/DnD35eActiveEffect.mts` — update proxy to route `'general'` through `DnD35eActiveEffect`; remove `BASE_EFFECT_TYPE` fallback to vanilla `ActiveEffect` |
| Modify | `src/entities/activeEffects/registration.mts` — register `GeneralSystemModel` as `'general'`; set `baseTypeAllowed = false` |
| Modify | All effect sheets — `bonusType` is **normally visible** in the change UI; only **hidden and auto-set** for effect types that lock it out (e.g., Material AEs auto-set from subtype) |
| Create | `src/constants/bonusTypes.mts` — BonusType with only `'material' | 'broken' | 'masterwork'`; add new types only when a consumer exists |
| Create | System setting `dnd35e.combat.enforceSingleMaterial` |
| Create | `src/entities/activeEffects/secret/` — `SecretSystemModel` (extends `Dnd35eActiveEffectSystemModel`, no additional schema fields for MVP), `Secret` document class, type constant `'secret'` |
| Modify | `src/entities/activeEffects/registration.mts` — also register `SecretSystemModel` as `'secret'`; filter `'secret'` from AE creation dialog |
| Modify | `src/entities/activeEffects/effectTypes.mts` — add `SECRET_EFFECT_TYPE = 'secret'` to `EFFECT_TYPES` and `EffectType` union |
| Modify | `src/entities/activeEffects/BaseActiveEffect/data/ActiveEffectSystemModelBase.mts` — add `isHidden: boolean` field (default: `false`) |
| Create | MASK change mode registration in `CONFIG.ActiveEffect.changeTypes` (no label — internal mode) |
| Modify | `ItemDnd35e.mts` (or Identifiable mixin) — build `_masks` dictionary in `prepareDerivedData()`; add `revealAllSecrets()` method; derive `isIdentified` from absence of active Secrets |
| Modify | Item sheet store (Pinia) — read `_masks` dictionary; return real or masked value based on `identifiedViewMode` |
| Modify | Item sheet — add GM-only "Secrets List" (separate from standard AE list, wrapped in `GmOnly`), "Add Secret" button (GM-only), replace "Identify" toggle with "Reveal All" button |
| Modify | Standard AE list — add per-AE `isHidden` toggle button (GM-only) |
| Modify | `RenderModeStore.mts` — replace 2-axis model with 3-state `ViewMode` (`'edit'`/`'identified'`/`'unidentified'`); keep `updateIsViewIdentified` (DocumentStore pushes); players always have Edit (Player Edit Secrets protect masked data) |
| Modify | `DocumentSheetStore.mts` — replace `getViewAwareFieldValue()` (remove `Dnd35eField.getEffective()` call); store reads `_masks` based on `identifiedViewMode`; intercept masked-field writes from non-GM users in `viewModeAwareUpdateDocument()` → route to Player Edit Secret |
| Modify | All FormGroup components — remove `isIdentifiedViewMode` short-circuit (store handles value selection) |
| Modify | `HasActiveEffectsNotification.vue` — display enriched stacking info (bonusType, stackResult, stackReason) in tooltip |
| Create | Player Edit Secret helpers — `findOrCreatePlayerEditSecret(item)`, `addOrUpdatePlayerEditMask(ae, fieldPath, value)` |
| Modify | `SecretsList.vue` — distinguish Player Edit Secrets (pencil icon, "Player Override" label) |
| Modify | `ItemDnd35e._buildMasks()` — already handles priority; Player Edit Secrets at priority 3001 naturally win |
| Modify | Localization (`effects.json`) — add `EFFECT.Secret.PlayerOverride` and tooltip strings |
| Verify | Effect sheet Vue components |
| Test | ~~Unit tests for `resolveActiveEffectChanges()`~~ — **deferred to Phase 4** (testing infrastructure) |
| Document | The Material pattern for reuse in later phases; note that Material AE bonus types are locked out from UI but bonusType is normally visible on standard changes |

> **General AE Type**: Phase 2 replaces the `'base'` type with a `'general'` type backed by `GeneralSystemModel` (extends `Dnd35eActiveEffectSystemModel` with no additional fields). The proxy routes `'general'` through `DnD35eActiveEffect`, giving all AEs our system schema (`bonusType`, `target`, `isSystem`, stacking). `CONFIG.ActiveEffect.baseTypeAllowed` is set to `false` — all AEs must have a registered type. Post-release: re-enable `baseTypeAllowed = true` with transform/migration logic so external modules can create AEs that get upgraded to `'general'` automatically.

---

**Phase 5 will add**:
- Enrich `ActorDnd35e.overrides` with same stacking metadata pattern
- Actor-level AE rendering and collection logic

**Phase 8 (Action System) will consume**:
- `resolveActiveEffectChanges()` at action time to compute per-action stacking history
- Pass `ChangeHistory[]` to chat card builder function
- Chat card HTML embeds the breakdown — Foundry preserves chat messages, history is durable
- Does NOT read from `overrides` — computes fresh for each action

---

## 2.10 Execution Plan

Routed task decomposition and parallelization tracks for the remaining Phase 2 work.

### Track A: Stacking Engine (Lead dev)

```yaml
task_A1:
  name: "Create src/helpers/stacking.mts with interfaces"
  routing: Lead dev
  blocking: [A2]
  verify: "File exports ResolvedChanges, ChangeHistory, ChangeApplication, ChangeIgnored interfaces; compiles clean"

task_A2:
  name: "Implement resolveActiveEffectChanges() with stacking rules"
  routing: Lead dev
  depends_on: [A1]
  blocking: [C1]
  verify: "3 changes same bonusType same field → only highest returned; untyped changes sum; penalties always apply; history tracks applied + ignored with reasons"

task_A3:
  name: "Create src/constants/bonusTypes.mts"
  routing: Flexible
  blocking: [B2]
  verify: "Exports BonusType = 'material' | 'broken' | 'masterwork' only — no speculative types"

task_A4:
  name: "Update Dnd35eEffectChangeData interface + schema"
  routing: Lead dev
  blocking: [A2, B2]
  verify: "Interface has bonusType?: BonusType, condition?: string; schema has optional bonusType StringField; TypeScript interface matches schema"

task_A5:
  name: "Create GeneralSystemModel + replace base type"
  routing: Lead dev
  blocking: [C1]
  verify: "GeneralSystemModel registered as 'general'; effectTypes.mts exports GENERAL_EFFECT_TYPE; proxy routes 'general' through DnD35eActiveEffect; baseTypeAllowed = false; plain AE creation defaults to type 'general'"
```

### Track B: Material Subtype (Jr dev, parallel with A)

```yaml
task_B1:
  name: "Add materialSubtype field to MaterialSystemModel schema"
  routing: Jr dev
  blocking: [B2]
  verify: "MaterialSystemModel has materialSubtype: 'standard' | 'broken' | 'masterwork' with initial 'standard'; field exists in schema"

task_B2:
  name: "Map materialSubtype → bonusType in buildChanges()"
  routing: Jr dev
  depends_on: [B1, A3]
  blocking: [C1]
  verify: "buildChanges() output includes bonusType matching subtype; caller attaches source from effect.displayName at collection time"

task_B3:
  name: "Verify bonusType locked out from Material AE sheet UI"
  routing: Flexible
  depends_on: [B2]
  verify: "bonusType field not visible in Material AE UI (locked, auto-set from subtype); bonusType IS visible on standard/generic AE changes"
```

### Track C: Integration (Lead dev, after A+B merge)

```yaml
task_C1:
  name: "Integrate stacking pre-filter into applyActiveEffects() + extend Override type"
  routing: Lead dev
  depends_on: [A2, B2]
  blocking: [C2, C3]
  verify: "applyActiveEffects() runs resolveActiveEffectChanges() BEFORE applyChange(); only winners applied; Override type includes bonusType?, stackResult?, stackReason?; ignored changes recorded in overrides"

task_C2:
  name: "Update HasActiveEffectsNotification.vue for enriched tooltips"
  routing: Jr dev
  depends_on: [C1]
  verify: "Tooltip shows bonusType and stack result; ignored effects shown dimmed or with rejection reason"

task_C3:
  name: "Create single-material enforcement setting"
  routing: Jr dev
  depends_on: [C1]
  verify: "Setting dnd35e.combat.enforceSingleMaterial exists; when enabled, adding second standard Material AE throws error and blocks; when disabled, allows but flags not-RAW warning; broken/masterwork always allowed"
```

### Track D: Testing & Documentation (Flexible, after C)

```yaml
task_D1:
  name: "Unit tests for resolveActiveEffectChanges()"
  routing: Jr dev or Pair
  depends_on: [A2]
  status: "Deferred to Phase 4 — testing infrastructure not yet set up"
  verify: "Deferred"

task_D2:
  name: "Integration tests for material stacking"
  routing: Jr dev or Pair
  depends_on: [C1]
  status: "Deferred to Phase 5 — requires compendium content for material subtypes"
  verify: "Deferred"

task_D3:
  name: "Document Material pattern for reuse"
  routing: Flexible
  depends_on: [C1]
  verify: "Documentation covers: AE → buildChanges() → applyActiveEffects() → enriched overrides flow; bonusType normally visible, locked out for Material AEs; Phase 5 helper extraction plan"
```

### Track E: Secret AE (Lead dev, parallel with A+B)

```yaml
task_E1:
  name: "Create SecretSystemModel + register 'secret' type"
  routing: Lead dev
  depends_on: [A5]
  blocking: [E2, E3]
  verify: "SecretSystemModel registered as 'secret'; type added to EFFECT_TYPES union; 'secret' filtered from AE creation dialog"

task_E2:
  name: "Register MASK change mode + exclude from applyActiveEffects()"
  routing: Lead dev
  depends_on: [E1]
  blocking: [E3]
  verify: "MASK constant defined (no label — internal mode); MASK changes excluded from stacking engine; MASK changes preserved on AE and readable at doc prep time"

task_E3:
  name: "Build _masks dictionary at document prep + Pinia store integration"
  routing: Lead dev
  depends_on: [E2]
  blocking: [E5, E6, E8]
  verify: "_masks built in prepareDerivedData() from active Secret AEs; Pinia store reads _masks and returns real or masked value based on identifiedViewMode; masks recalculate on every prep cycle"

task_E4:
  name: "Add isHidden to ActiveEffectSystemModelBase + AE list filtering + Secrets List"
  routing: Jr dev
  depends_on: [E1]
  blocking: [E6]
  verify: "isHidden boolean on base schema (default: false); Secret AEs default isHidden: true; AE list filters hidden for non-GM; Secrets in separate GM-only list (GmOnly component); per-AE isHidden toggle in standard list"

task_E5:
  name: "Derive isIdentified + revealAllSecrets() + Identify UI"
  routing: Lead dev
  depends_on: [E3]
  blocking: [E7]
  verify: "isIdentified derived from absence of active Secrets; revealAllSecrets() disables all Secrets; 'Reveal All' button replaces Identify toggle; GM can disable individual Secrets via Secrets list toggles"

task_E6:
  name: "Add Secret button + creation restrictions"
  routing: Jr dev
  depends_on: [E3, E4]
  blocking: [E7]
  verify: "'Add Secret' button on item sheet (GmOnly component); secret type hidden from AE creation dialog; non-GM users cannot create Secrets via API"

task_E7:
  name: "Secret AE tests"
  routing: Jr dev or Pair
  depends_on: [E5, E6, E8]
  status: "Deferred to Phase 4 — testing infrastructure not yet set up"
  verify: "Deferred"

task_E8:
  name: "RenderModeStore 3-state model + button-bar UI + FormGroup cleanup"
  routing: Lead dev
  depends_on: [E3]
  blocking: [E7, E9]
  verify: "RenderModeStore uses 3-state ViewMode ('edit'|'identified'|'unidentified'); button-bar UI with dimming for inactive modes; GM sees Edit+Play+Unidentified, player always sees Edit+Play; 'Unidentified' hidden from non-GM; renderViewModeBar() replaces two separate button renderers; constructor params unchanged, DocumentStore pushes isIdentified via updateIsViewIdentified(); DocumentSheetStore.getViewAwareFieldValue() uses _masks; isIdentifiedViewMode short-circuit removed from all FormGroup components"

task_E9:
  name: "Player Edit Secrets — interception + helpers + GM UI"
  routing: Lead dev
  depends_on: [E3, E8]
  blocking: [E7]
  verify: "Non-GM editing masked field → Player Edit Secret AE created with flag; masked field write intercepted in viewModeAwareUpdateDocument(); non-masked fields write normally; mixed updates split correctly; Player Edit Secret at priority 3001 wins over regular Secret (10); GM Secrets list shows Player Edit Secret with pencil icon and 'Player Override' label; GM can delete; revealAllSecrets() also disables Player Edit Secrets; real stack excludes Player Edit Secrets (filtered by system.isPlayerEditSecret field)"
```

### Parallelization Diagram

```
TRACK A: Stacking Engine     TRACK B: Material Subtype     TRACK E: Secret AE
────────────────────────      ────────────────────────      ────────────────────
A1: Interfaces      [Lead]    B1: materialSubtype   [Jr]    ┌─ (waits for A5) ─┐
A2: Stacking rules  [Lead]    B2: subtype→bonusType [Jr]    E1: SecretModel  [Lead]
A3: BonusType const [Flex]    B3: UI verification   [Flex]  E2: MASK mode    [Lead]
A4: Interface+schema[Lead]                                  E3: Masks@prep   [Lead]
A5: GeneralModel    [Lead] ─────────────────────────────┘   E4: isHidden     [Jr]
        │                          │                        E5: isIdent+UI   [Lead]
        └──────────┬───────────────┘                        E6: Add Secret   [Jr]
                   ▼                                        E8: RenderMode   [Lead]
        TRACK C: Integration                                E9: PlayerEdit   [Lead]
        ────────────────────                                E7: Tests        [Jr/Pair]
        C1: Pre-filter stacking  [Lead]
        C2: Notification tooltip [Jr]
        C3: Single-material setting [Jr]
                   │
                   ▼
        TRACK D: Testing & Docs
        ───────────────────────
        D1: Unit tests    [Jr/Pair]  (deferred to Phase 4)
        D2: Integration   [Jr/Pair]  (deferred to Phase 5)
        D3: Documentation [Flex]
```

**What can run in parallel:**
- Tracks A and B are **fully independent** — stacking engine knows nothing about material subtypes
- **Track E is independent of Tracks B and C** — Secret AE only depends on A5 (GeneralSystemModel must exist first so the type registration pattern is established)
- E4 (isHidden + lists) can run parallel with E2+E3 after E1
- E8 (RenderModeStore) can run parallel with E5 after E3
- ~~D1 (unit tests) can start as soon as A2 completes, parallel with Track B~~ — deferred to Phase 4
- C2 and C3 are independent after C1

**Routing summary:**
- **Lead dev**: A1, A2, A5, C1, E1, E2, E3, E5, E8
- **Jr dev**: B1, B2, C2, C3, D1, D2, E4, E6, E7
- **Flexible**: A3, B3, D3

---

## 2.11 Risks & Blockers

```yaml
risk_1:
  name: "Stacking resolution must filter changes BEFORE Foundry's applyChange()"
  impact: "If stacking runs after applyChange(), Foundry applies all changes (e.g., two +ADD hardness stack instead of highest-wins). The actual field values would be wrong. Stacking metadata alone can't fix incorrect values."
  mitigation: "resolveActiveEffectChanges() runs BEFORE the applyChange() loop. It returns a winners list — only winners are passed to applyChange(). Losers are recorded in history but never applied. Penalties bypass stacking and are always included in winners."
  status: "Design corrected — stacking pre-filters, does not post-annotate."

risk_2:
  name: "Override enrichment must not break HasActiveEffectsNotification.vue"
  impact: "Adding new optional fields (bonusType, stackResult, stackReason) to Override could break existing UI if it expects only the current 4 fields"
  mitigation: "Fields are optional (?). Existing UI reads effectName, value, type — new fields are additive. HasActiveEffectsNotification.vue updated in task C2 to display them."

risk_3:
  name: "BonusType enum extensibility"
  impact: "Starting with 3 types. Later phases add more. Stacking engine must handle unknown types gracefully."
  mitigation: "Default stacking rule for any named bonusType is highest-wins. New types don't need stacking engine changes unless they have special rules (like dodge stacking). Add types to the union when a consumer exists."

risk_4:
  name: "Item HP model — flat bonus HP (decided)"
  impact: "N/A — decided. Items use flat system.hp.max. No thickness field, no HP-per-inch."
  mitigation: "Materials provide a flat bonusHp value added to system.hp.max via buildBonusHpChange(). Method renamed from buildBonusHpPerInchChange(). If HP-per-inch is ever revisited, it would be a future enhancement."
  status: "Resolved — flat HP model."

risk_5:
  name: "Player Edit Secret — mixed update splitting"
  impact: "A single viewModeAwareUpdateDocument call may contain both masked and non-masked fields. Must split correctly."
  mitigation: "In the mapping loop, separate entries into masked (→ AE route) and non-masked (→ normal write). Await both paths. Test with mixed updates."

risk_6:
  name: "Player Edit Secret — AE creation during update may trigger re-render"
  impact: "Creating an embedded AE mid-update might trigger a prep cycle and re-render before the normal write completes."
  mitigation: "Use {render: false} option on createEmbeddedDocuments if needed; verify sequencing in Foundry v14."

risk_7:
  name: "Player Edit Secret — interception in base store vs identifiable layer"
  impact: "viewModeAwareUpdateDocument is in CoreMixin's DocumentSheetStore; masks are an Identifiable concept."
  mitigation: "Base store already reads _masks in getViewAwareFieldValue. Same pattern: check _masks in viewModeAwareUpdateDocument. The _masks dict is already on the document."
  type: "Explore-at-phase-start"
```

---

## 2.12 Deferred & Bonus Content

Features designed in Phase 2 but not implemented here. Each entry lists where it will land.

| Feature | Status | Landing | Notes |
|---------|--------|---------|-------|
| `revealSecret` document event emission | **Phase 6** | [Phase 6 §5.9](phase-06-actor-foundation.md) (L520+) | Event type, payload, and registration already documented there |
| Identify via Spellcraft / Identify spell | **Phase 25** | [Phase 25](phase-25-enhancements.md) (L63, L310) | `identificationType` field + DC-based skill check gating |
| Per-Secret reveal hooks | **Bonus** | [Phase 25](phase-25-enhancements.md) | Each Secret can define a hook/event that fires on reveal. Natural fit alongside enchantment identification (Spellcraft/Identify). |
| Per-player knowledge ("Advanced Secrets") | **Bonus** | [Phase 23](phase-23-advanced-actors.md) | Different players see different mask states. Requires player-scoped AE visibility. Phase 23 already references Secret AE dependency for NPC/Object identifiability. |
| 3-state AE visibility | **Deferred to beta** | [Phase 31](phase-31-community-hardening.md) | Upgrade from 2-state (hidden/identified) to 3-state (unknown/known-unidentified/identified). Community hardening is the natural fit for UX refinements. |
| Player Edit Secret cleanup on reveal | **Stretch** | Phase 2 or Phase 31 | When GM reveals all Secrets, Player Edit Secrets become stale. Auto-delete is a stretch goal; GM can manually delete for now. |
| Material dev testing follow-up | **Phase 2 closeout** | Phase 2 | Dedicated dev-world validation pass for Material authoring, subtype switching, propagation, and stacking UX before Phase 2 is considered fully closed. |
| General AE cleanup follow-up | **Phase 2 closeout** | Phase 2 | Move General AE off the default Foundry fallback path and onto the intended dnd35e sheet/tabs flow. |
| Secret images (`img`) | **Deferred after closeout** | Phase 2 follow-up after Material dev testing + General AE cleanup | Root-level image masking needs a focused pass for refresh behavior, image-picker UX, and Foundry file-field handling. |
| ~~Player Edit Secrets~~ | **Absorbed into Phase 2** | §2.7.10 + Track 14 | Originally Phase 45. Pulled forward because player edit protection is essential for the identification system to work correctly. Phase 45 marked as absorbed. |

### 2.12.1 Phase 2 Closeout Ordering

Before Phase 2 is treated as fully complete, do the closeout work in this order:

1. **Material dev testing follow-up** — practical validation of Material AE authoring and propagation in the dev world.
2. **General AE cleanup** — remove the remaining default Foundry/fallback feel from the General AE sheet flow.
3. **Secret images (`img`)** — come back to root-level image masking only after the two follow-ups above are done.

The reasoning is deliberate: secret image work is not blocked on the core masking idea, but it is image-specific and will need focused handling for image-picker UX and Foundry's file-field expectations. That is easier to approach after the Material and General AE surfaces are cleaned up.

### 2.12.2 Material Dev Testing Follow-Up

This closeout pass is for practical validation, not new architecture. The goal is to run the Material workflow against real dev-world items and verify that authoring, subtype switching, propagation, and stacking presentation all behave the way the phase design expects.

This is the right place to catch any remaining Material-specific UX rough edges before Phase 2 is declared done.

### 2.12.3 General AE Cleanup Follow-Up

The `general` effect type should be treated as the baseline effect-authoring surface for later phases. It still needs a cleanup pass so it no longer feels like a default Foundry fallback or default-tab path.

That follow-up should align General AE with the intended dnd35e sheet/tabs experience and make sure ordinary change authoring is clean there.

### 2.12.4 Secret Images (`img`) — After Closeout

Secret image support stays after the two closeout tasks above. The remaining work is not just another field mask; it needs a deliberate answer for root-level refresh behavior, image-picker authoring, and Foundry's file/image field expectations.
