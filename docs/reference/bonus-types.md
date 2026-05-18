# Bonus Types Reference

Quick-reference table for all D&D 3.5e bonus types implemented in the stacking engine.

> For architecture details, see [Bonus Type Stacking Engine](../architecture/bonus-stacking.md).

---

## Stacking Rules

| Rule | Behavior |
|---|---|
| **Highest wins** | Only the highest bonus of this type applies to a given field |
| **Always stacks** | All bonuses of this type apply (summed) |
| **Always applies** | Penalties always apply regardless of other bonuses |

---

## Bonus Type Table

| Bonus Type | Stacking | Typical Sources | Notes |
|---|---|---|---|
| Armor | Highest wins | Armor equipment | AC only |
| Shield | Highest wins | Shield equipment | AC only |
| Natural | Highest wins | Natural armor, Barkskin, Amulet of Natural Armor | AC only |
| Deflection | Highest wins | Ring of Protection, Shield of Faith | AC only |
| Enhancement | Highest wins | Magic weapons (+1–+5), magic armor, ability-boosting items | Most common bonus type |
| Dodge | Always stacks | Dodge feat, Fighting Defensively, Haste | AC only; lost when flat-footed |
| Size | Highest wins | Size category (Fine to Colossal) | Affects AC, attack, grapple, Hide |
| Morale | Highest wins | Bless, Heroism, Rage, Inspire Courage | Mental effects; immune creatures unaffected |
| Sacred | Highest wins | Holy auras, divine blessings | Good-aligned sources |
| Profane | Highest wins | Unholy effects, evil blessings | Evil-aligned sources |
| Luck | Highest wins | Divine Fortune, Lucky items, Stone of Good Luck | Supernatural fortune |
| Insight | Highest wins | True Strike, foresight, certain divination effects | Knowledge/prediction |
| Competence | Highest wins | Skill-boosting spells (Guidance, Fox's Cunning for skills) | Rank/training effects |
| Circumstance | Always stacks | Masterwork tools, favorable terrain, cover | Situational modifiers; community-expert consensus treats as stacking |
| Racial | Always stacks | Racial traits (Dwarf +2 vs poison) | Built into race; edge case where multiple racial bonuses overlap |
| Inherent | Highest wins | Wish, Tome/Manual of +stat | Permanent; caps at +5 |
| Trait | Highest wins | Character traits (if using trait rules) | Optional rule |
| Material | Highest wins | Material properties (Mithral, Adamantine) | Each material subtype is distinct |
| Alchemical | Highest wins | Alchemical items (Tanglefoot bag, Thunderstone) | Consumable effects |
| Haste | Highest wins | Haste spell | Unique category for the Haste effect |
| Slow | Always applies | Slow spell | Penalty category |
| Teamwork | Highest wins | Teamwork feats (Aid Another, Flanking bonuses) | Cooperative bonuses |
| Half | Highest wins | Pre-stacking rule (D35E-specific) | Legacy compatibility |
| Untyped | Always stacks | Miscellaneous bonuses with no specific type | Default when no type specified |
| Untyped_Stackable | Always stacks | Explicitly marked stackable untyped | Explicit opt-in |
| Penalty | Always applies | All penalties from any source | Never suppressed by stacking |

---

## Examples

**AC Calculation (Fighter with gear):**
```
Base:         10
Armor:        +8 (Full Plate)       → Armor type, highest wins
Shield:       +2 (Heavy Shield)     → Shield type, highest wins
DEX:          +1 (14 DEX, max +1)   → Ability modifier (no bonus type)
Deflection:   +2 (Shield of Faith)  → Deflection type, Ring of Protection +1 ignored
Natural:      +3 (Barkskin)         → Natural type
Dodge:        +1 (Dodge feat)       → Dodge type, always stacks
Size:         +0 (Medium)           → Size type
                                    ─────
Total AC:     27
```

**Attack Roll (Fighter 10, STR 18, +1 longsword):**
```
BAB:          +10                   → Base (not a bonus type)
STR:          +4                    → Ability modifier
Enhancement:  +1 (magic weapon)     → Enhancement type
Competence:   +1 (Weapon Focus)     → Competence type
Morale:       +2 (Heroism)          → Morale type
                                    ─────
Total:        +18
```
