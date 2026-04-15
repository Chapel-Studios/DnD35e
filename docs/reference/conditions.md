# Conditions Reference

Quick-reference table for D&D 3.5e conditions and their mechanical effects as implemented in the system.

> For architecture details, see [Condition System](../architecture/condition-system.md).

---

## Condition Table

| Condition | Mechanical Effects | Recovery | Severity Chain |
|---|---|---|---|
| **Blinded** | -2 AC, lose DEX to AC, -4 attack rolls, half speed, -4 Perception/Search | Spell or natural healing | — |
| **Cowering** | -2 AC, lose DEX to AC, no actions | End of fear source | Fear chain (worst) |
| **Dazed** | No actions (can still defend), lose DEX to AC | 1 round (typically) | — |
| **Dazzled** | -1 attack, -1 Perception | End of light source | — |
| **Deafened** | -4 initiative, 20% spell failure (verbal), -4 Perception (hearing) | Spell or natural healing | — |
| **Entangled** | -2 attack, -4 DEX, half speed, concentration check to cast | Break free (STR/Escape Artist) | — |
| **Exhausted** | -6 STR, -6 DEX, half speed | 1 hour rest → Fatigued | Fatigue chain (severe) |
| **Fatigued** | -2 STR, -2 DEX, cannot run/charge | 8 hours rest | Fatigue chain (mild) |
| **Flat-Footed** | Lose DEX to AC, no AoO | Act in combat (first turn) | — |
| **Frightened** | -2 attack/saves/skills/ability checks, must flee | End of fear duration | Fear chain (moderate) |
| **Grappled** | -4 DEX, cannot move, limited actions | Break grapple | — |
| **Helpless** | Effective DEX 0 (-5 mod), can be coup de grâce'd | Varies by source | — |
| **Invisible** | +2 attack, +40 Hide, targets denied DEX to AC | Spell expiry or attack | — |
| **Nauseated** | Cannot attack, cast, or concentrate; move action only | End of source | Sickness chain (severe) |
| **Panicked** | -2 saves, flee, drop held items | End of fear source | Fear chain (severe) |
| **Paralyzed** | Cannot move or act, effective STR/DEX 0 | Spell expiry or save | — |
| **Petrified** | Turned to stone, unconscious | Stone to Flesh | — |
| **Pinned** | Cannot move, -4 AC, limited actions | Break pin (grapple check) | — |
| **Prone** | -4 melee attack, +4 AC vs ranged, -4 AC vs melee | Stand up (move action) | — |
| **Shaken** | -2 attack/saves/skills/ability checks | End of fear duration | Fear chain (mild) |
| **Sickened** | -2 attack/damage/saves/skills/ability checks | End of source | Sickness chain (mild) |
| **Staggered** | Single action per turn only | HP above 0, or heal | — |
| **Stunned** | -2 AC, lose DEX to AC, drop held items, no actions | 1 round (typically) | — |
| **Unconscious** | Cannot act, helpless | Heal above 0 HP | — |

---

## Severity Chains

Applying a more severe condition in a chain removes the lesser condition:

### Fear Chain
```
Shaken → Frightened → Panicked → Cowering
(mild)    (moderate)   (severe)   (worst)
```

### Fatigue Chain
```
Fatigued → Exhausted
(mild)      (severe)
```

### Sickness Chain
```
Sickened → Nauseated
(mild)      (severe)
```

---

## Type Immunities

| Creature Type | Immune To |
|---|---|
| Construct | Fatigued, Exhausted, Asleep, Poisoned, Paralyzed, Stunned, Sickened, Nauseated |
| Undead | Fatigued, Exhausted, Asleep, Poisoned, Paralyzed, Stunned, Sickened, Nauseated |
| Ooze | Paralyzed, Stunned, Petrified, Polymorphed |
| Plant | Paralyzed, Stunned, Polymorphed, Sleep |
| Elemental | Paralyzed, Stunned, Sleep |

---

## Notes

- All condition debuffs use `Penalty` bonus type (always applies through stacking)
- Prone AC modifiers use `Circumstance` for the ranged defense bonus
- Conditions are applied/removed exclusively through `ConditionManager` — never created as raw AEs
- Token HUD shows condition icons from the predefined set
