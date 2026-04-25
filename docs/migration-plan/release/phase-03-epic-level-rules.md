# Phase 35: Epic Level Rules

| Field | Value |
|-------|-------|
| **Status** | 📖 Rough Sketch |
| **Milestone** | Post-Release |
| **Dependencies** | Phase 9 (Classes & Level History), Phase 11 (Feats), Phase 20 (Spells & Spellbooks Full) |
| **Goal** | Level 21+ support: epic BAB/save progression, epic feats, epic spellcasting, and epic DR/enhancement rules. Exists in D35E — SRD OGC content. |

---

## Overview

Characters beyond 20th level enter the **epic** tier. BAB and saves switch to a flat +1 per 2 levels rate regardless of class, iterative attacks cap at 4 from BAB, feat milestones shift to every 3 levels, and epic spellcasting uses a Spellcraft DC system instead of spell slots. D35E already implements epic BAB/save splitting, iterative caps, and spell level 10 — this phase ports and restructures that logic into the new architecture.

---

## 35.1 Epic Level Detection

The epic threshold is **total base + prestige class levels ≥ 21**. Racial HD do not count toward this threshold (matching SRD and D35E behavior).

**Implementation**: During `prepareDerivedData()`, the actor counts `levelHistory` entries by progression source type. Entries from progressions with `sourceType: 'class'` or `sourceType: 'prestige'` count toward the threshold. Entries from `sourceType: 'racial'` do not.

```
derived.epicLevels = max(0, classAndPrestigeLevels - 20)
derived.isEpic    = epicLevels > 0
```

The level-up flow (Phase 9 §8.6) needs no structural change — epic characters simply continue adding `LevelRecord` entries. The progression component's `babRate`, `saveRates`, and `hdSize` still apply to each level; the difference is that BAB and saves are computed differently once `isEpic` is true.

---

## 35.2 Epic BAB & Saves

### BAB

- **Non-epic BAB** = standard aggregation from all class progressions, capped at character level 20 worth of class levels
- **Epic BAB** = `ceil(epicLevels / 2)` — flat rate, independent of class BAB rate
- **Total BAB** = nonEpicBAB + epicBAB

The actor tracks both `derived.bab.nonepic` and `derived.bab.total`. Iterative attacks are computed from `bab.nonepic` only — the iterative sequence stops at +16/+11/+6/+1 (max 4 attacks from BAB). Epic BAB adds to all attack rolls but does not generate additional iteratives.

### Saves

- **Non-epic saves** = standard aggregation from class progressions (Good/Poor rates) for levels 1–20
- **Epic saves** = `floor(epicLevels / 2)` — same flat rate for all three saves (Fort, Ref, Will) regardless of whether they were Good or Poor pre-epic
- **Total save** = nonEpicSave + epicSave + ability mod + other bonuses

### Implementation

The class AE generation in `prepareDerivedData()` (Phase 9) splits at the epic threshold. For each class, levels up to the class's contribution before the character reaches level 20 use the standard `babRate`/`saveRate` formulas. Levels beyond the threshold use the epic formulas. This matches D35E's approach of tracking `bab.nonepic` separately.

**Fractional BAB setting**: When enabled (Phase 9 system setting), epic fractional BAB sums raw fractional values before rounding — the existing fractional mode just extends with epic levels using 0.5/level. Standard mode uses `ceil(epicLevels / 2)`.

---

## 35.3 Epic Milestones

| Milestone | Non-Epic Schedule | Epic Schedule |
|-----------|------------------|---------------|
| Feat | Every 3 HD (1, 3, 6, 9, ...) | Every 3 levels after 20 (23, 26, 29, ...) |
| Ability +1 | Every 4 HD (4, 8, 12, 16, 20) | Every 4 HD (24, 28, 32, ...) |
| HD / HP | Every level with HD | Continues — class HD size unchanged |
| Skill points | Every level | Continues — class skill points unchanged |

The level-up flow detects epic feat milestones at `(totalClassLevels - 20) % 3 === 0` when `isEpic`. Ability score milestones continue on the existing 4-HD schedule with no change.

---

## 35.4 Epic Feats

Epic feats use the existing `FeatSystemModel` (Phase 11) with an `isEpic: true` flag — not a separate item type. This matches D35E's `itemDescription.epic` field approach.

```
FeatSystemModel (extended)
  isEpic:  boolean    // true for epic feats
```

**Prerequisite patterns for epic feats** (validated by the Central Prerequisite Registry):
- Character level 21+
- Ability score minimums (e.g., STR 25)
- BAB thresholds (e.g., BAB +21)
- Skill rank thresholds (e.g., Spellcraft 24)
- Feat chain prerequisites (e.g., Improved Critical → Devastating Critical → Overwhelming Critical)
- Caster/manifester level thresholds (e.g., able to cast 9th-level spells)

The prerequisite registry (Phase 9) already supports all these check types — no architectural change needed. Epic feats are just feats with higher thresholds.

**Compendium**: SRD epic feats are packed as standard Feat items with `isEpic: true`. The compendium browser (Phase 29) can filter by this flag.

---

## 35.5 Epic Spellcasting

Epic spells (level 10+) use the **Spellcraft DC** system, not standard spell slots.

### Spell Seed System

Epic spells are constructed from **spell seeds** — fundamental magical effects with base Spellcraft DCs. Combining seeds and adding factors (increased range, AoE, duration, etc.) raises the DC. Mitigating factors (expensive material components, backlash damage, casting time increase, multiple casters) lower the DC.

**Data model**: Epic spells are Spell items with `system.level >= 10`. They gain an `epicData` embedded object:

```
epicData: {
  seeds:         { name, baseDC }[]     // spell seeds used
  factors:       { description, dcMod }[]  // DC increases
  mitigations:   { description, dcMod }[]  // DC reductions
  finalDC:       number                 // derived: sum of all
  usesPerDay:    number                 // default 1
}
```

### Casting Flow

1. Select epic spell → 2. Spellcraft check vs `epicData.finalDC` → 3. On success: spell resolves normally (attack rolls, saves, effects) → 4. On failure: spell fizzles, daily use consumed → 5. Chat card shows DC, roll, and outcome

### Spellbook Integration

Epic spells appear in a dedicated "Epic" section of the spellbook (matching D35E's spell level 10 approach). The slot UI is hidden for this section — replaced by a uses/day counter. The spellbook's `slots[10]` entry tracks `{ max: usesPerDay, value: remaining }`.

---

## 35.6 Epic Enhancements & DR

### Epic Weapons for DR

Weapons with enhancement bonus ≥ +6 (or explicitly flagged epic) bypass epic DR. The attack item tracks `derived.isEpicWeapon` — true when effective enhancement ≥ +6 or when the `isEpic` override flag is set (matching D35E's `system.epic` checkbox on attacks).

### DR/epic

A new DR type entry: `epic`. Only epic weapons bypass it. Fits into the existing DR resolution pipeline (Phase 10) — the damage resolver checks `weapon.derived.isEpicWeapon` against the target's `dr.epic` value.

---

## 35.7 D35E Migration Notes

| D35E Feature | dnd35e Equivalent |
|--------------|-------------------|
| `bab.total` / `bab.nonepic` / `bab.epic` | `derived.bab.total` / `derived.bab.nonepic` — epic computed in `prepareDerivedData()` |
| `itemDescription.epic` on items | `system.isEpic` boolean flag |
| Spell level 10 section in spellbook | `slots[10]` with hidden slot UI, uses/day counter |
| `system.epic` on attack items | `derived.isEpicWeapon` from enhancement total or override flag |
| Epic BAB formula `ceil(@level/2)` | Same formula, applied in AE generation |
| Epic save formula `floor(@level/2)` | Same formula, applied in AE generation |

---

## Open Questions

- Epic spell **seed compendium** — should seeds be standalone items or embedded data in the epic spell?
- Epic prestige class progressions — do any epic prestige classes exist in SRD OGC? If so, they need progression templates.
- **Epic psionic overlap** with Phase 36 — epic manifestation uses similar seed/DC mechanics. Should epic psionic manifesting live here or in Phase 36?
