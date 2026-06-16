---
name: d35e-reference
description: 'Look up how the legacy D35E Foundry system stores mechanics. Use when writing migration scripts, designing dnd35e field equivalents, checking actor data paths (abilities, HP, saves, BAB, AC, skills), item type schemas (weapon, buff, spell, class, equipment), or understanding the changes[] modification template. System ID is D35E (all caps).'
argument-hint: 'Optional: specific mechanic, item type, or actor field to look up (e.g. "weapon schema", "buff changes", "skill ranks")'
---

# D35E Reference Skill

## When to Use This Skill

Ask questions like:
- "How does D35E store a weapon's damage formula?"
- "What does the D35E changes template look like for a buff?"
- "How does D35E structure HP and saves on an actor?"
- "What item types does D35E have?"
- "How does D35E handle spell preparation?"
- "What does a D35E equipment item's schema look like?"

This skill helps you:
- **Find D35E data paths** before designing the dnd35e equivalent
- **Write migration scripts** that read old D35E world data
- **Understand what we are replacing** and how we improved it
- **Compare a D35E field to its dnd35e counterpart**

> **For raw 3.5e rules** use `/srd-lookup`.
> **For cross-system comparisons** (D35E vs dnd5e vs PF2e) use `/system-comparison`.

---

## D35E System Identity

- **System ID**: `D35E` (case-sensitive in Foundry world data)
- **Last stable version**: ~2.4.3 (Foundry v11 era)
- **Property maps**: `docs/architecture/property-maps/` contains field-by-field migration maps
- **Migration screenshots**: `migration notes/` — weapon, equipment, and effects UI screenshots
- **Content migration plan**: `docs/migration-plan/release/phase-06-content-migration.md`

---

## Actor Data Paths

### Ability Scores (`system.abilities.<key>`)

Keys: `str`, `dex`, `con`, `int`, `wis`, `cha`

| Field | Path | Notes |
|-------|------|-------|
| Base score | `system.abilities.str.value` | Entered by user |
| Modifier | `system.abilities.str.mod` | Derived: `floor((value-10)/2)` |
| Temp score | `system.abilities.str.total` | After buffs/AEs |
| Ability damage | `system.abilities.str.damage` | Reduces effective score |
| Ability drain | `system.abilities.str.drain` | Permanent reduction |
| User penalty | `system.abilities.str.userPenalty` | Manual adjustment |

### Hit Points (`system.attributes.hp`)

| Field | Path |
|-------|------|
| Current HP | `system.attributes.hp.value` |
| Max HP | `system.attributes.hp.max` |
| Non-lethal damage | `system.attributes.hp.nonlethal` |
| Temp HP | `system.attributes.hp.temp` |

### Saving Throws (`system.attributes.savingThrows.<key>`)

Keys: `fort`, `ref`, `will`

| Field | Path |
|-------|------|
| Base save | `system.attributes.savingThrows.fort.base` |
| Ability mod | `system.attributes.savingThrows.fort.ability` |
| Misc bonus | `system.attributes.savingThrows.fort.misc` |
| Total | `system.attributes.savingThrows.fort.total` |

### Base Attack Bonus

| Field | Path |
|-------|------|
| Total BAB | `system.attributes.bab.total` |
| Iterative 1 | BAB total |
| Iterative 2 | BAB − 5 (if BAB ≥ 6) |
| Iterative 3 | BAB − 10 (if BAB ≥ 11) |

BAB is aggregated by the system from class items owned by the actor.

### Armor Class

| Component | Path |
|-----------|------|
| AC value | `system.defense.defense.armorClass.total` |
| Touch AC | `system.defense.armorClass.touch.total` |
| Flat-footed | `system.defense.armorClass.flatFooted.total` |
| Armor bonus | Applied via `changes[]` targeting `~acBonus` |
| Deflection | Applied via `changes[]` targeting `~acDeflection` |

### Skills (`system.skills.<key>`)

D35E has 40+ skills. Keys include: `acr` (Acrobatics→Balance), `apr` (Appraise), `blf` (Bluff), `clm` (Climb), `coc` (Concentration), `crf` (Craft), `dip` (Diplomacy), `dis` (Disable Device), `dsg` (Disguise), `esc` (Escape Artist), `fly` (Fly), `han` (Handle Animal), `hea` (Heal), `int` (Intimidate), `kno` (Knowledge), `lis` (Listen), `lck` (Linguistics), `mve` (Move Silently), `opn` (Open Lock), `prf` (Perform), `pro` (Profession), `rid` (Ride), `sea` (Search), `sns` (Sense Motive), `slh` (Sleight of Hand), `spe` (Speak Language), `spl` (Spellcraft), `spt` (Spot), `sur` (Survival), `swm` (Swim), `tmb` (Tumble), `umd` (Use Magic Device), `uro` (Use Rope)

| Field | Path |
|-------|------|
| Ranks | `system.skills.acr.rank` |
| Class skill | `system.skills.acr.cs` (boolean) |
| Ability mod | `system.skills.acr.ability` (`"dex"`, `"str"`, etc.) |
| Misc bonus | `system.skills.acr.misc` |
| Total | `system.skills.acr.total` |

---

## Item Types

D35E item types (the `type` field on Item documents):

| Type | Description | Key schema fields |
|------|-------------|-------------------|
| `weapon` | Melee and ranged weapons | `system.damage`, `system.weaponType`, `system.ability` |
| `equipment` | Armor, shields, gear | `system.armor`, `system.slot`, `system.equipmentType` |
| `consumable` | Potions, wands, scrolls, ammo | `system.consumableType`, `system.uses`, `system.charges` |
| `loot` | Treasure, trade goods | `system.subType` (`gear`/`junk`/`tradeGoods`/`gemstone`) |
| `feat` | Feats | `system.featType`, `system.uses`, `system.prerequisites` |
| `spell` | Spells | `system.level`, `system.school`, `system.components`, `system.preparation` |
| `class` | Character classes | `system.hd`, `system.bab`, `system.savingThrows`, `system.classSkills` |
| `race` | Racial traits | `system.creatureType`, `system.size`, `system.speed` |
| `enhancement` | Weapon/armor enchantments | Attached to parent item |
| `aura` | Aura effects applied to nearby actors | `system.range`, `system.changes[]` |
| `buff` | Temporary stat buffs (toggled on/off) | `system.active`, `system.duration`, `system.changes[]` |
| `attack` | Standalone attack action | `system.attack`, `system.damage`, `system.ability` |
| `classFeature` | Class features/abilities | `system.grantingClass`, `system.uses` |
| `container` | Bags, backpacks | `system.capacity` |
| `card` | Harrow deck / action cards | `system.deck` |

---

## The `changes[]` Template (Core of D35E Stat Modification)

Every item type in D35E supports a `changes` array. This is **not** Foundry Active Effects — it is a custom D35E system that pre-dates Foundry's AE support.

```json
{
  "system": {
    "changes": [
      {
        "formula": "2",
        "operator": "+",
        "target": "~acBonus",
        "modifier": "armor",
        "priority": 200,
        "value": null
      }
    ]
  }
}
```

### Change Fields

| Field | Type | Description |
|-------|------|-------------|
| `formula` | string | Value expression (e.g. `"2"`, `"@str.mod"`, `"floor(@level / 2)"`) |
| `operator` | string | `"+"` add \| `"-"` subtract \| `"="` set/override |
| `target` | string | Stat path using `~` shorthand (see table below) |
| `modifier` | string | Bonus type label (free-form string, not enforced for stacking) |
| `priority` | number | Application order (higher = later, default 0) |
| `value` | number\|null | Cached evaluated result; `null` until evaluated at runtime |

### Common `~` Target Shortcuts

| Shorthand | Actual stat |
|-----------|-------------|
| `~str` / `~dex` / `~con` / `~int` / `~wis` / `~cha` | Ability score total |
| `~acBonus` | AC armor bonus |
| `~acDeflection` | AC deflection bonus |
| `~acDodge` | AC dodge bonus |
| `~acNatural` | AC natural armor bonus |
| `~acShield` | AC shield bonus |
| `~bab` | Base attack bonus |
| `~fort` / `~ref` / `~will` | Saving throw bonus |
| `~attack` | Generic attack bonus (all attacks) |
| `~meleeAttack` | Melee attack bonus only |
| `~rangedAttack` | Ranged attack bonus only |
| `~damage` | Damage bonus (all weapons) |
| `~meleeDamage` | Melee damage only |
| `~rangedDamage` | Ranged damage only |
| `~initiative` | Initiative bonus |
| `~spellResistance` | Spell resistance |
| `~speed` | Move speed |
| `~sizeModifier` | Size modifier to attack/AC |
| Skill | `~skill.acr` etc. |

### Contextual Notes

D35E items also have a `contextNotes` array for situational text shown in roll dialogs:

```json
{
  "system": {
    "contextNotes": [
      {
        "text": "+2 on saves vs. fear",
        "target": "~savingThrow",
        "subTarget": "will",
        "modifier": "morale"
      }
    ]
  }
}
```

---

## Weapon Schema (Key Fields)

```
system.weaponType         — "simple" | "martial" | "exotic" | "natural" | "ranged"
system.weaponSubtype      — "1h" | "2h" | "light" | "ranged"
system.ability.attack     — "str" | "dex"        (ability used for attack roll)
system.ability.damage     — "str"                (ability used for damage)
system.ability.critRange   — 20                  (threat range, e.g. 18 = 18–20)
system.ability.critMult    — 2                   (critical multiplier: ×2, ×3, ×4)
system.damage.parts        — [["2d6", "slashing"]] (array of [formula, type] pairs)
system.proficiency         — boolean (auto-detected from class)
system.size                — "med" | "sm" | "lg" etc.
system.changes[]           — see changes template above
```

---

## Equipment (Armor/Shield) Schema

```
system.equipmentType       — "armor" | "shield" | "misc"
system.equipmentSubtype    — "lightArmor" | "mediumArmor" | "heavyArmor" | "shield" | etc.
system.slot                — "armor" | "shield" | "helm" | "ring" | "belt" | etc.
system.armor.value         — base AC bonus (number)
system.armor.dex           — max Dex bonus (number | null for unlimited)
system.armor.acp           — armor check penalty (negative number)
system.armor.spl           — arcane spell failure chance (0–100%)
system.armor.speed         — speed adjustment map { "30": 20, "20": 15 }
system.equipped            — boolean
system.changes[]           — for magical bonuses
```

---

## Buff Schema

Buffs are item type `buff` stored on the actor (not AEs):

```
system.active              — boolean (is the buff currently applied?)
system.buffType            — "temp" | "perm" | "item" | "shapechange" | "misc"
system.duration.value      — number
system.duration.units      — "round" | "minute" | "hour" | "day" | "instantaneous"
system.duration.remaining  — rounds remaining (combat tracker)
system.changes[]           — stat changes applied when active
system.contextNotes[]      — situational bonuses shown in roll dialogs
```

---

## Class Schema

```
system.hd                  — hit die (4 | 6 | 8 | 10 | 12)
system.bab                 — BAB progression: "low" | "med" | "high"
system.savingThrows.fort   — "low" | "high"
system.savingThrows.ref    — "low" | "high"
system.savingThrows.will   — "low" | "high"
system.classSkills         — array of skill keys (e.g. ["blf", "dip", "spe"])
system.skillsPerLevel      — number (base skill points per level)
system.classType           — "base" | "prestige" | "npc" | "monster"
system.levels              — current class level
```

---

## Spell Schema

```
system.level               — spell level (0–9)
system.school              — "abj" | "con" | "div" | "enc" | "evo" | "ill" | "nec" | "tra" | "uni"
system.subschool           — e.g. "calling", "charm", "compulsion"
system.descriptors         — array: ["fire"], ["mind-affecting"], etc.
system.components.value    — array: ["verbal", "somatic", "material", "focus", "divine"]
system.components.materialDesc — material component description
system.preparation.preparedAmount — slots currently prepared
system.preparation.maxAmount     — max preparable
system.preparation.autoDeductCharges — boolean
system.spellDuration.value — duration formula
system.spellDuration.units — "round" | "minute" | etc.
system.spellEffect.range   — range string
system.spellEffect.area    — area string
system.spellEffect.targets — target string
system.activation          — { type: "standard" | "move" | "swift" | "immediate" | "free" | "fullRound" }
```

---

## Context Notes vs Changes

- **`changes[]`**: Apply numeric bonuses to actor stats at data preparation time. Always active when the item is active/equipped.
- **`contextNotes[]`**: Show descriptive text in roll dialogs (e.g. "+2 on saves vs. fear"), but do **not** apply automatically — they are informational only and require manual interpretation by the player.

This distinction is important for migration: contextNotes are typically not converted to AEs in dnd35e; they become tooltip text or condition descriptions.

---

## How D35E Aggregates Stats

D35E rebuilds derived stats every `prepareDerivedData()` call:

1. Reset all derived stats (AC, saves, BAB, etc.) to base values
2. Iterate all owned items
3. For each active item, evaluate and apply its `changes[]` array in priority order
4. For unequipped equipment: changes are not applied
5. For inactive buffs (`system.active = false`): changes are not applied
6. Result is stored as `system.attributes.*` totals

**Key consequence for migration**: D35E does not use Foundry AEs for this pipeline. When you import a D35E world, no Foundry AEs will be present — all stat modification lives in `system.changes[]` on items.

---

## Migration Notes (Screenshots)

The `migration notes/` folder contains UI screenshots from the D35E system showing field layout:

| Folder | Contents |
|--------|----------|
| `migration notes/weapon/` | Weapon sheet tabs: description, details (3 views), attack config |
| `migration notes/equipment/` | Equipment sheet: description, details, changes/flags config (3 views) |
| `migration notes/effects/` | 5e AE UI screenshots (reference for comparison, not D35E native) |

Use these to visually confirm what D35E surfaced in its UI vs. what fields we need to support in dnd35e.

---

## Gotchas

- **D35E does NOT use Foundry Active Effects for stat bonuses** — all numeric modifications live in `system.changes[]` on items. A freshly imported D35E world will have zero Foundry AEs for stat modifications. Never look for AEs when investigating a D35E buff or equipment bonus.

- **`contextNotes[]` are informational only** — they appear as text in roll dialogs but do NOT apply numerically to actor stats. Never confuse a contextNote with a `changes[]` entry. During migration, contextNotes become tooltip/description text, not AEs.

- **D35E stacking is NOT enforced by the system** — all `changes[]` entries are summed regardless of `modifier` (bonus type). The `modifier` field is purely a display label. Only careful item design avoids double-stacking — the engine does not police it.

- **System ID is `D35E` (all caps)** — case-sensitive in Foundry world data. Filtering by system ID or compendium paths requires `"D35E"`, not `"d35e"`.

- **`system.active` gates buff changes; `system.equipped` gates equipment changes** — a buff's `changes[]` are ignored unless `system.active === true`. Equipment `changes[]` are ignored unless `system.equipped === true`. Off/unequipped items contribute nothing to actor stats.

---

## Related Skills

- **`/srd-lookup`**: Raw 3.5e rules text — spells, feats, conditions
- **`/system-comparison`**: Side-by-side comparison of D35E, dnd5e, and PF2e implementations
- **`/foundry-reference`**: Foundry v14 API for implementing things in code
- **`/implementation-guide`**: Step-by-step workflow for adding a feature to dnd35e
