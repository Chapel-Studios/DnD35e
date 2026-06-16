---
name: system-comparison
description: 'Compare D35E (legacy Foundry system), dnd5e, and PF2e implementations side-by-side. Use when deciding data structure for a new item type, comparing buff/AE/RuleElement approaches, checking HP/saves/BAB/AC paths across systems, reviewing condition implementations, or understanding why dnd35e chose a particular design over the D35E approach.'
---

# System Comparison Skill

## When to Use This Skill

Ask questions like:
- "How does D35E store buffs compared to dnd5e?"
- "How do the three systems handle item Active Effects?"
- "What does D35E's changes template look like vs dnd5e AEs?"
- "How do the three Foundry systems structure actor HP?"
- "How does PF2e handle conditions compared to D35E?"

This skill helps you:
- **Compare Foundry system implementations** across D35E (legacy), dnd5e, and PF2e
- **Understand migration targets** — what D35E did and how dnd35e (our new system) improves on it
- **Port mechanics** between Foundry system paradigms
- **Identify D35E patterns** that carry over or need redesign
- **Plan compatibility** with world data from the old D35E system

> **Terminology**
> - **D35E** = the legacy Foundry VTT system (system ID `D35E`, last known version ~2.4.3) we are rebuilding from
> - **dnd5e** = the official Foundry D&D 5e system by Atropos et al.
> - **PF2e** = the official Foundry Pathfinder 2e system
> - **dnd35e** = our new system (what we are building)

> **For raw 3.5e rule lookups** use `/srd-lookup`.
> **For detailed D35E schema reference** use `/d35e-reference`.

## Actor Data Comparison

### Hit Points

| Field | D35E | dnd5e | PF2e |
|-------|------|-------|------|
| Current HP | `system.attributes.hp.value` | `system.attributes.hp.value` | `system.attributes.hp.value` |
| Max HP | `system.attributes.hp.max` | `system.attributes.hp.max` | `system.attributes.hp.max` |
| Temp HP | `system.attributes.hp.temp` | `system.attributes.hp.temp` | `system.attributes.hp.temp` |
| Non-lethal | `system.attributes.hp.nonlethal` | ❌ not a field | ❌ not a concept |
| Wound threshold | ❌ | ❌ | `system.attributes.hp.sp` (stamina) |

**D35E** uses non-lethal damage as a separate tracked value. **PF2e** uses a stamina system at GM option. **dnd5e** has no non-lethal concept.

### Ability Scores

| Field | D35E | dnd5e | PF2e |
|-------|------|-------|------|
| Score | `system.abilities.str.value` | `system.abilities.str.value` | `system.abilities.str.mod` (derived) |
| Modifier | `system.abilities.str.mod` (derived) | `system.abilities.str.mod` (derived) | Proficiency-based, no raw score |
| Temp score | `system.abilities.str.total`, `system.abilities.str.userPenalty` | ❌ | ❌ |
| Damage/drain | `system.abilities.str.damage`, `system.abilities.str.drain` | ❌ | `system.abilities.str.apex` for item bonus |

**Key difference**: D35E tracks ability damage/drain as permanent vs temporary reduction. PF2e has no ability score concept — everything is proficiency + item bonus.

### Saving Throws

| Throw | D35E path | dnd5e path | PF2e path |
|-------|-----------|------------|-----------|
| Fortitude/Con | `system.attributes.savingThrows.fort` | `system.abilities.con.save` | `system.saves.fortitude` |
| Reflex/Dex | `system.attributes.savingThrows.ref` | `system.abilities.dex.save` | `system.saves.reflex` |
| Will/Wis | `system.attributes.savingThrows.will` | `system.abilities.wis.save` | `system.saves.will` |

**D35E** stores saves as `{ base, ability, misc, total }`. **dnd5e** stores a save modifier per ability. **PF2e** stores a proficiency rank.

### Attack (BAB)

| Component | D35E | dnd5e | PF2e |
|-----------|------|-------|------|
| Base attack | `system.attributes.bab.total` | ❌ (no BAB) | ❌ (proficiency rank instead) |
| Attack bonus | BAB + STR/DEX + changes | Proficiency + STR/DEX | Proficiency rank + STR/DEX |
| Full attack | Iteratives from BAB ≥ 6 | Extra Attack class feature | `MAP` (multiple attack penalty) |

**D35E** uses BAB stored directly on the actor (aggregated from class items). **dnd5e** only uses proficiency. **PF2e** uses proficiency ranks (untrained/trained/expert/master/legendary) and the MAP system.

---

## Item Type Comparison

### Weapons

| Feature | D35E | dnd5e | PF2e |
|---------|------|-------|------|
| Item type | `weapon` | `weapon` | `weapon` |
| Damage formula | `system.damage.parts[]` (array of `[formula, type]`) | `system.damage.parts[]` | `system.damage.dice + system.damage.die` |
| Critical threat | `system.ability.critRange` | `system.critical.threshold` | `system.criticalHit` |
| Critical multiplier | `system.ability.critMult` | ❌ (always ×2) | ❌ (crit is double dice) |
| Attack bonus | `changes[]` targeting `~attack` | `system.attackBonus` | `system.bonus.value` |
| Weapon groups | ❌ | `system.weaponType` | `system.group` |

### Armor / Equipment

| Feature | D35E | dnd5e | PF2e |
|---------|------|-------|------|
| Item type | `equipment` | `equipment` | `armor` |
| AC bonus | `system.armor.value` | `system.armor.value` | `system.acBonus` |
| Max Dex | `system.armor.dex` | `system.armor.dex` | `system.dexCap` |
| Check penalty | `system.armor.acp` | `system.armor.checkPenalty` | `system.checkPenalty` |
| Equip slot | `system.slot` (head/body/etc) | `system.armor.type` | `system.category` + traits |

### Buffs

| Feature | D35E | dnd5e | PF2e |
|---------|------|-------|------|
| Implementation | **Item** type `buff` on actor | Active Effect on actor | **Item** type `effect` on actor |
| Toggle on/off | `system.active` boolean | AE enable/disable | `system.active` boolean |
| Duration | `system.duration` object | AE duration | `system.duration` |
| Applies to | `system.changes[]` → actor stats | AE `changes[]` | `system.rules[]` (RuleElements) |
| Stacking | Manual `modifier` field, no enforcement | No stacking rules | PF2e enforces type stacking |

**D35E buffs are items.** dnd5e uses pure AEs. PF2e uses `effect` items with RuleElements.

### Spells

| Feature | D35E | dnd5e | PF2e |
|---------|------|-------|------|
| Item type | `spell` | `spell` | `spell` |
| Spell level | `system.level` | `system.level` | `system.level.value` |
| Prepared | `system.preparation.preparedAmount` | `system.preparation.mode` | `system.location` (spellbook) |
| School | `system.school` | `system.school` | `system.traits.value[]` |
| Components | `system.components` | `system.components` | `system.components.value[]` |
| Buff creation | Creates `buff` item on target | Creates AE on target | Creates `effect` item on target |

### Feats

| Feature | D35E | dnd5e | PF2e |
|---------|------|-------|------|
| Item type | `feat` | `feat` | `feat` |
| Feat type | `system.featType` (feat/classFeat/etc) | `system.type.value` | `system.category` |
| Prerequisites | `system.prerequisites.value[]` | None enforced | `system.prerequisites.value[]` |
| Uses | `system.uses` | `system.uses` | `system.frequency` |
| Passive changes | `system.changes[]` | Creates AE | `system.rules[]` (RuleElements) |

---

## Active Effects / Changes Comparison

This is the most significant architectural difference between the three systems.

### D35E `changes` Template

D35E does NOT use Foundry Active Effects for stat modification. Instead items carry a `changes` array:

```json
{
  "system": {
    "changes": [
      { "formula": "2", "operator": "+", "target": "~acBonus", "modifier": "armor", "priority": 200 },
      { "formula": "1", "operator": "+", "target": "~bab",      "modifier": "enhancement", "priority": 0 }
    ]
  }
}
```

| Field | Meaning |
|-------|---------|
| `formula` | Value formula (string, may be an expression) |
| `operator` | `+`, `-`, `=` (add/subtract/set) |
| `target` | Stat path using `~` shorthand (e.g. `~acBonus`, `~bab`, `~str`) |
| `modifier` | Bonus type label (not enforced for stacking) |
| `priority` | Application order (higher = later) |

**Stacking** is not enforced in D35E — all changes are summed. The GM/system designer manually structures items to avoid stacking.

### dnd5e Active Effects

dnd5e uses Foundry's native AE system:

```json
{
  "changes": [
    { "key": "system.defense.normal", "mode": 2, "value": "2", "priority": 20 }
  ]
}
```

`mode` values: 0=Custom, 1=Multiply, 2=Add, 3=Downgrade, 4=Upgrade, 5=Override

No bonus type stacking enforcement. Advantage/disadvantage handled separately from numeric bonuses.

### PF2e Rule Elements

PF2e replaces AEs entirely with `RuleElement` objects:

```json
{
  "system": {
    "rules": [
      { "key": "FlatModifier", "selector": "ac", "value": 2, "type": "armor" },
      { "key": "FlatModifier", "selector": "attack-roll", "value": 1, "type": "item" }
    ]
  }
}
```

PF2e fully enforces stacking — the `type` field is used to deduplicate (only highest of each type applies). Conditions are first-class items, not flags.

---

## Condition Comparison

| Condition | D35E implementation | dnd5e implementation | PF2e implementation |
|-----------|--------------------|--------------------|-------------------|
| Stunned | `ActiveEffect` flag or `changes[]` | AE with `statuses` | `effect` item type `condition` |
| Frightened | `system.attributes.conditions.frightened` | AE `statuses` | `effect` with `system.value` (severity) |
| Prone | `ActiveEffect` or `system.conditions` | AE `statuses` | `condition` item, applies MAP +2 |
| Invisible | `ActiveEffect` | AE `statuses` | `condition` item, RuleElements handle effects |
| Grappled | `system.attributes.conditions.grapple` | AE `statuses` | `condition` item |

**Key difference**: PF2e conditions are first-class items that carry their own RuleElements. D35E and dnd5e use flags/AEs, requiring the system to hard-code condition effects.

---

## Feat/Skill Comparison

### Skills Storage

| Field | D35E | dnd5e | PF2e |
|-------|------|-------|------|
| Skill ranks | `system.skills.per.rank` | ❌ (no ranks) | ❌ (proficiency rank) |
| Class skill | `system.skills.per.cs` (boolean) | ❌ | ❌ |
| Modifier | `system.skills.per.mod` | `system.skills.per.total` | `system.skills.per.value` (proficiency) |
| Synergy | `system.skills.per.synergy` bonus via `changes[]` | ❌ | ❌ |
| Total | `system.skills.per.total` | `system.skills.per.total` | Computed from proficiency + ability |

D35E has 40+ individual skills; dnd5e has 18; PF2e has 16 core + lore skills.

---

## Compendium Structure Comparison

| Pack type | D35E | dnd5e | PF2e |
|-----------|------|-------|------|
| Spells | `dnd35e.spells` | `dnd5e.spells` | `pf2e.spells` |
| Feats | `dnd35e.feats` | `dnd5e.feats` | `pf2e.feats` |
| Conditions | (Not Implemented AE yet) | `dnd5e.rules` | `pf2e.conditionitems` |
| Monsters | `dnd35e.monsters` | `dnd5e.monsters` | `pf2e.monstercore` |
| Classes | `dnd35e.classes` | `dnd5e.classes` | `pf2e.classes` |

---

## When to Use This Comparison

**Use this skill when**:
- Implementing a mechanic and need to see how other Foundry systems approached it
- Deciding data structure for a new item type or field
- Reviewing how D35E stored something before designing dnd35e's version
- Checking if a pattern from dnd5e or PF2e applies to our 3.5e rebuild

**Use `/d35e-reference` instead when**:
- You need exact D35E schema field names, paths, and types
- You are writing a migration script mapping old fields to new ones
- You need to understand D35E item/actor templates in detail

**Use `/srd-lookup` instead when**:
- You need to look up raw 3.5e rules (how many attacks at BAB +11, etc.)
- You want the official SRD text for a mechanic, spell, or condition

---

## Gotchas

- **D35E `changes[]` stacking is NOT enforced** — every entry is summed regardless of `modifier` type. PF2e RuleElements actually deduplicate by `type`; D35E and dnd5e do not. Comparison tables showing the same field name across systems do not imply the same stacking behavior.

- **PF2e has no ability scores, only modifiers** — there is no `str.value` (a score like 18) in PF2e; everything works from the `+4` modifier. Never look for a `score` field in PF2e schema.

- **dnd5e has no BAB concept** — the field does not exist. All attack math is proficiency bonus + ability modifier. Do not assume any D35E `bab` path maps to a dnd5e equivalent.

- **D35E buffs are Item documents, not AEs** — they are Items of type `buff` with `system.active`. dnd5e uses pure AEs on the actor; PF2e uses `effect` items with RuleElements. These are architecturally different despite surface similarity.

- **System IDs are case-sensitive**: `D35E`, `dnd5e`, `pf2e` — wrong case causes silent filtering failures in Foundry pack and world lookups.

## Related Skills

- **`/d35e-reference`**: Detailed old D35E schema field reference for migration
- **`/srd-lookup`**: Raw 3.5e SRD rules lookup (online + local journal)
- **`/foundry-reference`**: Foundry VTT v14 API for implementing mechanics in code
- **`/implementation-guide`**: Step-by-step for adding a mechanic to dnd35e
