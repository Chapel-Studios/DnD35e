# Phase 17: Consumables

> **Status**: Not started  
> **Dependencies**: Phase 4  
> **Goal**: Potions, scrolls, wands, and other limited-use items.

---

## 17.1 Consumable Item Type

```
ConsumableSystemModel extends PhysicalItemSystemModel
├── consumableType: 'potion' | 'scroll' | 'wand' | 'dorje' | 'powerstone' | 'poison' | 'drug' | 'misc'
├── charges: { value, max } (wands: 50/50)
├── spell: { uuid, level, casterLevel } | null
├── uses: { value, max, autoDestroy }
├── activation: ActivationType
├── save: { type, dc } | null
└── effect: string
```

## 17.2 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/consumable/` — class, data model, sheet |
| Modify | `system.json` — register consumable type |
