# Phase 7: Combat Tracker

> **Status**: Not started  
> **Dependencies**: Phase 6  
> **Goal**: Multiple tokens can participate in combat via Foundry's combat tracker. Initiative works, turns/rounds progress.

---

## 7.1 Initiative

- Initiative formula: `1d20 + @attributes.init.total`
- Init total = DEX mod + misc bonuses (from feats/items via effects later)
- Tie-breaking: Higher DEX wins (Foundry supports custom tie-breaking)

## 7.2 Combat Document

- `CombatDnd35e` extending `Combat`
- Track round count for duration effects
- Support for: delay, ready action, surprise round (stubs for future)

## 7.3 Combatant Document

- `CombatantDnd35e` extending `Combatant`
- Track: flat-footed until acted
- Action economy display (standard/move/swift/free/full-round) — visual only for now

## 7.4 Turn Flow

- Start of turn: process start-of-turn effects (duration tracking — stubs for Phase 16)
- During turn: allow weapon attack (Phase 6)
- End of turn: process end-of-turn effects
- Next combatant

## 7.5 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/combat/CombatDnd35e.mts` |
| Create | `src/combat/CombatantDnd35e.mts` |
| Modify | Registration — register combat/combatant document classes |
| Expand | Actor — initiative derivation |
