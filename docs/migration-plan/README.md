# D35E → dnd35e Migration Plan

> Rebuild of the legacy D35E system into a modern Foundry VTT system using TypeScript, Vue 3, Vite, and modern data model patterns.

---

## Architecture Principles

| Principle | Description |
|-----------|-------------|
| **One type at a time** | Add one representative of each document type, get it working end-to-end, then expand |
| **Active Effects over embedded logic** | Anything that *modifies* another document's data should be an Active Effect type, not baked-in item logic. Items that grant bonuses dynamically generate AE changes in `prepareDerivedData()` (the Material pattern). |
| **Component composition** | Use the existing mixin/component pattern (`PhysicalItem → EquippableItem → Weapon`) rather than deep inheritance |
| **Vue 3 + Pinia sheets** | All sheets are Vue SFC apps with Pinia stores (already established) |
| **Type-safe schemas** | `DataModel` subclasses with `defineSchema()` for every document type |
| **Formula system** | Leverage the existing formula/intellisense system for all computed values |
| **Two-phase effect application** | Initial phase (during `prepareEmbeddedDocuments`) and Final phase (during `prepareDerivedData`) |
| **Actions live on items** | Items own their actions via an Action System; actions can be checks, attacks, spell casts, and can be chained into sequences |
| **Localize early** | All user-facing strings use i18n keys from Phase 3 onward — no hardcoded English. Pre-localize CONFIG objects at init time. |
| **Compendium as source of truth** | All SRD content stored as JSON in source, built to Foundry packs. Compendium browsers provide amalgamated cross-pack search. |
| **Bonus type stacking** | Introduced when the first real use case arises (equipment AC in Phase 10) and refined throughout |
| **Document store refresh on update** | Override `update()` on all document classes to refresh active Pinia stores, ensuring Vue reactivity stays in sync with Foundry's data layer |

---

## Current State

| Component | Status | Notes |
|-----------|--------|-------|
| **Weapon** item type | 🔶 ~75% | Data model done, attack section placeholder, some sheet Vue components missing |
| **Material** active effect | 🔶 ~50% | Material AE works, base effect infrastructure in progress |
| **PhysicalItem / EquippableItem** chain | ✅ | Weight, price, hardness, HP, equipment slots |
| **Identifiable document** mixin | ✅ | Tracked/identified states with formula-driven names. Uses `system.slug` |
| **Actor (character)** type shell | ✅ | Exists but has no meaningful system data |
| **Token / Scene** type wrappers | ✅ | Exist as type aliases, no custom logic |
| **Active Effect phase system** | ✅ | Initial/final phase application with per-change item/actor targeting |
| **Settings framework** | ✅ | Combat, display, health, roll, skills, currency, game rules categories |
| **Formula/Intellisense system** | ✅ | Autocomplete for formulas in sheets |
| **Build pipeline** | ✅ | Vite + Vue SFC + SASS + HBS template copy + lang merge |

---

## Phase Overview

| # | Phase | Status | Dependencies |
|---|-------|--------|--------------|
| 1 | [Item Foundation (Weapon PoC)](phase-01-item-foundation.md) | 🔶 ~75% | — |
| 2 | [Active Effect on Item (Material)](phase-02-active-effect-on-item.md) | 🔶 ~50% | Phase 1 |
| 3 | [Localization Pattern](phase-03-localization.md) | 🔜 NEXT | — |
| 4 | [Actor Foundation](phase-04-actor-foundation.md) | — | Phase 1, 3 |
| 5 | [Token & Scene](phase-05-token-scene.md) | — | Phase 4 |
| 6 | [Basic Combat](phase-06-basic-combat.md) | — | Phase 4, 5 |
| 7 | [Combat Tracker](phase-07-combat-tracker.md) | — | Phase 6 |
| 8 | [Testing Infrastructure](phase-08-testing.md) | — | Phase 4 |
| 9 | [Roll Formula Integration](phase-09-roll-formulas.md) | — | Phase 6 |
| 10 | [Equipment & Loot](phase-10-equipment-loot.md) | — | Phase 4, 9 |
| 11 | [Features & Feats](phase-11-features-feats.md) | — | Phase 4 |
| 12 | [Races & Heritage](phase-12-races-heritage.md) | — | Phase 11 |
| 13 | [Classes & Levels](phase-13-classes-levels.md) | — | Phase 11, 12 |
| 14 | [Spells & Spellbooks](phase-14-spells-spellbooks.md) | — | Phase 4, 9 |
| 15 | [Psionics](phase-15-psionics.md) | — | Phase 14 |
| 16 | [Buffs & Conditions](phase-16-buffs-conditions.md) | — | Phase 10 |
| 17 | [Consumables](phase-17-consumables.md) | — | Phase 4 |
| 18 | [Action System](phase-18-action-system.md) | — | Phase 6, 9 |
| 19 | [Natural & Special Attacks](phase-19-natural-attacks.md) | — | Phase 18 |
| 20 | [Advanced Actor Types](phase-20-advanced-actors.md) | — | Phase 4 |
| 21 | [Enhancements](phase-21-enhancements.md) | — | Phase 10 |
| 22 | [Auras & Area Effects](phase-22-auras.md) | — | Phase 5, 16 |
| 23 | [Compendium Infrastructure](phase-23-compendiums.md) | — | Phase 10+ |
| 24 | [Content Migration](phase-24-content-migration.md) | — | Phase 23 |

---

## Dependency Graph

```
Phase 1 (Weapon) ─────┬──→ Phase 2 (Material AE)
                       │
Phase 3 (Localization) ┤
                       │
                       ├──→ Phase 4 (Actor) ──┬──→ Phase 5 (Token/Scene) ──→ Phase 6 (Basic Combat) ──→ Phase 7 (Combat Tracker)
                       │                      │                                     │
                       │                      ├──→ Phase 8 (Testing)                ├──→ Phase 9 (Roll Formulas)
                       │                      │                                     │
                       │                      ├──→ Phase 11 (Feats) ──→ Phase 12 (Races) ──→ Phase 13 (Classes)
                       │                      │
                       │                      ├──→ Phase 14 (Spells) ──→ Phase 15 (Psionics)
                       │                      │
                       │                      ├──→ Phase 17 (Consumables)
                       │                      │
                       │                      └──→ Phase 20 (Advanced Actors)
                       │
                       └──→ Phase 9 (Roll Formulas) ──→ Phase 10 (Equipment) ──┬──→ Phase 16 (Buffs)
                                                                                ├──→ Phase 21 (Enhancements)
                                                                                └──→ Phase 23 (Compendiums) ──→ Phase 24 (Migration)
                       
Phase 6 + 9 ──→ Phase 18 (Action System) ──→ Phase 19 (Natural Attacks)
Phase 5 + 16 ──→ Phase 22 (Auras)
```

---

## Cross-Cutting Concerns

These apply across multiple phases and should be kept in mind throughout:

### Bonus Type Stacking
First introduced in Phase 10 (Equipment). The `Dnd35eEffectChangeData` is extended with a `bonusType` field. During `applyActiveEffects()`, bonuses of the same type to the same field only apply the highest value (except dodge and untyped, which always stack). Penalty bonuses always apply.

### Formula Evaluation & Error Surfacing
The `FormulaFormGroup` component handles field-level formula validation. System-level formula evaluation errors during `prepareDerivedData()` also need surfacing — consider a preparation warning system that collects errors without blocking data prep.

### Document Store Refresh
All document classes override `update()` to refresh active Pinia stores, keeping Vue reactivity in sync with Foundry's data layer. Establish this pattern from Phase 1 and maintain it for every new document type.

### Pre-localization
CONFIG objects (abilities, skills, sizes, damage types, etc.) are pre-localized at system init time so they can be used directly in Vue templates without repeated `game.i18n.localize()` calls. Established in Phase 3.

### Grant System
First implemented in Phase 12 (Races), reused by Phase 13 (Classes). Handles creating/removing items on actors from `grantedFeatures[]` arrays with UUID references and level gating.

### Migration Versioning
Track `system.migration.version` on every actor/item. On world load, run all migrations newer than the stored version. Schema migration infrastructure lives in Phase 23 (Compendiums). Start tracking the version field from Phase 4 (Actor Foundation).

---

## Item Type → Active Effect Decision Guide

| Question | If YES → | If NO → |
|----------|----------|---------|
| Does it exist independently? (compendium, traded, sold) | **Item** | Probably AE |
| Does it primarily *modify* another document's data? | **Active Effect** | Probably Item |
| Does it have its own sheets/UI that users edit? | **Item** (with AE generation) | **Active Effect** |
| Is it temporary / has a duration? | **Active Effect** | Depends |
| Does it transfer to the parent's parent? (item → actor) | **Active Effect** with `transfer: true` | AE with `transfer: false` |

### D35E Item → dnd35e Type Mapping

| D35E Type | dnd35e Type | Notes |
|-----------|-------------|-------|
| Weapon | Weapon item | Field renames |
| Equipment | Equipment item | — |
| Loot | Loot item | — |
| Consumable | Consumable item | — |
| Class | Class item | Restructured progression |
| Spell | Spell item | Restructured |
| Feat | Feat item | Changes → AE pattern |
| Buff | **Buff Active Effect** | Item → AE migration |
| Attack | Attack item | Actions via Action System |
| Race | Race item | Restructured with grants |
| Enhancement | **Enhancement Active Effect** | Item → AE |
| Material | **Material Active Effect** | Already done |
| Aura | **Aura Active Effect** | Item → AE |
| Alignment | Actor property | Dropped as type |
| Damage-type | Constant | Dropped as type |
| Full-attack | Action Chain | Dropped as type |
| Card | Defer or drop | — |
| Valuable | Loot subtype | — |
