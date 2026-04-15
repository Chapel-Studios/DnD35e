# Phase 36: Psionic Rules (Full)

| Field | Value |
|-------|-------|
| **Status** | � Rough Sketch |
| **Milestone** | Post-Release |
| **Dependencies** | Phase 28 (Psionics), Phase 25 (Enhancements Full), Phase 35 (Epic Level Rules) |
| **Goal** | Full psionic expansion: all SRD powers, psionic prestige classes, psionic items, psionic feats, psi-spell transparency, and epic psionics. Exists in D35E — SRD OGC content. |

---

## Overview

Phase 28 (Beta) builds the psionic foundation: power item type (`isPsionic` on Spell), power points, augmentation, psionic resistance, and 3 POC powers. This phase expands that foundation to full SRD coverage — all psionic disciplines, psionic prestige classes, psionic item categories, psionic feats, the psi-spell transparency rule, and epic psionic manifestation.

---

## 36.1 Psi-Spell Transparency

The SRD default: **psionics and magic are transparent to each other**. This is the most impactful architectural decision because it determines whether psionic effects interact with the existing spell infrastructure or need a parallel system.

### Default Mode (Transparency)

- `Dispel Magic` targets psionic effects; `Dispel Psionics` targets magical effects
- **Spell Resistance = Power Resistance** — same `derived.sr` field. A creature with SR 25 also has PR 25
- `Antimagic Field` suppresses psionic effects
- `Detect Magic` detects psionic auras (and vice versa)
- Counterspelling works cross-discipline (an arcane caster can counterspell a manifester if they ready the appropriate action)

### Variant Mode (Separate)

System setting: `dnd35e.psionics.transparency` — `'transparent'` (default) | `'separate'`.

When `separate`:
- SR and PR are tracked independently: `derived.sr` (spell) and `derived.pr` (psionic)
- `Antimagic Field` does not suppress psionic effects (and vice versa for `Null Psionics Field`)
- Detection and counterspelling do not cross disciplines

### Implementation

The SR check in the Action System (Phase 10) already references `target.derived.sr`. With transparency:
- Psionic powers use the same SR check code path
- `derived.sr` is the single field

With separate mode:
- Powers check `target.derived.pr` instead of `target.derived.sr`
- A `pr` field is added to the actor schema (only used when transparency is off)
- The action resolver checks `power.system.isPsionic` to pick the right resistance field

---

## 36.2 Psionic Prestige Classes

Psionic prestige classes use the existing Class item with `isPsionic: true` on their progression. Key SRD psionic prestige classes:

| Class | Concept | Manifesting Advancement |
|-------|---------|------------------------|
| Cerebremancer | Dual arcane/psionic | Both arcane caster level and manifester level advance |
| Elocater | Spatial mobility | +1 manifester level at most levels |
| Metamind | PP mastery | +1 manifester level, bonus PP |
| Psion Uncarnate | Incorporeal manifester | +1 manifester level at most levels |
| Pyrokineticist | Fire specialist | No manifesting advancement (unique fire abilities) |
| Slayer | Psionic hunter | Limited manifesting advancement |
| Thrallherd | Psionic leadership | +1 manifester level, gains thralls |
| War Mind | Combat manifester | Limited manifesting advancement |

### Dual Progression (Cerebremancer)

The Cerebremancer advances both an arcane spellcasting class and a psionic manifesting class. This uses the same `advancesSpellcasting` pattern from Phase 20 — the prestige class's level-up grant specifies which existing spellbook/power book to advance.

```
grantSchedule entry:
  { at: 2, type: 'advanceProgression', target: 'psionic', selectFrom: 'existing' }
  { at: 2, type: 'advanceProgression', target: 'arcane', selectFrom: 'existing' }
```

The level-up flow prompts the player to select which arcane class and which psionic class to advance.

---

## 36.3 Psionic Feats

Psionic feats use the existing `FeatSystemModel` with `isPsionic: true`. Key categories:

### Metapsionic Feats

Mirror metamagic feats (Phase 26) but cost extra PP instead of raising spell level:

| Feat | Effect | Extra PP Cost |
|------|--------|---------------|
| Empower Power | +50% variable effects | +2 |
| Extend Power | Double duration | +2 |
| Maximize Power | Max variable effects | +4 |
| Quicken Power | Manifest as swift action | +6 |
| Widen Power | Double area | +4 |

The PreRollDialog (Phase 11) surfaces metapsionic options during manifestation. PP cost is adjusted at manifest time — no separate "heightened power" concept like metamagic's slot adjustment. The augmentation dialog (Phase 28) already handles variable PP costs, so metapsionic feats add entries to the same dialog.

### Psionic Focus

Several psionic feats require or expend **psionic focus** — a resource gained by concentrating (full-round action, DC 20 Concentration check). Tracked as `derived.psionicFocus: boolean` on the actor. Feats that expend focus (e.g., Psionic Meditation, Psionic Weapon) set it to false on use.

```
derived.psionicFocus: boolean     // true = focused, false = unfocused
```

Regaining focus: Full-round action, Concentration check DC 20. The Psionic Meditation feat allows regaining focus as a move action.

---

## 36.4 Psionic Items

Psionic items parallel magic item categories and use the existing Enhancement (Phase 25) and Consumable (Phase 22) infrastructure.

### Psionic Weapons & Armor

Use the Enhancement system (Phase 25) with psionic-specific special abilities:

| Enhancement | Type | Effect |
|-------------|------|--------|
| Collision | Weapon | +5 damage |
| Mindcrusher | Weapon | Drains PP on hit |
| Psychokinetic | Weapon | +1d4 force damage |
| Soulbreaker | Weapon | Negative levels on crit |
| Quickness | Armor | +1 enhancement to speed |

These are enhancement AEs with psionic flavor — no structural difference from magical weapon/armor enhancements. The `isPsionic` flag on the enhancement AE allows filtering in the compendium browser.

### Consumable Psionic Items

| Item Type | Magic Equivalent | Phase 22 Model |
|-----------|-----------------|----------------|
| Dorje | Wand | Consumable with `subtype: 'dorje'`, 50 charges, manifests a power |
| Power Stone | Scroll | Consumable with `subtype: 'powerStone'`, single-use manifestation |
| Psicrown | Staff | Consumable with `subtype: 'psicrown'`, multiple powers, PP-based charges |
| Cognizance Crystal | — | Equipment item that stores bonus PP, `system.powerPoints: { max, value }` |

Dorjes, power stones, and psicrowns use the existing Consumable item infrastructure (Phase 22) with psionic subtypes. The manifestation flow mirrors the existing cast-from-item flow but draws from PP or charges.

### Cognizance Crystal

A special equipment item that stores extra PP. The actor's total available PP at manifest time includes PP from equipped cognizance crystals:

```
totalAvailablePP = spellbook.spellPoints.value + sum(equippedCognizanceCrystals.powerPoints.value)
```

---

## 36.5 Full Power Compendium

Phase 28 implements 3 POC powers. This phase packs all SRD psionic powers (approximately 200+) into compendium packs.

### Psionic Disciplines (7)

| Discipline | Focus | Example Powers |
|------------|-------|---------------|
| Clairsentience | Divination/sensing | Clairvoyant Sense, Remote Viewing, Fate of One |
| Metacreativity | Creation of matter/ectoplasm | Astral Construct, Ectoplasmic Cocoon, Genesis |
| Psychokinesis | Energy/force manipulation | Energy Ball, Telekinetic Thrust, Inertial Armor |
| Psychometabolism | Self-transformation | Metamorphosis, Animal Affinity, Vigor |
| Psychoportation | Teleportation/movement | Dimensional Door (Psi), Teleport (Psi), Time Hop |
| Telepathy | Mind-affecting | Mind Blast, Dominate (Psi), Mind Shield |
| Universal | No discipline restriction | Detect Psionics, Dispel Psionics, Psionic Contingency |

Each power's `system.school` field maps to a discipline when `isPsionic` is true. The compendium browser filters powers by discipline.

---

## 36.6 Epic Psionics

Mirrors epic spellcasting (Phase 35 §35.5) for psionic manifesters. Requires Phase 35 to be implemented first.

- **Epic Manifestation** feat: requires manifester level 21+, appropriate Knowledge check 24 ranks
- **Epic psionic powers** use the same seed/DC system as epic spells, with psionic seeds
- **Epic psionic feats**: Epic Psionic Focus, Power Knowledge (learn extra powers), Epic Manifestation
- PP scaling continues past level 20 per class table — the `spellPoints.max` formula in the spellbook already handles this if the manifester level keeps incrementing

Epic psionic items (e.g., Rings of Epic Psionics referenced in D35E's changelog) use the epic enhancement rules from Phase 35 with psionic subtypes.

---

## 36.7 D35E Migration Notes

| D35E Feature | dnd35e Equivalent |
|--------------|-------------------|
| Psionic powers (existing list) | Spell items with `isPsionic: true`, packed into psionic compendium |
| Psionic feats (metapsionic, etc.) | Feat items with `isPsionic: true` |
| Psionic prestige classes | Class items with psionic progressions |
| Psionic item properties | Enhancement AEs with `isPsionic: true` |
| Psi-spell transparency | System setting `dnd35e.psionics.transparency` |
| Rings of Epic Psionics | Epic psionic enhancement items |

---

## Open Questions

- **Phase 28 boundary**: Phase 28 builds the engine (power points, augmentation, manifestation flow, PR). Phase 36 uses that engine to pack full content and add prestige classes, feats, items. Is this boundary clean or do some structural pieces (like metapsionic PP adjustment) need to be in Phase 28?
- **Psionic focus tracking**: Should psionic focus be a condition (Phase 15/21) or a simple boolean on the actor? Conditions have token icon support, but focus is player-side and binary.
- **Cognizance crystal PP**: Does the crystal's PP pool merge with the character's pool, or are they tracked separately and the character can choose to draw from either?
