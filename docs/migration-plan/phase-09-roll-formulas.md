# Phase 9: Roll Formula Integration

> **Status**: Not started  
> **Dependencies**: Phase 6  
> **Goal**: Formalize how roll formulas are constructed, resolved, and how roll data is assembled across the system. Ensure all formulas use consistent `@`-variable paths and that roll data is properly inherited from actor → item → action.

---

## 9.1 Roll Data Assembly

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

## 9.2 Formula Resolution Pipeline

1. **Author time**: User writes formula in a field (e.g., `"@abilities.str.mod + @bab"`)
2. **Intellisense**: The existing formula/intellisense system provides autocomplete for `@`-variables
3. **Prep time**: `prepareDerivedData()` resolves formulas that are needed for derived values
4. **Roll time**: `Roll.fromTerms()` resolves remaining formulas with full roll data context
5. **Error handling**: Invalid formulas surface warnings via the preparation warning system (not blocking)

## 9.3 Consistent @-Variable Paths

Establish and document the canonical `@`-variable paths:

| Path | Value |
|------|-------|
| `@abilities.str.mod` | Strength modifier |
| `@abilities.str.total` | Total Strength score |
| `@attributes.bab.total` | Base attack bonus |
| `@attributes.ac.normal` | Normal AC |
| `@attributes.saves.fort.total` | Fort save total |
| `@attributes.init.total` | Initiative total |
| `@details.level` | Character level |
| `@skills.perception.total` | Skill total |
| `@size.attackMod` | Size attack modifier |
| `@item.enhancement` | Item's enhancement bonus |

## 9.4 Formula Error Surfacing

- `FormulaFormGroup` handles field-level validation in Vue sheets
- System-level formula evaluation errors in `prepareDerivedData()` need a collection mechanism
- Preparation warnings: accumulate errors without blocking data prep, display in sheet UI

```typescript
// On actor/item during prepareDerivedData
this._preparationWarnings.push({
  field: 'system.damage.formula',
  message: 'Invalid formula: @nonexistent.field',
  severity: 'warning'
});
```

## 9.5 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/helpers/rollData.mts` — roll data assembly utilities |
| Create | `src/constants/rollVariables.mts` — canonical @-variable documentation |
| Expand | Actor `getRollData()` — structured roll data assembly |
| Expand | Item `getRollData()` — inherit actor data + add item fields |
| Create | Preparation warnings infrastructure on base document classes |
| Document | @-variable paths for intellisense and user documentation |
