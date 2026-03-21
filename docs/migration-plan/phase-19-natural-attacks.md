# Phase 19: Natural & Special Attacks, Full Attack

> **Status**: Not started  
> **Dependencies**: Phase 18  
> **Goal**: Natural attacks using the Action System. Full attack as an action chain.

---

## 19.1 Attack Item Type (Natural Attacks)

```
AttackSystemModel extends ItemSystemModelBase
├── attackType: 'natural' | 'racial' | 'extraordinary' | 'supernatural'
├── naturalAttackType: 'bite' | 'claw' | 'gore' | 'slam' | 'sting' | 'tentacle' | null
├── secondaryAttack: boolean (-5 penalty, half STR)
├── reach: boolean
├── actions: ActionData[]  ← attack + damage actions via Action System
```

## 19.2 Full Attack as Action Chain

Full-attack is an action chain composed from equipped weapons:
- BAB progression generates iterative attacks: +11 → +11/+6/+1
- Chain: first weapon attack → second weapon attack → ... → off-hand → natural attacks
- Two-weapon fighting modifies the chain
- Generated dynamically based on equipped items and BAB

## 19.3 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/attack/` — class, data model, sheet |
| Create | Full-attack chain generator |
| Modify | `system.json` — register attack type |
