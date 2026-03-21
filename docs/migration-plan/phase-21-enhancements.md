# Phase 21: Enhancements (Active Effect Type)

> **Status**: Not started  
> **Dependencies**: Phase 10  
> **Goal**: Weapon and armor enchantments as Active Effects (like Material).

---

## 21.1 Enhancement Active Effect Type

```
EnhancementSystemModel extends Dnd35eActiveEffectSystemModel
├── enhancementType: 'weapon' | 'armor' | 'shield' | 'misc'
├── enhancementBonus: number (+1 through +5)
├── price: Price
├── specialAbilities: string[] ("flaming", "keen", "vorpal")
├── casterLevel: number
└── changes: auto-generated from enhancement data
```

## 21.2 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/activeEffects/enhancement/` |
| Modify | `system.json` — register enhancement effect type |
