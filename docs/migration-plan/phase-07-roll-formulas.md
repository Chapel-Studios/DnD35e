# Phase 7: Roll Formulas & Custom Rolls

**Status**: 📋 Outlined (FormulaFamiliar system, action formulas)

> **Milestone**: POC  
> **Dependencies**: Phase 5  
> **Goal**: Formalize how roll formulas are constructed, resolved, and how roll data is assembled across the system. Ensure all formulas use FormulaFamiliar `#context.property` syntax with proper context inheritance (actor → item → action). Create D20Roll and DamageRoll custom roll classes used by Phase 8 (Action System).

> **Action System note**: This phase creates all the formula plumbing that Phase 8 consumes. D20Roll handles auto-crit/fumble confirmation. DamageRoll handles critical multipliers and damage type tagging. FormulaFamiliar contexts declared here (`#self.*`, `#item.*`) are extended with `#action.*` and `#target.*` in Phase 8.

---

## 6.1 Roll Data Assembly

Define the canonical shape of roll data at each level:

```typescript
// Actor roll data — the base context
interface ActorRollData {
  abilities: Record<AbilityKey, { mod: number, total: number, base: number }>;
  attributes: {
    bab: { total: number };
    ac: { normal: number, touch: number, flatFooted: number };
    saves: Record<SaveKey, { total: number }>;
    init: { total: number };
    // ...
  };
  details: { level: number, size: SizeCategory };
  skills: Record<SkillKey, { total: number, ranks: number }>;
  // size attack/grapple modifiers
  size: { attackMod: number, grappleMod: number, acMod: number };
}

// Item roll data — extends actor data with item-specific fields
interface ItemRollData extends ActorRollData {
  item: {
    // item-specific fields available as @item.xxx
  };
}
```

## 6.2 Formula Resolution Pipeline

1. **Author time**: User writes formula in a field (e.g., `"#self.abilities.str.mod + #self.bab"`)
2. **FormulaFamiliar**: Schema walker provides autocomplete for `#context.property` paths
3. **Prep time**: `prepareDerivedData()` resolves formulas that are needed for derived values via `Dnd35eDocumentMixin._buildFormulaContexts()`
4. **Roll time**: `Roll.fromTerms()` resolves remaining formulas with full roll data context (including `#target.*` added at execution time)
5. **Error handling**: Invalid formulas surface warnings via the preparation warning system (not blocking)

## 6.3 FormulaFamiliar Context Declarations

Establish the canonical formula contexts used throughout the system:

| Context | Provider | Available When |
|---------|----------|---------------|
| `#self.*` | Actor's `getRollData()` | Always on actor-owned items |
| `#item.*` | Item's system data | Always on item-owned actions |
| `#action.*` | ActionDataModel fields | During action execution (Phase 8) |
| `#target.*` | Target actor's `getRollData()` | During action execution with a target (Phase 8) |

```typescript
// FormulaFamiliar schema registration (per document type)
Dnd35eDocumentMixin.registerFormulaContexts("Actor", "character", {
  self: CharacterDataModel.schema,  // generates #self.abilities.str.mod etc.
});

Dnd35eDocumentMixin.registerFormulaContexts("Item", "weapon", {
  self: CharacterDataModel.schema,
  item: WeaponDataModel.schema,     // generates #item.enhancement etc.
});
```

## 6.4 Consistent Formula Paths

Establish and document the canonical `#context.property` paths:

| Path | Value |
|------|-------|
| `#self.abilities.str.mod` | Strength modifier |
| `#self.abilities.str.total` | Total Strength score |
| `#self.bab` | Base attack bonus |
| `#self.attributes.ac.normal` | Normal AC |
| `#self.saves.fort.total` | Fort save total |
| `#self.attributes.init.total` | Initiative total |
| `#self.details.level` | Character level |
| `#self.skills.perception.total` | Skill total |
| `#self.size.attackMod` | Size attack modifier |
| `#item.enhancement` | Item's enhancement bonus |
| `#target.attributes.ac.normal` | Target's AC (at execution time) |
| `#action.attackBonus` | Action's computed attack bonus |

## 6.5 Custom Roll Classes

These replace Foundry's base `Roll` class for system-specific rolling:

### D20Roll
Used by all attack rolls, skill checks, ability checks, and saves.

```typescript
class D20Roll extends Roll {
  // Auto-detect natural 20 (critical threat) and natural 1 (auto-miss)
  get isCriticalThreat(): boolean;
  get isFumble(): boolean;

  // Confirmation roll for critical threats
  async confirmCritical(targetAC: number): Promise<boolean>;

  // Modifiers applied before evaluation
  situationalModifiers: RollModifier[];
}
```

### DamageRoll
Used by all damage calculations.

```typescript
class DamageRoll extends Roll {
  // Critical multiplier (×2, ×3, etc.)
  criticalMultiplier: number;

  // Damage type tagging (slashing, piercing, fire, etc.)
  damageTypes: DamageType[];

  // Apply critical multiplication (only multiplies base dice, not flat bonuses per SRD)
  applyCritical(): DamageRoll;
}
```

> **Note**: These classes were originally planned in the old Phase 7 (Basic Combat), which has been merged. The simple `weapon.rollAttack()` concept is superseded by Phase 8's action chains — but D20Roll and DamageRoll remain as the low-level roll infrastructure the execution engine uses.

## 6.6 Formula Error Surfacing

- `FormulaFormGroup` handles field-level validation in Vue sheets
- System-level formula evaluation errors in `prepareDerivedData()` need a collection mechanism
- Preparation warnings: accumulate errors without blocking data prep, display in sheet UI

```typescript
// On actor/item during prepareDerivedData
this._preparationWarnings.push({
  field: 'system.damage.formula',
  message: 'Invalid formula: #self.nonexistent',
  severity: 'warning'
});
```

## 6.7 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/dice/D20Roll.mts` — d20 roll with crit/fumble detection |
| Create | `src/dice/DamageRoll.mts` — damage roll with crit multiplier and types |
| Create | `src/helpers/rollData.mts` — roll data assembly utilities |
| Create | `src/constants/rollVariables.mts` — canonical formula path documentation |
| Expand | Actor `getRollData()` — structured roll data assembly |
| Expand | Item `getRollData()` — inherit actor data + add item fields |
| Expand | FormulaFamiliar context registrations per document type |
| Create | Preparation warnings infrastructure on base document classes |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 7 has not started)

### ❌ Not Started (All Tasks for Phase 7)

**Roll Data Structure & Interfaces:**
- [ ] Create `src/types/rollData.d.ts` with interfaces:
  - `ActorRollData` (abilities with mod/total/base, attributes, saves, skills, size mods)
  - `ItemRollData extends ActorRollData` (adds item-specific fields)
  - `ActionRollData extends ItemRollData` (adds action-specific fields, Phase 8 will use)
  - `TargetRollData extends ActorRollData` (target's roll data, Phase 8 will use)
- [ ] Document each field's calculation/source
- [ ] Test: Interfaces compile without errors

**Actor.getRollData() Implementation:**
- [ ] Override `getRollData()` on `ActorDnd35e`
- [ ] Populate abilities: for each (str-cha), include base score, derived mod, derived total
- [ ] Populate attributes: bab, ac (normal/touch/flatFooted), saves (fort/ref/will), init
- [ ] Populate details: level, alignment
- [ ] Populate skills: each skill's total + rank count (stub for Phase 14 expansion)
- [ ] Populate size: sizeCategory and derived attackMod/grappleMod/acMod
- [ ] Test: `getRollData()` includes all expected fields
- [ ] Test: Values are correct for a test character

**Item.getRollData() Implementation:**
- [ ] Override `getRollData()` on `ItemDnd35e`
- [ ] Call parent actor's `getRollData()` to inherit all actor fields
- [ ] Add item-specific fields:
  - Weapon: enhancement, damage formula, critical range, critical multiplier
  - Equipment: armor bonus, shield bonus, ACP, spell failure
- [ ] Test: `getRollData()` includes both actor + item fields
- [ ] Test: Item fields override actor fields if names conflict (shouldn't happen, but verify logic)

**FormulaFamiliar Context Registration:**
- [ ] Create schema walker that traverses DataModel schema to build context autocomplete
- [ ] Register `#self.*` contexts mapping to actor's `getRollData()` schema
- [ ] Register `#item.*` contexts mapping to item's system schema
- [ ] Register `#action.*` contexts (placeholder, Phase 8 will populate)
- [ ] Register `#target.*` contexts (placeholder, Phase 8 will populate)
- [ ] Implement autocomplete in Vue formula input fields:
  - User types `#self.` → show available abilities, attributes, skills
  - User types `#item.` → show available item fields
- [ ] Test: Autocomplete suggestions are accurate
- [ ] Test: Invalid paths are rejected or warned

**Canonical Formula Paths Documentation:**
- [ ] Create `src/constants/formulaPaths.mts` documenting all valid `#context.property` paths
- [ ] Include examples for each:
  - Ability modifiers: `#self.abilities.str.mod`
  - Attack bonus: `#self.bab + #self.abilities.str.mod + #self.size.attackMod`
  - AC: `10 + #self.abilities.dex.mod - #item.armorCheckPenalty`
  - Save DC: `10 + #self.details.level + #self.abilities.wis.mod`
- [ ] Document context inheritance hierarchy (actor → item → action)
- [ ] Update README/docs with formula examples for users

**D20Roll Custom Class** in `src/dice/D20Roll.mts`:
- [ ] Extend Foundry's `Roll` class
- [ ] Implement `isCriticalThreat` getter: true if die result is natural 20
- [ ] Implement `isFumble` getter: true if die result is natural 1
- [ ] Implement `confirmCritical(targetAC: number): Promise<boolean>`
  - Roll confirmation d20
  - Compare to target AC or DC
  - Return true if confirm (≥ 11 vs AC by default)
- [ ] Add `situationalModifiers: RollModifier[]` array for temporary bonuses
- [ ] Apply modifiers correctly (add to d20 result, not total dice count)
- [ ] Test: Natural 20 detected, natural 1 detected
- [ ] Test: Confirmation roll works
- [ ] Test: Modifiers applied correctly

**DamageRoll Custom Class** in `src/dice/DamageRoll.mts`:
- [ ] Extend Foundry's `Roll` class
- [ ] Add `criticalMultiplier: number` field (2, 3, 4, etc.)
- [ ] Add `damageTypes: DamageType[]` field (slashing, piercing, bludgeoning, fire, etc.)
- [ ] Implement `applyCritical(): DamageRoll`
  - Multiply dice count by critical multiplier (only dice, not flat bonuses per SRD)
  - Re-evaluate roll with new multiplier
  - Return new DamageRoll with updated total
- [ ] Test: Critical multiplier applied to dice only
- [ ] Test: Flat bonuses not multiplied
- [ ] Test: Damage types tagged correctly

**Preparation Warnings Infrastructure:**
- [ ] Add `_preparationWarnings: PreparationWarning[]` to `Dnd35eDocumentMixin`
- [ ] Define `PreparationWarning` interface: `{ field, message, severity: 'warning' | 'error' }`
- [ ] Collect warnings during `prepareDerivedData()` without blocking prep
- [ ] Display warnings in sheet UI (red/yellow banner or console summary)
- [ ] Implement formula validation that generates warnings:
  - Missing context path → warning
  - Invalid syntax → warning
  - Division by zero → warning
- [ ] Test: Warnings collected and displayed
- [ ] Test: Prep completes even with warnings

**Formula Error Handling:**
- [ ] Implement formula evaluation with try-catch:
  - Catch evaluation errors (missing variables, syntax errors)
  - Generate warning instead of throwing
  - Fall back to default value (0 or item's static value)
- [ ] Test: Invalid formula doesn't crash sheet
- [ ] Test: User sees warning message
- [ ] Test: Field shows fallback value

**Vue Form Component - Formula Input:**
- [ ] Create `FormulaFormGroup.vue` component for formula fields
- [ ] Show formula input field
- [ ] Show autocomplete dropdown on `#` key press
- [ ] Show validation status (green = valid, red = invalid)
- [ ] Show contextual help: "Formula must start with #self, #item, #action, or #target"
- [ ] Test: Autocomplete works
- [ ] Test: Validation works
- [ ] Test: Complex formulas with operators work

**Integration Testing:**
- [ ] Unit test: Roll data assembly for all document types
- [ ] Unit test: D20Roll crit/fumble detection
- [ ] Unit test: DamageRoll critical multiplication
- [ ] Integration test: Create weapon with formula damage (`1d8 + #self.abilities.str.mod`)
- [ ] Integration test: Resolve formula → get correct value based on actor stats
- [ ] Integration test: Change actor ability score → formula re-evaluates
- [ ] Integration test: Invalid formula generates warning
- [ ] Edge case: Formula with size modifier (`1d8 + #self.size.attackMod`)
- [ ] Edge case: Formula referencing nonexistent ability
- [ ] Smoke test: No console errors during prep

**Documentation & Examples:**
- [ ] Create role formula guide: "Writing Formulas in dnd35e"
  - Explain `#context.property` syntax
  - Show role data inheritance diagram
  - Provide 5-10 formula examples
  - Explain when formulas are evaluated
- [ ] Document D20Roll/DamageRoll for developers
- [ ] Add journal entry in dev world: "Roll Formula System"
- [ ] Create comment block in `rollData.mts` explaining architecture
