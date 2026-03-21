# Phase 16: Buffs & Conditions

> **Status**: Not started  
> **Dependencies**: Phase 10  
> **Goal**: A `buff` Active Effect type for temporary bonuses, and a built-in condition system for standard D&D 3.5 conditions.

---

## 16.1 Buff Active Effect Type

**Buff is an Active Effect, not an Item.**

```
BuffSystemModel extends Dnd35eActiveEffectSystemModel
├── buffType: 'temporary' | 'permanent' | 'item' | 'shapechange' | 'misc'
├── bonusType: BonusType (for stacking — leverages Phase 10 infrastructure)
├── active: boolean
└── changes: Dnd35eEffectChangeData[] (targeting actor or item)
```

Duration uses Foundry's built-in `ActiveEffect.duration` (rounds, seconds, turns).

## 16.2 Conditions

Pre-defined conditions (25) as built-in Active Effects with predefined changes:
- Blind: -2 AC, lose DEX to AC, 50% miss chance
- Fatigued: -2 STR, -2 DEX
- Entangled, grappled, helpless, paralyzed, etc.

## 16.3 Actor Ability Score Expansion

Now add the full ability score model:
- `abilities.str.damage` / `drain` / `penalty`
- Applied via Active Effects from conditions/buffs

## 16.4 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/activeEffects/buff/` — class, data model, sheet |
| Create | `src/constants/conditions.mts` — all 25 conditions with AE change definitions |
| Expand | Actor ability score model — damage, drain, penalty |
| Expand | Bonus type enum — add all 27 D&D 3.5 bonus types |
| Modify | `system.json` — register buff effect type |
