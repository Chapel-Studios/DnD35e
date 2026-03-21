# Phase 22: Auras & Area Effects

> **Status**: Not started  
> **Dependencies**: Phase 5, Phase 16  
> **Goal**: Aura Active Effect type for radius-based effects.

---

## 22.1 Aura Active Effect Type

```
AuraSystemModel extends Dnd35eActiveEffectSystemModel
├── radius: number (feet)
├── affectsAllies, affectsEnemies, affectsSelf: boolean
├── active: boolean
└── changes: Dnd35eEffectChangeData[]
```

## 22.2 Implementation

- Token proximity detection or Foundry region system
- Apply/remove effects on tokens entering/leaving radius

## 22.3 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/activeEffects/aura/` |
| Modify | `system.json` — register aura effect type |
