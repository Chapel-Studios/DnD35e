# Phase 10: Equipment, Loot & Bonus Stacking

> **Status**: Not started  
> **Dependencies**: Phase 4, Phase 9  
> **Goal**: Armor, shield, and loot item types. Armor/shields affect AC via generated AE changes. **First introduction of bonus type stacking.**

---

## 10.1 Equipment Item Type

```
EquipmentSystemModel extends EquippableItemSystemModel
├── equipmentType: 'armor' | 'shield' | 'wondrous' | 'clothing'
├── equipmentSubtype: string (light/medium/heavy for armor; buckler/light/heavy/tower for shield)
├── armorBonus: number
├── shieldBonus: number  
├── maxDexBonus: number | null
├── armorCheckPenalty: number
├── spellFailureChance: number
├── speed30: number (movement in 30ft base)
├── speed20: number (movement in 20ft base)
└── enhancement: number (magic bonus — applied via Enhancement AE in Phase 21)
```

## 10.2 Equipment → AC via Generated AE Changes (Material Pattern)

The equipment item's `prepareDerivedData()` generates system changes targeting the actor:
- `system.attributes.ac.armorBonus` ADD with `bonusType: 'armor'`
- `system.attributes.ac.shieldBonus` ADD with `bonusType: 'shield'`
- Max Dex cap as a special change type

## 10.3 Bonus Type Stacking (First Implementation)

This is the first time two things can apply bonuses of a named type to the same field. Extend the AE change data:

```typescript
interface Dnd35eEffectChangeData extends foundry.EffectChangeData {
  target: 'Actor' | 'Item';
  isSystem: boolean;
  bonusType?: BonusType;  // NEW — 'armor', 'shield', 'enhancement', 'dodge', 'untyped', etc.
  phase: 'initial' | 'final';
}
```

During `applyActiveEffects()`:
- Group changes by `{ targetField, bonusType }`
- Dodge + untyped: always stack (sum all)
- All other types: only apply the highest value
- Penalties: always apply

Start with a small set: `'armor' | 'shield' | 'natural' | 'dodge' | 'deflection' | 'enhancement' | 'untyped' | 'penalty'`. Expand the enum as more bonus types are needed.

## 10.4 Loot Item Type

```
LootSystemModel extends PhysicalItemSystemModel
├── lootType: 'gear' | 'ammo' | 'tradeGoods' | 'misc' | 'container'
├── quantity: number
└── containerCapacity: number | null (for containers)
```

## 10.5 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/equipment/` — Equipment class, data model, sheet |
| Create | `src/entities/items/loot/` — Loot class, data model, sheet |
| Expand | `Dnd35eEffectChangeData` — add `bonusType` field |
| Expand | Actor `applyActiveEffects()` — bonus type stacking logic |
| Expand | Actor `prepareDerivedData()` — AC calculation from equipped armor/shield |
| Create | `src/constants/bonusTypes.mts` |
| Modify | `system.json` — register equipment & loot types |
