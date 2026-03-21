# Phase 6: Basic Combat — Simple Attack

> **Status**: Not started  
> **Dependencies**: Phase 4, Phase 5  
> **Goal**: A token can make a melee weapon attack against another token. This is a **simple roll method on the weapon** — not the full Action System yet. Establishes roll classes, chat cards, and basic attack resolution.

---

## 6.1 Attack Data on Weapon

Expand the weapon data model with functional attack/damage computation:

```
weaponDamage (existing) — enhance:
├── attackFormula: string (e.g., "@bab + @abilities.str.mod + @size.attackMod")
├── damageFormula: string (e.g., "@weaponDamage.damageRoll + @abilities.str.mod")
├── critRange: string → derived: critThreshold number (e.g., "19" → 19)
├── critMultiplier: number
└── rangeIncrement: number | null
```

## 6.2 Simple Attack Method

Start with `weapon.rollAttack(target)` — a method on the Weapon item class:
1. Calculates attack bonus: BAB + ability mod + size mod + enhancement + misc
2. Prompts with a Vue dialog for situational modifiers
3. Rolls d20 + attack bonus vs target AC
4. On hit: rolls weapon damage
5. Posts results to chat

This will be **refactored into the Action System** in Phase 18, but for now we need working combat.

## 6.3 Roll Classes

Create custom roll classes (following dnd5e pattern):

- `D20Roll` — handles auto-crit on nat 20, auto-fumble on nat 1
- `DamageRoll` — handles critical multiplier (multiply all dice, 3.5e style), damage type tagging

## 6.4 Chat Message Cards

- Attack result card: attacker, weapon, target, roll result, hit/miss
- Damage result card: damage dice, damage type, total
- Clickable damage application button (apply to target)

## 6.5 Files to Create/Modify

| Action | Path |
|--------|------|
| Expand | Weapon data model — attack bonus computation in `prepareDerivedData()` |
| Create | `src/dice/D20Roll.mts` — custom d20 roll |
| Create | `src/dice/DamageRoll.mts` — custom damage roll with crit multiplier |
| Create | `src/combat/attack.mts` — attack resolution logic |
| Create | Chat message templates for attack/damage results |
| Expand | Actor — derive BAB from base value, ability mods for attack formulas |
