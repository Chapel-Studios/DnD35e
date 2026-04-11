# Phase 2: Active Effect on Item (Material)

**Status**: 🔶 In Progress (Stacking engine, integration tests)

> **Milestone**: POC  
> **Dependencies**: Phase 1  
> **Goal**: A Material active effect that lives on a weapon and modifies the weapon's data. Establishes the "Material pattern" (items/effects generate AE changes dynamically in `prepareDerivedData()`), the **bonus type stacking engine** (per-field highest-wins resolution), and the `materialSubtype` field that distinguishes standard materials from broken and masterwork effects. Broken and masterwork AE **content and sync logic** are deferred to Phase 4 (Compendium Foundation) because they pull defaults from compendium packs.

---

## Completion Checklist

### ✅ Complete
- [x] Material AE creates system changes via `buildChanges()` targeting parent weapon
- [x] Two-phase effect application (initial/final) infrastructure
- [x] `ActiveEffectProxyDnd35e` dispatches by effect type
- [x] Effect type registry with `'base'` and `'material'` types
- [x] `isMasterwork` flag exists on WeaponSystemModel
- [x] `isBroken` field referenced in PropertyMap

### 🔶 In Progress (Remaining for Phase 2 Completion)
- [ ] **Bonus Type Stacking Engine**:
  - [ ] Create `src/helpers/stacking.mts` with `resolveActiveEffectChanges()` function
  - [ ] Implement interfaces: `ResolvedChanges`, `ChangeHistory`, `ChangeApplication`, `ChangeIgnored`
  - [ ] Implement stacking rules: untyped always stacks, dodge always stacks, named types highest-wins, penalties always apply
  - [ ] Write history tracking logic that captures applied/ignored bonuses with reasons
  - [ ] Export `BonusType` with initial types: 'material' | 'broken' | 'masterwork' (add new types only when a consumer exists)
  
- [ ] **Material Subtype Field**:
  - [ ] Add `materialSubtype: 'standard' | 'broken' | 'masterwork'` to MaterialSystemModel schema
  - [ ] Map each subtype to correct bonus type when generating changes
  - [ ] Ensure `buildChanges()` includes source labels for history (e.g., "Material (Steel)")
  - [ ] Test subtype selection in UI doesn't expose bonus type
  
- [ ] **ItemDnd35e.applyActiveEffects() Integration**:
  - [ ] Collect all active effects with `_flattenActiveEffects()`
  - [ ] Separate penalties from bonuses
  - [ ] Call `resolveActiveEffectChanges(bonuses, penalties)` 
  - [ ] Apply resolved values to `this.system` fields
  - [ ] Enrich `this.overrides` entries with stacking metadata (bonusType, stackResult, stackReason)
  - [ ] Verify overrides repopulate correctly every preparation cycle (derived data, not persisted)
  
- [ ] **System Setting for Single-Material Enforcement**:
  - [ ] Create `dnd35e.combat.enforceSingleMaterial` boolean setting (default: true)
  - [ ] Implement validation warning when adding second standard Material AE
  - [ ] Test that setting can be toggled without breaking stacking resolution
  
- [ ] **Material AE Sheet Validation**:
  - [ ] Verify effect sheet UI does NOT expose `bonusType` field for Material AEs
  - [ ] Ensure `materialSubtype` selector is visible and functional
  - [ ] Test Material AE creation workflow end-to-end
  - [ ] Verify Material AE updates propagate immediately to weapon stats
  
- [ ] **Override Enrichment (Stacking Metadata)**:
  - [ ] Extend `Override` type with optional `bonusType`, `stackResult`, `stackReason` fields
  - [ ] After stacking resolution, enrich `this.overrides` entries with stacking metadata
  - [ ] Update `HasActiveEffectsNotification.vue` to display enriched stacking info in tooltip
  - [ ] Verify overrides are cleared and repopulated every preparation cycle (derived data, never persisted)
  
- [ ] **Test Coverage**:
  - [ ] Unit tests for `resolveActiveEffectChanges()` with multiple bonus types
  - [ ] Integration test: Single standard Material + highest-wins resolution
  - [ ] Integration test: Multiple standard Materials taking highest per field
  - [ ] Integration test: Standard + Broken + Masterwork all applying (different bonus types)
  - [ ] Integration test: History tracking accuracy
  - [ ] Integration test: Penalties always applied
  - [ ] Edge case: untyped bonuses from multiple sources (should sum)
  - [ ] Edge case: dodge bonuses from multiple sources (should sum)
  - [ ] Edge case: zero-value changes should not appear in history
  
- [ ] **Documentation & Code Comments**:
  - [ ] Document Material pattern (AE → buildChanges() → applyActiveEffects() → history)
  - [ ] Explain bonus type system and why it's hidden from UI
  - [ ] Document that Phase 5 will reuse this exact stacking engine for actors
  - [ ] Leave TODO comments where Phase 4 (Compendium) will add broken/masterwork content

---

## 2.1 The Material Pattern

This is the foundational pattern used by all "modifier" types throughout the system:

1. An Active Effect lives on a parent document (item or actor)
2. In its `prepareDerivedData()`, it reads its own system data (e.g., material properties)
3. It calls `buildChanges()` to generate `system.changes[]` — an array of `Dnd35eEffectChangeData` entries
4. The parent document's `applyActiveEffects()` applies these changes with stacking resolution
5. **Source of truth stays on the effect** — the changes are regenerated every preparation cycle

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

## 2.2 Two-Phase Application

- **Initial phase** (during `prepareEmbeddedDocuments`): Changes that other calculations depend on
- **Final phase** (during `prepareDerivedData`): Changes that depend on other calculations

Each change specifies which phase it runs in and whether it targets the parent Item or the owning Actor.

## 2.3 Effect Change Data

```typescript
interface Dnd35eEffectChangeData extends foundry.EffectChangeData {
  target: 'Actor' | 'Item';
  isSystem: boolean;        // Generated by system code vs user-configured
  phase: 'initial' | 'final';
  bonusType?: BonusType;    // Stacking resolution — see §2.5
}
```

## 2.4 Multiple Materials & Stacking Behavior

A weapon can have multiple standard Material AEs. Effects from different materials **do not stack per field** — the stacking engine (§2.5) resolves conflicts by taking the highest value per field across all materials.

**Example**: Material A (+100 max HP, +10 hardness) + Material B (+85 max HP, +20 hardness) → the weapon gets +100 max HP and +20 hardness. Each field independently picks the best value.

All standard Material AE changes use `bonusType: 'material'`. The stacking engine groups changes by `{ targetField, bonusType }` and applies highest-wins for the `'material'` type — this is generic stacking behavior, not material-specific code.

### Single-Material Enforcement (System Setting)

A system setting (`game.settings: dnd35e.combat.enforceSingleMaterial`) controls whether items are limited to one standard Material AE (subtypes `'broken'` and `'masterwork'` are always allowed regardless):
- **Enabled (default)**: Adding a second standard Material AE warns the user and can optionally block it. The UI shows a validation warning but still allows it for edge cases.
- **Disabled**: Multiple standard materials are allowed freely. Stacking resolution handles the per-field highest-wins automatically.

This is a guardrail, not a hard constraint — the stacking engine handles multiple materials correctly regardless of this setting.

## 2.5 Bonus Type Stacking Engine

The stacking engine is the core resolution system for all AE changes across the entire system. Bonus type is a **system implementation detail not exposed to the UI** — it is sometimes auto-set based on effect type and subtype.

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

### 2.5.1 Stacking Algorithm Implementation with History Tracking

The `resolveActiveEffectChanges()` function resolves bonuses and **tracks detailed history** of what was applied, what was ignored, and why. This history serves two consumers:

1. **Item/Actor `overrides`** — enriched with stacking detail so field controls can show *why* a field has its current value (which effects contributed, which were rejected). The existing `Override` type on `ItemDnd35e` is extended to include stacking metadata.
2. **Chat cards** — when an action is executed (Phase 8), the stacking resolution for that specific calculation is passed to the chat card builder. Foundry preserves chat cards, so history is durable without persisting it on the document.

**No separate `_stackingHistory` property.** The existing `overrides` property on `ItemDnd35e` (and later `ActorDnd35e`) is the single source of truth for "what effects are currently modifying this field." We enrich it, not duplicate it.

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
  values: { [field: string]: number };
  history: ChangeHistory[];
}

export function resolveActiveEffectChanges(
  changes: Dnd35eEffectChangeData[],
  penalties: Dnd35eEffectChangeData[]
): ResolvedChanges {
  const resolved: { [field: string]: number } = {};
  const history: ChangeHistory[] = [];

  // Group changes by { field, bonusType }
  const grouped = new Map<string, Dnd35eEffectChangeData[]>();
  for (const change of changes) {
    const key = `${change.key}|${change.bonusType ?? 'untyped'}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(change);
  }

  // Process each field
  const fieldsByName = new Map<
    string,
    {
      types: Map<BonusType, { applied: ChangeApplication; ignored: ChangeIgnored[] }>;
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
      // Always stack: sum all values
      const total = list.reduce((sum, c) => sum + c.value, 0);
      const applied: ChangeApplication = {
        source: list.map(c => c.label).join(' + '),
        value: total,
        bonusType: typedBonusType,
        reason: 'stacking (untyped/dodge)',
      };
      fieldData.types.set(typedBonusType, { applied, ignored: [] });
    } else {
      // Named types: only highest wins
      const sorted = [...list].sort((a, b) => b.value - a.value);
      const winner = sorted[0];
      const losers = sorted.slice(1);

      const applied: ChangeApplication = {
        source: winner.label,
        value: winner.value,
        bonusType: typedBonusType,
        reason: 'highest-wins',
      };

      const ignored: ChangeIgnored[] = losers.map(c => ({
        source: c.label,
        value: c.value,
        bonusType: typedBonusType,
        reason: `highest-wins rejected (${c.value} < ${winner.value})`,
      }));

      fieldData.types.set(typedBonusType, { applied, ignored });
    }
  }

  // Sum across all bonus types per field and build history
  for (const [fieldName, fieldData] of fieldsByName) {
    let sum = 0;
    const applied: ChangeApplication[] = [];
    const ignored: ChangeIgnored[] = [];

    for (const [, { applied: app, ignored: ign }] of fieldData.types) {
      applied.push(app);
      ignored.push(...ign);
      sum += app.value;
    }

    resolved[fieldName] = sum;
    history.push({
      field: fieldName,
      applied,
      ignored,
      total: sum,
    });
  }

  // Penalties always apply (always stack)
  const penaltyHistory = new Map<string, ChangeApplication[]>();
  for (const penalty of penalties) {
    if (!resolved[penalty.key]) resolved[penalty.key] = 0;
    resolved[penalty.key] += penalty.value; // value is already negative

    const penList = penaltyHistory.get(penalty.key) ?? [];
    penList.push({
      source: penalty.label,
      value: penalty.value,
      bonusType: 'penalty',
      reason: 'penalty (always applies)',
    });
    penaltyHistory.set(penalty.key, penList);
  }

  // Merge penalty history into results
  for (const [field, penApplied] of penaltyHistory) {
    const existing = history.find(h => h.field === field);
    if (existing) {
      existing.applied.push(...penApplied);
      existing.total = resolved[field];
    } else {
      history.push({
        field,
        applied: penApplied,
        ignored: [],
        total: resolved[field],
      });
    }
  }

  return { values: resolved, history };
}
```

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

### 2.5.3 Integration into Item.applyActiveEffects()

The existing `applyActiveEffects()` on `ItemDnd35e` already collects changes, applies them via `ActiveEffect.applyChange()`, and populates `this.overrides`. Phase 2 enriches this:

1. After standard Foundry change application, run stacking resolution on the collected changes
2. Write enriched `Override` entries (with `bonusType`, `stackResult`, `stackReason`) into `this.overrides`
3. The resolved values are already applied by Foundry's `applyChange()` — stacking resolution provides the *history* that enriches `overrides`

```typescript
// In ItemDnd35e.applyActiveEffects() — after existing change application loop:

// Run stacking resolution for history tracking
const { history } = resolveActiveEffectChanges(bonusChanges, penaltyChanges);

// Enrich overrides with stacking metadata
for (const entry of history) {
  const existing = this.overrides[entry.field] ?? [];
  for (const override of existing) {
    const applied = entry.applied.find(a => a.source === override.effectName);
    const ignored = entry.ignored.find(i => i.source === override.effectName);
    if (applied) {
      override.bonusType = applied.bonusType;
      override.stackResult = 'applied';
      override.stackReason = applied.reason;
    } else if (ignored) {
      override.bonusType = ignored.bonusType;
      override.stackResult = 'ignored';
      override.stackReason = ignored.reason;
    }
  }
}
```

**Note**: The actual resolved values are applied by Foundry's `ActiveEffect.applyChange()` (which handles ADD, MULTIPLY, OVERRIDE, UPGRADE, DOWNGRADE modes). The stacking engine's `resolveActiveEffectChanges()` runs *in parallel* to produce history — it doesn't replace Foundry's application logic.
```

### 2.5.4 Actor Integration (Phase 5)

Actors use the same stacking engine. Foundry's `Actor.applyActiveEffects()` already populates `actor.overrides` — Phase 5 enriches it with the same `bonusType`/`stackResult`/`stackReason` metadata, using the same pattern as items.

```typescript
// src/entities/actor/ActorDnd35e.mts (Phase 5)
// After Foundry's standard applyActiveEffects() populates this.overrides:
const { history } = resolveActiveEffectChanges(bonusChanges, penaltyChanges);
// Enrich this.overrides entries with stacking metadata (same pattern as ItemDnd35e)
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

| Subtype | Bonus Type (hidden) | Per-item limit | Created by |
|---------|----------|----------------|------------||
| `standard` | `'material'` (highest-wins) | 1 if setting enabled, unlimited otherwise | User (drag from compendium or manual) |
| `broken` | `'broken'` (penalty, always stacks) | 1 | System auto-creates from compendium (Phase 4) |
| `masterwork` | `'masterwork'` (highest-wins) | 1 | System or user from compendium (Phase 4) |

- Single-material enforcement (§2.4) enforces one of each type (one `standard`, one `broken`, one `masterwork`) per item, or no enforcement at all
- The `materialSubtype` field is user-editable at any time; since `buildChanges()` is regenerated during every preparation cycle, changes to this field are reflected immediately

### Deferred to Phase 4

The actual broken/masterwork **content** (default compendium entries) and **sync logic** (`isBroken` ↔ Broken AE, `isMasterwork` ↔ Masterwork AE) require the compendium pipeline and are implemented in Phase 4. Phase 2 only establishes the subtype field and ensures the stacking engine treats each subtype's bonus type correctly.

---

## 2.7 Strategic Note: Actor Integration Timing

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

## 2.8 Files

| Action | Path |
|--------|------|
| Verify | `src/entities/activeEffects/material/` — completeness |
| Create | `src/helpers/stacking.mts` — `resolveActiveEffectChanges()` utility returning `{ values, history }`; interfaces: `ResolvedChanges`, `ChangeHistory`, `ChangeApplication`, `ChangeIgnored` |
| Modify | `src/entities/items/baseItem/ItemDnd35e.mts` — extend `Override` type with `bonusType?`, `stackResult?`, `stackReason?`; enrich `overrides` in `applyActiveEffects()` with stacking metadata |
| Modify | `src/entities/activeEffects/material/data/MaterialSystemModel.mts` — add `materialSubtype` field; ensure `buildChanges()` includes source labels for history tracking |
| Modify | All effect sheets — **NEVER expose `bonusType` field to UI for Material AEs**, auto-set it based on subtype |
| Create | `src/constants/bonusTypes.mts` — BonusType with only `'material' | 'broken' | 'masterwork'`; add new types only when a consumer exists |
| Create | System setting `dnd35e.combat.enforceSingleMaterial` |
| Modify | `HasActiveEffectsNotification.vue` — display enriched stacking info (bonusType, stackResult, stackReason) in tooltip |
| Verify | Effect sheet Vue components |
| Test | Unit tests for `resolveActiveEffectChanges()` — verify correct application/rejection of bonuses per stacking rules; validate history accuracy |
| Document | The Material pattern for reuse in later phases; note that Material AE bonus types are system-internal and not exposed to UI |

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

## 2.9 Execution Plan

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
  verify: "buildChanges() output includes bonusType matching subtype; changes include source label (effect name) for history"

task_B3:
  name: "Verify bonusType hidden from Material AE sheet UI"
  routing: Flexible
  depends_on: [B2]
  verify: "Effect sheet shows materialSubtype dropdown; bonusType field not visible anywhere in Material AE UI"
```

### Track C: Integration (Lead dev, after A+B merge)

```yaml
task_C1:
  name: "Extend Override type + enrich overrides in applyActiveEffects()"
  routing: Lead dev
  depends_on: [A2, B2]
  blocking: [C2, C3]
  verify: "After applyActiveEffects(), this.overrides entries include bonusType, stackResult, stackReason; Override type updated in ItemDnd35e.mts"

task_C2:
  name: "Update HasActiveEffectsNotification.vue for enriched tooltips"
  routing: Jr dev
  depends_on: [C1]
  verify: "Tooltip shows bonusType and stack result; ignored effects shown dimmed or with rejection reason"

task_C3:
  name: "Create single-material enforcement setting"
  routing: Jr dev
  depends_on: [C1]
  verify: "Setting dnd35e.combat.enforceSingleMaterial exists; when enabled, adding second standard Material AE shows validation warning; broken/masterwork always allowed"
```

### Track D: Testing & Documentation (Flexible, after C)

```yaml
task_D1:
  name: "Unit tests for resolveActiveEffectChanges()"
  routing: Jr dev or Pair
  depends_on: [A2]
  verify: "Tests cover: same-type highest-wins, untyped stacking, penalty always-apply, history accuracy, zero-value exclusion"

task_D2:
  name: "Integration tests for material stacking"
  routing: Jr dev or Pair
  depends_on: [C1]
  verify: "Single material applies; two materials → highest-wins per field; standard + broken + masterwork all apply (different bonus types); overrides enriched correctly"

task_D3:
  name: "Document Material pattern for reuse"
  routing: Flexible
  depends_on: [C1]
  verify: "Documentation covers: AE → buildChanges() → applyActiveEffects() → enriched overrides flow; bonus type is internal; Phase 5 reuse instructions"
```

### Parallelization Diagram

```
TRACK A: Stacking Engine     TRACK B: Material Subtype
────────────────────────      ────────────────────────
A1: Interfaces                B1: materialSubtype field
A2: Stacking rules            B2: subtype → bonusType mapping
A3: BonusType constants       B3: UI verification
        │                          │
        └──────────┬───────────────┘
                   ▼
        TRACK C: Integration
        ────────────────────
        C1: Enrich overrides in applyActiveEffects()
        C2: Update HasActiveEffectsNotification.vue
        C3: Single-material enforcement setting
                   │
                   ▼
        TRACK D: Testing & Docs
        ───────────────────────
        D1: Unit tests (can start after A2)
        D2: Integration tests
        D3: Documentation
```

**What can run in parallel:**
- Tracks A and B are **fully independent** — stacking engine knows nothing about material subtypes
- D1 (unit tests) can start as soon as A2 completes, parallel with Track B
- C2 and C3 are independent after C1

**Routing summary:**
- **Lead dev**: A1, A2, C1
- **Jr dev**: B1, B2, C2, C3, D1, D2
- **Flexible**: A3, B3, D3

---

## 2.10 Risks & Blockers

```yaml
risk_1:
  name: "Stacking resolution runs parallel to Foundry's applyChange(), not replacing it"
  impact: "Foundry's ActiveEffect.applyChange() handles the actual value application (ADD/MULTIPLY/OVERRIDE/UPGRADE/DOWNGRADE). Our stacking engine produces history metadata only — it must not conflict with or duplicate Foundry's resolution."
  mitigation: "Stacking engine runs after Foundry's change application loop. It reads the same changes but only produces enrichment data for overrides. Values are applied by Foundry, history is applied by us."
  status: "Design validated — applyActiveEffects() already applies changes via Foundry, we append metadata after."

risk_2:
  name: "Override enrichment must not break HasActiveEffectsNotification.vue"
  impact: "Adding new optional fields (bonusType, stackResult, stackReason) to Override could break existing UI if it expects only the current 4 fields"
  mitigation: "Fields are optional (?). Existing UI reads effectName, value, type — new fields are additive. HasActiveEffectsNotification.vue updated in task C2 to display them."

risk_3:
  name: "BonusType enum extensibility"
  impact: "Starting with 3 types. Later phases add more. Stacking engine must handle unknown types gracefully."
  mitigation: "Default stacking rule for any named bonusType is highest-wins. New types don't need stacking engine changes unless they have special rules (like dodge stacking). Add types to the union when a consumer exists."
```
