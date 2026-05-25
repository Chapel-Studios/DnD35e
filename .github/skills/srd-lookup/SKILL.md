---
name: srd-lookup
description: 'Look up raw D&D 3.5e SRD rules as written. Use when asked about spells (Fireball, Cure Moderate Wounds), feats (prerequisites, Power Attack), conditions (Stunned, Prone, Grappled), combat mechanics (iterative attacks, AoO, grapple, two-weapon fighting), saving throw DCs, or any rules-as-written question. Searches local SRD journal and d20srd.org.'
argument-hint: 'The rule, spell, feat, or condition to look up'
---

# SRD Lookup Skill

## When to Use This Skill

Ask questions like:
- "What does the SRD say about Power Attack?"
- "How many attacks does a Fighter get at BAB +11?"
- "What are the Fireball SRD mechanics?"
- "What does the Stunned condition do?"
- "What's the SRD rule for two-weapon fighting penalties?"

This skill helps you:
- **Look up official 3.5e SRD rules** as written
- **Find spell descriptions**, components, and effects
- **Reference feat prerequisites** and effects
- **Find condition definitions** and their mechanical consequences
- **Verify combat rules** (attacks of opportunity, grapple, etc.)

> **For Foundry system implementation comparisons** use `/system-comparison`.
> **For D35E legacy system schema** use `/d35e-reference`.

---

## Primary Sources

### 1. Local SRD Journal

The repo includes a mostly full SRD journal export from the legacy D35E system:

```
docs/reference/fvtt-JournalEntry-3.5-srd-working-c3lf0RUqQVJ8Pm20.json
```

This is a Foundry JournalEntry with pages covering:
- Base Classes (Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Wizard)
- Prestige Classes (Arcane Archer, Assassin, Blackguard, Dragon Disciple, Duelist, etc.)
- NPC Classes (Adept, Aristocrat, Commoner, Expert, Warrior)
- Multiclass rules
- Skills (all 40+ skills with descriptions)
- Feats (all SRD feats with prerequisites and effects)
- Magic Items
- Equipment & Special Materials
- Combat rules, Conditions, Special Abilities
- Magic Overview, Spell Lists, Spells (A–Z)
- Monsters, Types & Subtypes
- Epic Rules, Psionic Rules, Divine Rules (partial)

**Note**: The journal content is HTML inside JSON. To search it, use `grep_search` on that file with the term you need.

### 2. Online: d20srd.org

The canonical online 3.5e SRD. All major rules sections:

| Section | URL |
|---------|-----|
| Equipment | https://www.d20srd.org/indexes/equipment.htm |
| Combat | https://www.d20srd.org/indexes/combat.htm |
| Conditions | https://www.d20srd.org/indexes/conditions.htm |
| Special Abilities | https://www.d20srd.org/indexes/specialAbilities.htm |
| Feats | https://www.d20srd.org/indexes/feats.htm |
| Magic Overview | https://www.d20srd.org/indexes/magicOverview.htm |
| Spell Lists & Domains | https://www.d20srd.org/indexes/spellLists.htm |
| Spells A–Z | https://www.d20srd.org/indexes/spells.htm |
| Monsters | https://www.d20srd.org/indexes/monsters.htm |
| Types & Subtypes | https://www.d20srd.org/indexes/typesSubtypes.htm |
| Skills | https://www.d20srd.org/indexes/skills.htm |
| Epic Basics & Classes | https://www.d20srd.org/indexes/epicBasicsAndClasses.htm |
| Epic Feats | https://www.d20srd.org/indexes/epicFeats.htm |
| Psionic Powers | https://www.d20srd.org/indexes/psionicPowersOverview.htm |
| Carrying & Movement | https://www.d20srd.org/indexes/carryingMovementExploration.htm |
| Traps | https://www.d20srd.org/indexes/traps.htm |

**Individual rule pages** follow the pattern: `https://www.d20srd.org/srd/<category>/<topicSlug>.htm`

---

## Common Rule Quick Reference

### Attack Rolls
- Roll: **d20 + BAB + ability mod + size mod + misc bonuses**
- Hit if result ≥ target AC
- Natural 20 always hits and confirms a critical threat
- Natural 1 always misses

### Full Attack Iteratives (BAB thresholds)
| BAB total | Iterative attacks |
|-----------|-------------------|
| +1 to +5  | 1 attack |
| +6 to +10 | 2 attacks (at BAB / BAB–5) |
| +11 to +15 | 3 attacks (at BAB / BAB–5 / BAB–10) |
| +16+      | 4 attacks (at BAB / BAB–5 / BAB–10 / BAB–15) |

### Two-Weapon Fighting Penalties
| Circumstance | Primary | Off-hand |
|--------------|---------|----------|
| Normal (light off-hand) | −4 | −8 |
| Two-Weapon Fighting feat (light) | −2 | −2 |
| Off-hand is not light | −6 | −10 |
| TWF feat (non-light) | −4 | −4 |

### Saving Throws
- Fortitude: Con-based, resists poison/disease/death/energy drain
- Reflex: Dex-based, resists area-of-effect spells
- Will: Wis-based, resists mental/mind-affecting effects
- DC = 10 + spell level + caster's casting stat modifier (for spells)

### Armor Class Components
```
AC = 10 + armor bonus + shield bonus + Dex mod (capped by armor) + size mod
       + natural armor + deflection + dodge + misc
```
Touch AC = 10 + Dex + size + deflection + dodge (no armor/shield/natural)
Flat-footed AC = 10 + armor + shield + size + natural + deflection (no Dex/dodge)

### Skill Ranks Cap
- Max ranks in class skill = character level + 3
- Max ranks in cross-class skill = (character level + 3) / 2 (round down)
- Cost: 1 skill point per rank (class skill), 2 skill points per rank (cross-class)

### Grapple
1. Provoke AoO from target (unless Improved Grapple)
2. Touch attack to grab (melee attack roll, no weapons)
3. Grapple check: d20 + BAB + STR mod + special bonuses vs target's grapple check
4. On success: target is grappled; you may pin, damage, or escape next turn

### Power Attack
- Declare before attack; take −1 to hit per +1 added to damage
- For two-handed weapons: +2 damage per −1 penalty
- Maximum penalty = current BAB

### Bonus Types (Stacking Rules)
Same bonus type does NOT stack — only the highest applies:
- Armor, Deflection, Enhancement, Morale, Luck, Sacred/Profane, Competence, Circumstance, Natural Armor, Shield, Alchemical, Resistance

**Do stack (multiple sources of the same type add together)**:
- Dodge bonuses always stack
- Untyped bonuses always stack

---

## Spell Lookup Pattern

When looking up a spell from the SRD:

1. **Online**: `https://www.d20srd.org/srd/spells/<spellName>.htm` (camelCase slug)
   - Example: `https://www.d20srd.org/srd/spells/fireball.htm`
   - Example: `https://www.d20srd.org/srd/spells/cureModerateWounds.htm`

2. **Local journal**: Search `docs/reference/fvtt-JournalEntry-3.5-srd-working-c3lf0RUqQVJ8Pm20.json` for the spell name

### Spell Entry Fields (SRD format)
```
School [Subschool] [Descriptor]
Level: <class> <n>, ...
Components: V, S, M/DF, F
Casting Time: <time>
Range: <range>
Target/Area/Effect: <description>
Duration: <duration> [D]
Saving Throw: <type> (<half/negates/none>)
Spell Resistance: Yes/No
```

---

## Condition Lookup Pattern

All conditions: `https://www.d20srd.org/indexes/conditions.htm`

### Common Conditions Summary

| Condition | Key mechanical effects |
|-----------|----------------------|
| **Blinded** | −2 AC, lose Dex, −4 attacks, 50% miss chance |
| **Confused** | Roll d% each turn: attack ally / act normally / babble / attack self |
| **Dazed** | No actions except free actions, no AoO |
| **Deafened** | −4 initiative, 20% arcane spell failure, Listen skill unusable |
| **Entangled** | −2 attack, −4 Dex, concentrate to cast spells (DC 15 + spell level) |
| **Exhausted** | −6 Str/Dex, move at half speed |
| **Fatigued** | −2 Str/Dex, cannot charge or run |
| **Frightened** | Flees; −2 attack/save/skill checks vs fear source |
| **Grappled** | −4 Dex, only light weapons allowed, no ranged attacks |
| **Helpless** | Dex 0, melee attackers get +4; coup de grace possible |
| **Invisible** | +2 attack, opponents lose Dex vs you, 50% concealment miss chance |
| **Paralyzed** | Dex 0 and Str 0; helpless; no actions |
| **Pinned** | Held immobile; AC 4 (natural only); Dex bonus lost |
| **Prone** | −4 melee attacks, −4 AC vs melee, +4 AC vs ranged |
| **Shaken** | −2 attack/save/skill/ability checks |
| **Sickened** | −2 attack/damage/save/skill/ability checks |
| **Staggered** | Only standard or move action (not both), no full-round actions |
| **Stunned** | Drop held items, −2 AC, lose Dex, no actions |
| **Unconscious** | Helpless; can't take any actions |

---

## Gotchas

- **The local SRD journal is HTML-inside-JSON** — do NOT read the whole file. Use `grep_search` on `docs/reference/fvtt-JournalEntry-3.5-srd-working-c3lf0RUqQVJ8Pm20.json` with the term you need. `read_file` on the full file will flood context (the file is several MB).

- **d20srd.org URL slugs are camelCase** — individual rule pages follow `https://www.d20srd.org/srd/<category>/<slug>.htm` where the slug is camelCase: `Cure Moderate Wounds` → `cureModerateWounds`, `Power Attack` → `powerAttack`. Wrong case returns a 404.

- **Epic and Psionic content is partial in the local journal** — the journal was exported from the D35E system which had incomplete coverage. Fall back to d20srd.org for those topics.

- **The journal may contain non-SRD D35E content** — a few entries come from D35E system modules, not the strict SRD. RAW compliance always matters: the system defaults to RAW with explicit options to break from it. If you find non-SRD content in the journal that is unrelated to implementing RAW or a documented RAW-breaking option, flag it for correction against d20srd.org.

---

## Related Skills

- **`/system-comparison`**: How D35E, dnd5e, and PF2e Foundry systems implement a mechanic
- **`/d35e-reference`**: Old D35E system schema and data paths for a mechanic
- **`/foundry-reference`**: Foundry v14 API for implementing the rule in code
- **`/implementation-guide`**: Step-by-step workflow for adding a rule to dnd35e
