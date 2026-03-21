# Phase 11: Features & Feats

> **Status**: Not started  
> **Dependencies**: Phase 4  
> **Goal**: A `feat` item type that represents feats, class features, racial traits, and special abilities. Feats apply passive bonuses via the Material pattern (generated AE changes).

---

## 11.1 Feat Item Type

```
FeatSystemModel extends ItemSystemModelBase
├── featType: 'feat' | 'classFeat' | 'trait' | 'racial' | 'spellSpecialization'
├── activation: { type: 'passive' | 'free' | 'swift' | 'move' | 'standard' | 'fullRound', cost: number }
├── uses: { value: number, max: number, per: 'day' | 'encounter' | 'week' | 'unlimited' } | null
├── prerequisites: string (human-readable)
├── source: string (book reference)
└── (passive bonuses generated as AE changes in prepareDerivedData)
```

## 11.2 Feat as Effect Source

When a feat is on an actor, its passive bonuses follow the Material pattern:
- Feat's `prepareDerivedData()` generates system changes targeting the ACTOR
- Changes include bonus type for stacking rules
- Applied during actor's `applyActiveEffects()` phase
- Example: Weapon Focus generates `{ key: 'system.weaponFocus.longsword', mode: ADD, value: 1, bonusType: 'untyped' }`

**Conditional bonuses** (e.g., "+2 attack when flanking") are stored but flagged with a condition. These are **not applied during data prep** — they're checked at roll time in the attack dialog. This is a precursor to the predicate system that may evolve later.

## 11.3 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/feat/` — Feat class, data model, sheet |
| Create | Vue components for feat sheet |
| Modify | Actor sheet — Features tab listing feats by type |
| Modify | `system.json` — register feat type |
