# Phase 1: Item Foundation (Weapon PoC)

> **Status**: 🔶 ~75% complete  
> **Dependencies**: None  
> **Goal**: A single weapon item type that can be created, opened, edited, and saved. Establishes the data model, Vue sheet, and component composition patterns.

---

## What's Done

- Weapon data model with `defineSchema()`
- PhysicalItem → EquippableItem → Weapon component chain  
- Vue weapon sheet (basic)
- Identifiable mixin with `system.slug` for tracked/identified states
- Formula-driven name computation

## What Remains

- Attack section placeholder needs real fields (attack bonus, damage — prep for Phase 6)
- Missing Vue sheet components (some sections incomplete)
- Verify all weapon fields from D35E are accounted for in the schema

---

## 1.1 Data Model

```
WeaponSystemModel extends EquippableItemSystemModel
├── weaponType: 'simple' | 'martial' | 'exotic' | 'natural' | 'firearm'
├── weaponSubtype: 'light' | 'oneHanded' | 'twoHanded' | 'ranged'
├── damage: { formula, type, critRange, critMultiplier }
├── range: number | null
├── proficiencyGroup: string
├── size: SizeCategory
└── (attack fields: stub for Phase 6)
```

## 1.2 Component Chain

```
CoreMixin
  └── PhysicalItem (weight, price, hardness, HP)
        └── EquippableItem (equipment slots, equipped state)
              └── Weapon
```

Each layer adds to `defineSchema()` and `prepareDerivedData()`.

## 1.3 Vue Sheet

- **Header**: Name, type, portrait/icon
- **Tabs**: Details, Effects, Description
- **Details tab**: Weapon type, subtype, damage, critical, range, physical properties
- **Effects tab**: Active effects on the weapon (Material, Enhancement)
- All strings via i18n keys (audit in Phase 3)

## 1.4 Files

| Action | Path |
|--------|------|
| Verify | `src/entities/items/weapon/` — data model completeness |
| Verify | `src/vue/apps/item/weapon/` — sheet completeness |
| Verify | `src/entities/components/` — component chain |
| Audit | Missing attack placeholder fields |
