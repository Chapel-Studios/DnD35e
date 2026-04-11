# Phase 1: Item Foundation (Weapon PoC)

**Status**: ✅ Complete

> **Milestone**: POC  
> **Dependencies**: None  
> **Goal**: A single weapon item type that can be created, opened, edited, and saved. Establishes the data model, Vue sheet, and component composition patterns.

---

## Completion Checklist

### ✅ Complete
- [x] Weapon data model with `defineSchema()` in `src/entities/items/weapon/WeaponSystemModel.mts`
- [x] Component chain: CoreMixin → PhysicalItem → EquippableItem → Weapon
- [x] Vue weapon sheet basic layout with tabs (Details, Effects, Description)
- [x] Identifiable mixin with `system.slug` for tracked/identified states
- [x] Formula-driven name computation with formula-familiar syntax support

### 🔶 In Progress (Remaining for Phase 1 Completion)
- [ ] **Vue sheet components**: Complete Details tab with weapon type/subtype selects, basic damage display, physical properties
- [ ] **Effects tab**: Display active effects list, allow effect creation/deletion
- [ ] **Data model audit**: Verify all D35E weapon fields are in schema (check old system for missing fields)
- [ ] **Component tests**: Test Vue sheet renders without errors, form inputs work

### ⏳ Deferred to Future Phases
- [ ] **Attack section fields** → Phase 8 (Combat): Add damage formula fields (`damage.formula`, `damage.type`, `damage.critRange`, `damage.critMultiplier`) when implementing attack mechanics
- [ ] **Inventory display** → Phase 5 (Inventory): Ensure weapon shows correctly in actor inventory once actors/inventory system exists
- [ ] **Drag-and-drop to inventory** → Phase 5 (Inventory): Implement drag-to-inventory for weapons once actor inventory management active
- [ ] **Drag-and-drop to character sheet slots** → Phase 5 (Inventory): Implement drag-to-equipment-slots once equipment system ready
- [ ] **Drag-and-drop to action bar** → Phase 8 (Combat): Implement drag-to-action-bar once action system established

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
└── (attack fields: stub for Phase 7)
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
