---
description: "Compare how different D&D 5e, Pathfinder 2e, and D&D 3.5e handle similar mechanics, spells, items, and features."
---

# System Comparison Skill

## Using This Skill

Ask questions like:
- "How do 5e and 3.5e handle resistance differently?"
- "Does PF2e have bonus types like 3.5e?"
- "How do attack rolls work in each system?"
- "What's the difference in feat progression?"
- "How are conditions handled across systems?"

This skill helps you:
- **Understand differences** between 5e, PF2e, and d35e
- **Port mechanics** from one system to another
- **Find 3.5e equivalents** of 5e features
- **Implement system-specific rules** correctly
- **Plan compatibility** with related systems

## Core Mechanic Differences

### Ability Scores & Modifiers

| System | Score Range | Modifier Formula | Special |
|--------|-------------|------------------|---------|
| **d35e** | 3-20+ (no cap) | (score - 10) / 2 | Score-based, can exceed 20 |
| **5e** | 3-20 (soft cap 20) | (score - 10) / 2 | Score cap 20, racial bonuses |
| **PF2e** | Static +0 to +10 | Derived from proficiency | Proficiency-based, no scores |

**Key difference**: 3.5e and 5e use scores; PF2e uses proficiency levels.

### Attack Bonuses

| System | Components | Stacking |
|--------|------------|----------|
| **d35e** | BAB + Modifiers + Bonus Types | Material/Competence/etc don't stack |
| **5e** | Proficiency + Modifiers | Only Proficiency matters, no types |
| **PF2e** | Proficiency + Modifiers | Multiple types stack (item, status, etc) |

**Example d35e**: Attack = +6 (BAB) + 3 (STR) + 1 (magic) + 2 (morale) = +12

**Example 5e**: Attack = +2 (proficiency) + 3 (STR) = +5

### Damage Resistance

| System | Representation | Stacking | Exceptions |
|--------|----------------|----------|-----------|
| **d35e** | Type (fire, cold, etc) + amount | Multiple types stack | Magic/metal weapons overcome |
| **5e** | Type only, halves damage | Multiple types allowed | Specific conditions listed |
| **PF2e** | Type + weakness/hardness | Weakness/Hardness stack | Resistance does not stack |

**d35e example**: "Fire resistance 10, cold immunity, DR 5/magic"

**5e example**: "Fire resistance, magic weapon immunity"

### Feat System

| System | Frequency | Count | Selection |
|--------|-----------|-------|-----------|
| **d35e** | Every 3 levels | Bonuses + class grants | Huge list, no restrictions |
| **5e** | Every 4 levels (or +2 ASI) | Limited, feat list | Fewer, prerequisites |
| **PF2e** | Every level | Flexible, class+general | Mandatory ancestry/heritage |

**d35e**: Level 1,4,7,10,13,16,19 gain bonus feat. Clerics get bonus feats per deity.

**5e**: Level 4,8,12,16,19 gain +2 ASI or feat.

**PF2e**: Every level gain 1 feat (ancestry 1st, class 1st/2nd/etc, general at any level).

## Attack Resolution Comparison

### Attack Roll Sequence

**d35e**:
1. Roll d20 + BAB + STR + magic + misc bonuses
2. Apply penalties/bonuses from circumstances
3. Apply active effect modifiers
4. Compare to target AC

**5e**:
1. Roll d20 + DEX (ranged/finesse) or STR (melee) + proficiency (if trained)
2. Apply advantage/disadvantage
3. Compare to target AC

**PF2e**:
1. Roll d20 + proficiency + modifier + item bonuses
2. Critical success (≥10 over DC), success, failure, critical failure
3. Different damage on each outcome

### Saving Throws

| System | Roll | Bonuses |
|--------|------|---------|
| **d35e** | d20 + ability mod + magic + misc | Stacked by bonus type |
| **5e** | d20 + ability mod + proficiency | Only proficiency matters |
| **PF2e** | d20 + proficiency + ability mod + item | Multiple types stack |

## Spell Casting Comparison

### Spell Slots vs. Spells Known

| System | Model | Progression | Recovery |
|--------|-------|-------------|----------|
| **d35e** | Slots per level | Cleric 4+/day at 1st cast | Rest 8 hours |
| **5e** | Slots per level | Wizard 1st available at 3rd level | Long rest |
| **PF2e** | Spell Proficiency | Spells per spell level | Daily + free cantrip |

**d35e**: "You can cast 4 1st-level spells per day"

**5e**: "You have 2 1st-level spell slots"

**PF2e**: "You can cast 1st-level spells, proficiency determines number"

### Prepared vs Spells Known

| System | Type | Count | Selection Timing |
|--------|------|-------|------------------|
| **d35e** | Prepared | (WIS mod + spell level) per spell for clerics | On rest |
| **5e** | Known/Prepared | (Level / 2) + WIS for clerics | On rest |
| **PF2e** | Spells Known | Proficiency-based | On character creation/level |

## Item & Equipment Differences

### Item Rarity

| System | Levels | How Determined | Effect |
|--------|--------|---------------|--------|
| **d35e** | Modifier bonus (avg +1 to +10) | Enchantment crafting cost | +X to attack/AC/ability |
| **5e** | Common/Uncommon/Rare/VRare/Leg | Random tables | Varied effects, usually 1+ bonuses only |
| **PF2e** | 0-11 (item level) | Crafting formula level | Damage scaling, crafting cost |

**Key**: d35e items stack bonuses; 5e is limited to +3 caps; PF2e scales linearly with item level.

### Armor Class (AC)

| System | Calculation | Max Dex | Penalties |
|--------|-------------|---------|-----------|
| **d35e** | 10 + armor + DEX (limit) + shield | Varies by armor | Check penalty for some |
| **5e** | 10 + armor + DEX + shield | None for light, some medium | No check penalty |
| **PF2e** | 10 + Dex + Armor proficiency mod | Varies by armor | Penalty affects many rolls |

**d35e example**: Heavy armor (AC 8) = 10 + 8 + 0 (DEX capped) = AC 18

**5e example**: Plate (AC 18) ignores DEX

**PF2e example**: Plate (AC 18) + armor check penalty -2

## Condition Differences

### Common Conditions Mapping

| Condition | d35e | 5e | PF2e |
|-----------|------|-----|------|
| Restrained | Pinned/Grappled | Restrained | Grabbed/Immobilized |
| Stunned | Stunned | Stunned | Stunned |
| Invisible | Invisible | Invisible | Invisible (2e changes rules) |
| Prone | Prone | Prone | Prone |
| Frightened | Frightened/Shaken | Frightened | Frightened (varies) |

**Key**: 3.5e has more condition states (Dazed, Comatose, etc); 5e simplified.

## Feature Porting Strategy

### Porting Feat from d35e to 5e

**Original d35e**: "Power Attack: -1 to hit, +2 damage per attack" (could be done every round)

**5e equivalent**: "Great Weapon Master: -5 to hit, +10 damage" (bonus action interaction, once per turn)

**Why different**: 5e simplifies bonus types, removes per-round choices.

### Porting Spell from 5e to d35e

**Original 5e**: "Fireball: All creatures make DEX save, take 8d6 damage"

**d35e equivalent**: "Fireball: 8d6 (capped 40), no save allowed, Reflex save for half"

**Why different**: d35e has Reflex saves instead of DEX saves; saves are more powerful.

## Implementation Patterns

### Pattern: 3.5e Bonus Stacking

```typescript
// Only highest of each type applies
const bonuses = {
  material: 1,      // Magic weapon +1
  enhancement: 1,   // Armor enhancement +1
  morale: 2,        // Inspiring word +2
  competence: 1,    // Bless +1
};

const total = Object.values(bonuses).reduce((a, b) => a + b, 0);  // 5
// Note: Multiple 'material' bonuses only use highest
```

### Pattern: 5e Advantage/Disadvantage

```typescript
// Not present in d35e; instead use circumstance modifiers
const bonuses = {
  circumstance: [2, -2, 1],  // Multiple apply, add all
};
const total = bonuses.circumstance.reduce((a, b) => a + b, 0);  // 1
```

### Pattern: PF2e Proficiency Scaling

```typescript
// PF2e adds +1/2 per rarity, d35e uses fixed bonuses
const rarityBonus = itemLevel * 0.5;  // Item level 4 = +2 bonus
// d35e: +1 enchantment = 2,000 gp always
```

## When to Port Features

**Easy to port** (minimal changes):
- Basic ability checks & saving throws
- Skill use & situations
- Spell effects that don't depend on saves

**Hard to port** (system-dependent):
- Attack bonuses (bonus types differ fundamentally)
- Damage output (5e is lower power than d35e)
- Spell damage scaling
- Feat prerequisites & levels

**Won't port without redesign**:
- 3.5e multiclassing (PF2e has no class levels)
- 5e Concentration (3.5e only on sustained spells)
- PF2e critical specialization effects

## Related Skills

- **phase-reference**: Which phase plans similar features
- **foundry-reference**: How to implement differences in code
- **implementation-guide**: Step-by-step for new mechanics
