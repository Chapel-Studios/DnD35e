# Phase 20: Advanced Actor Types

> **Status**: Not started  
> **Dependencies**: Phase 4  
> **Goal**: NPC, Trap, and Object actor types.

---

## 20.1 NPC Actor

- Same base data as character + CR, XP value, treasure type
- Simplified sheet variants: full, lite, monster, loot

## 20.2 Trap Actor

- AC, HP, hardness, trigger, attack/save DCs, reset, Disable Device DC

## 20.3 Object Actor

- AC, HP, hardness, break DC, size, minimal sheet

## 20.4 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/actors/npc/` |
| Create | `src/entities/actors/trap/` |
| Create | `src/entities/actors/object/` |
| Modify | `system.json` — register new actor types |
