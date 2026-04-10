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
| **Formula system** | Leverage FormulaFamiliar with `#context.property` syntax for all computed values |
| **Two-phase effect application** | Initial phase (during `prepareEmbeddedDocuments`) and Final phase (during `prepareDerivedData`) |
| **Actions live on items** | Items own their actions via the Action System (Phase 8); actions can be checks, attacks, spell casts, and can be chained into sequences |
| **Localize early** | All user-facing strings use i18n keys from Phase 3 onward — no hardcoded English. Pre-localize CONFIG objects at init time. |
| **Compendium as source of truth** | All SRD content stored as JSON in source, built to Foundry packs. Compendium browsers provide amalgamated cross-pack search. |
| **Bonus type stacking** | Introduced in Phase 2 (Material AE) with the stacking engine and `bonusType` field. Materials prove the highest-wins resolution. Expanded with more bonus types as new item types are added (equipment AC types in Phase 15, etc.) |
| **Document store refresh on update** | Override `update()` on all document classes to refresh active Pinia stores, ensuring Vue reactivity stays in sync with Foundry's data layer |
| **Build toward the Action System** | Every phase that touches combat data (BAB, saves, AC, feats, conditions) is designed knowing its output will feed into Phase 8's ActionDataModel, TurnActionBudget, and ExecutionEngine. No throwaway combat code. |

---

## Milestones

### POC — Proof of Concept

**Goal**: A playable combat scenario with a martial character. One of everything, touching all building blocks. A Fighter with a longsword can enter combat, take turns with the action economy state machine, make attacks (including progressive full attack), apply feat modifiers, and trip opponents.

**What POC includes**:
- One actor type (Character) with ability scores, BAB, HP, flat AC, saves, speed
- One item type (Weapon) with attack/damage actions — already done
- One AE type (Material) — already done
- Bonus type stacking engine proven via Material AEs (materials inherently don't stack)
- The full Action System: ActionDataModel, chains, execution engine, action formulas
- Combat tracker with initiative, turns, TurnActionBudget state machine, progressive full attack
- Token movement integrated with action economy (5-foot step, move action, charge)
- Three feats proving the full effect pipeline: passive (Weapon Focus), toggle (Power Attack), trigger (Cleave)
- One race with ability adjustments, size, speed, and the grant system
- One class with BAB/save progression, HD, and basic level-up
- One condition (Prone) proving the maneuver → condition pipeline (trip works end-to-end)
- Testing infrastructure validating all building blocks

**What POC does NOT include**: Equipment AC (flat numbers), spells, psionics, consumables, multiple actor types, enhancements, auras, data migration. These are Beta.

**POC exit criteria**: A GM can create a level 5 Fighter (Human) with a longsword, enter combat against a goblin (manual NPC), roll initiative, take turns with the progressive full attack state machine, apply Power Attack per-attack, get a Cleave bonus attack on kill, trip an enemy to apply Prone, and see all results in per-attack chat cards.

---

### Beta — Full System Coverage

**Goal**: Expand from one-of-everything to complete D&D 3.5e system coverage. All item types, all actor types, full condition/buff system, spellcasting, equipment with AC, enhancements.

**Beta is "putting existing building blocks together in new ways"**: The action system infrastructure from POC doesn't change — Beta adds more action types (spells, consumables), more feat effects, more conditions, and more item types that plug into the existing ActionDataModel and TurnActionBudget.

---

### Release — Migration & Content

**Goal**: Migrate existing D35E worlds and content to the new system. Compendium browser & management, SRD content packs, world migration tools.

---

## Current State

| Component | Status | Notes |
|-----------|--------|-------|
| **Weapon** item type | ✅ | Data model done. Attack actions deferred to Phase 8. |
| **Material** active effect | ✅ | Material AE works, base effect infrastructure complete. |
| **PhysicalItem / EquippableItem** chain | ✅ | Weight, price, hardness, HP, equipment slots |
| **Identifiable document** mixin | ✅ | Tracked/identified states with formula-driven names. Uses `system.slug` |
| **Actor (character)** type shell | ✅ | Exists but has no meaningful system data |
| **Token / Scene** type wrappers | ✅ | Exist as type aliases, no custom logic |
| **Active Effect phase system** | ✅ | Initial/final phase application with per-change item/actor targeting |
| **Settings framework** | ✅ | Combat, display, health, roll, skills, currency, game rules categories |
| **FormulaFamiliar system** | ✅ | Schema-driven autocomplete with `#context.property` syntax |
| **Build pipeline** | ✅ | Vite + Vue SFC + SASS + lang merge |

---

## Status Legend

| Symbol | Meaning | Description |
|--------|---------|-------------|
| 📖 Rough Sketch | Rough Sketch | AI reading from existing systems with minimal planning input |
| 📋 Outlined | Outlined | Basic implementation discussions with AI, approach defined |
| 📝 Planned | Planned | Detailed checklist created, implementation strategy confident |
| 🔶 In Progress | In Progress | Active development, with percentage based on checklist completion |
| ✅ Complete | Complete | Majority of work done, moved on to next features |
| 🔒 Hardened | Hardened | Completed and verified—all details checked and locked down |

---

## Phase Overview

### Milestone 1: POC

| # | Phase | Status | Dependencies | Milestone |
|---|-------|--------|--------------|-----------|
| 1 | [Item Foundation (Weapon PoC)](phase-01-item-foundation.md) | ✅ Complete | — | POC |
| 2 | [Active Effect on Item (Material)](phase-02-active-effect-on-item.md) | 🔶 In Progress (50%) | Phase 1 | POC |
| 3 | [Localization Pattern](phase-03-localization.md) | 🔶 In Progress (50%) | — | POC |
| 4 | [Compendium Foundation](phase-04-compendium-foundation.md) | 📋 Outlined | Phase 1, 2, 3 | POC |
| 5 | [Actor Foundation](phase-05-actor-foundation.md) | � Outlined | Phase 1, 3 | POC |
| 6 | [Token & Scene](phase-06-token-scene.md) | 📖 Rough Sketch | Phase 5 | POC |
| 7 | [Roll Formulas & Custom Rolls](phase-07-roll-formulas.md) | � Outlined | Phase 5 | POC |
| 8 | [Action System](phase-08-action-system.md) | 📋 Outlined | Phase 6, 7 | POC |
| 9 | [Combat Tracker & Turn Economy](phase-09-combat-tracker-turn-economy.md) | 📋 Outlined | Phase 8 | POC |
| 10 | [Features & Feats (POC)](phase-10-features-feats.md) | � Outlined | Phase 5, 8 | POC |
| 11 | [Races](phase-11-races.md) | � Outlined | Phase 4, 10 | POC |
| 12 | [Classes (POC)](phase-12-classes.md) | � Outlined | Phase 4, 11 | POC |
| 13 | [Conditions (Minimal)](phase-13-conditions-poc.md) | � Outlined | Phase 8 | POC |
| 14 | [Testing & POC Validation](phase-14-testing-poc-validation.md) | 📖 Rough Sketch | Phases 9–13 | POC |

### Milestone 2: Beta

| # | Phase | Status | Dependencies | Milestone |
|---|-------|--------|--------------|-----------|
| 15 | [Equipment & Loot](phase-15-equipment-loot.md) | 📖 Rough Sketch | Phase 5, 7 | Beta |
| 16 | [Spells & Spellbooks (POC)](phase-16-spells-spellbooks.md) | 📖 Rough Sketch | Phase 7, 8 | Beta |
| 17 | [Metamagic](phase-17-metamagic.md) | 📖 Rough Sketch | Phase 10, 16 | Beta |
| 18 | [Area Effects & Auras](phase-18-area-effects-auras.md) | 📖 Rough Sketch | Phase 6, 16 | Beta |
| 19 | [Full Spells](phase-19-full-spells.md) | 📖 Rough Sketch | Phase 17, 18 | Beta |
| 20 | [Buffs & Conditions (Full)](phase-20-buffs-conditions.md) | 📖 Rough Sketch | Phase 13, 15 | Beta |
| 21 | [Consumables](phase-21-consumables.md) | 📖 Rough Sketch | Phase 8 | Beta |
| 22 | [Advanced Actor Types](phase-22-advanced-actors.md) | 📖 Rough Sketch | Phase 5 | Beta |
| 23 | [Enhancements](phase-23-enhancements.md) | 📖 Rough Sketch | Phase 15 | Beta |
| 24 | [Psionics](phase-24-psionics.md) | 📖 Rough Sketch | Phase 16 | Beta |
| 25 | [Natural & Special Attacks](phase-25-natural-attacks.md) | 📖 Rough Sketch | Phase 8 | Beta |

### Milestone 3: Release

| # | Phase | Status | Dependencies | Milestone |
|---|-------|--------|--------------|-----------|
| 26 | [Compendium Browser & Management](phase-26-compendiums.md) | 📖 Rough Sketch | Phase 4, 15+ | Release |
| 27 | [Content Migration](phase-27-content-migration.md) | 📖 Rough Sketch | Phase 26 | Release |

### Milestone 4: Post-Release

| # | Phase | Status | Dependencies | Milestone |
|---|-------|--------|--------------|-----------|
| 28 | [Community Hardening](phase-28-community-hardening.md) | 📖 Rough Sketch | Phase 27 | Post-Release |
| 29 | [User Guide & Documentation Finalization + SRD Housing](phase-29-documentation-srd.md) | 📖 Rough Sketch | Phase 28 | Post-Release |
| 30 | [Cards](phase-30-cards.md) | 📖 Rough Sketch | Phase 8 | Post-Release |
| 31 | [3rd Party Art Module Support](phase-31-art-module-support.md) | 📖 Rough Sketch | Phase 4, 26 | Post-Release |
| 32 | [Module Integration Testing](phase-32-module-integration.md) | 📖 Rough Sketch | Phase 27 | Post-Release |
## Dependency Graph

```
                    ┌──────────────────── POC ──────────────────────────────────────────┐
                    │                                                                    │
Phase 1 (Weapon) ✅ ─→ Phase 2 (Material AE) ✅ ──┐                                     │
                    │                              │                                    │
Phase 3 (i18n) 🔶  ─┬→ Phase 4 (Compendium Foundation) ◄──┘                             │
                    │                                                                    │
                    └→ Phase 5 (Actor) ──→ Phase 6 (Token) ──→ Phase 7 (Roll Formulas)   │
                           │                                        │                    │
                           │                                        ▼                    │
                           │                                  Phase 8 (Actions) 📐       │
                           │                                   │    │    │               │
                           │                                   ▼    │    ▼               │
                           │                             Phase 9    │  Phase 13          │
                           │                          (Combat Trkr) │  (Conditions)      │
                           │                                        │                    │
                           ├────────────────────────────────→ Phase 10 (Feats)            │
                           │                                        │                    │
                           │                                        ▼                    │
                    Phase 4 ────────────────────────────────→ Phase 11 (Races)            │
                           │                                        │                    │
                    Phase 4 ────────────────────────────────→ Phase 12 (Classes)          │
                           │                                        │                    │
                           │                                        ▼                    │
                           │                                  Phase 14 (Testing)         │
                    ┌──────┼──────────────────── Beta ──────────────────────────────────┐ │
                    │      │                                                            │ │
                    │      ├─→ Phase 15 (Equipment) ──→ Phase 20 (Buffs Full)           │ │
                    │      │        │                                                   │ │
                    │      │        └─→ Phase 23 (Enhancements)                         │ │
                    │      │                                                            │ │
                    │ Phase 8 ─→ Phase 16 (Spells POC) ──┬→ Phase 17 (Metamagic)        │ │
                    │      │                             │                              │ │
                    │      │        Phase 6 ─────────────┼→ Phase 18 (AoE & Auras)      │ │
                    │      │                             │         │                    │ │
                    │      │                             └─→ Phase 19 (Full Spells) ◄───┘ │
                    │      │                                                            │ │
                    │      │    Phase 16 ──→ Phase 24 (Psionics)                        │ │
                    │      │                                                            │ │
                    │      ├─→ Phase 21 (Consumables)                                   │ │
                    │      ├─→ Phase 22 (Adv. Actors)                                   │ │
                    │      └─→ Phase 25 (Natural Attacks)                               │ │
                    └──────────────────────────────────────────────────────────────────┘ │
                    ┌──────────────────── Release ─────────────────────────────────────┐ │
                    │ Phase 4 + 15+ ─→ Phase 26 (Compendium Mgmt) ─→ Phase 27 (Migr.) │ │
                    └──────────────────────────────────────────────────────────────────┘ │
                    ┌──────────────────── Post-Release ─────────────────────────────────┐ │
                    │ Phase 27 ─→ Phase 28 (Community Hardening)                        │ │
                    │ Phase 28 ─→ Phase 29 (Documentation & SRD)                        │ │
                    │ Phase 8 ─→ Phase 30 (Cards)                                       │ │
                    │ Phase 4 + 26 ─→ Phase 31 (3rd Party Art Module Support)          │ │
                    │ Phase 27 ─→ Phase 32 (Module Integration Testing)                 │ │
                    └──────────────────────────────────────────────────────────────────┘ │
                    └────────────────────────────────────────────────────────────────────┘
```

---

## Cross-Cutting Concerns

These apply across multiple phases and should be kept in mind throughout:

### Bonus Type Stacking
Introduced in Phase 2 (Material AE). The `Dnd35eEffectChangeData` is extended with a `bonusType` field that determines stacking resolution. During `applyActiveEffects()`, bonuses of the same type to the same field only apply the highest value (except dodge and untyped, which always stack). Penalties always apply. For Material AEs, bonus type is **a system implementation detail, never exposed to the UI** — it is auto-set based on subtype (`standard`, `broken`, `masterwork`). Each subtype gets its own bonus type so all three can apply to the same item. How bonus type is exposed (or hidden) for other AE types is determined per-phase when those types are designed.

### Stacking History & Transparency
**Critical for player trust**: The stacking engine tracks detailed history of which bonuses were applied, which were rejected (and why). This history is stored on items/actors as `system._stackingHistory` and consumed by Phase 8 (Action System) to display in chat cards. Players can expand/collapse calculations to see: "Material (Steel) +2 applied | Material (Mithral) +0 ignored (highest-wins, lower)" — this transparency prevents disputes over math and helps GMs verify system correctness. Every bonus type that uses highest-wins resolution **must track the losers** in history. Penalties always apply, so they're never in "ignored" — but they are listed as "penalty (always applies)" in history.

### Formula Evaluation & Error Surfacing
The `FormulaFormGroup` component handles field-level formula validation. System-level formula evaluation errors during `prepareDerivedData()` also need surfacing — consider a preparation warning system that collects errors without blocking data prep.

### Document Store Refresh
All document classes override `update()` to refresh active Pinia stores, keeping Vue reactivity in sync with Foundry's data layer. Establish this pattern from Phase 1 and maintain it for every new document type.

### Pre-localization
CONFIG objects (abilities, skills, sizes, damage types, etc.) are pre-localized at system init time so they can be used directly in Vue templates without repeated `game.i18n.localize()` calls. Established in Phase 3.

### Grant System
First implemented in Phase 11 (Races), reused by Phase 12 (Classes). Handles creating/removing items on actors from `grantedFeatures[]` arrays with compendium UUID references (resolved via Phase 4 helpers) and level gating.

### Migration Versioning
Track `system.migration.version` on every actor/item. Migration version **field** established in Phase 4 (Compendium Foundation) — added to all DataModel schemas. Migration **runner** (iterate all docs, execute transforms) lives in Phase 27 (Content Migration). Start tracking the version field from Phase 4 onward so ALL subsequently created documents have it.

### Action System Integration
**All combat-related data exists to feed the Action System.** When adding new data to any document:
- If it's a stat that action formulas reference → register it in FormulaFamiliar schema (Phase 7)
- If it modifies action behavior → implement as AE change targeting `Dnd35eField` on the action (Phase 8)
- If it grants/modifies available actions → implement as EffectTrigger (Phase 8, §18.10)
- If it changes turn economy → implement as TurnActionBudget state modification (Phase 9)

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
| Equipment | Equipment item | Phase 15 |
| Loot | Loot item | Phase 15 |
| Consumable | Consumable item | Phase 21 |
| Class | Class item | Phase 12 (POC), restructured progression |
| Spell | Spell item | Phase 16 (Beta), restructured |
| Feat | Feat item | Phase 10 (POC), changes → AE pattern |
| Buff | **Buff Active Effect** | Phase 20 (Beta), Item → AE migration |
| Attack | Attack item | Phase 8, actions via Action System |
| Race | Race item | Phase 11 (POC), restructured with grants |
| Enhancement | **Enhancement Active Effect** | Phase 23 (Beta), Item → AE |
| Material | **Material Active Effect** | Already done (Phase 2) |
| Aura | **Aura Active Effect** | Phase 21 (Beta), Item → AE |
| Alignment | Actor property | Dropped as type |
| Damage-type | Constant | Dropped as type |
| Full-attack | Action Chain | Phase 8, dropped as type — progressive full attack is computed |
| Card | Article item | Phase 30 (Post-Release) |
| Valuable | Loot subtype | Phase 15 |
