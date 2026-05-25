# D35E → dnd35e Migration Plan

> Rebuild of the legacy D35E system into a modern Foundry VTT v14 system using TypeScript, Vue 3, Vite, and modern data model patterns.

---

## Table of Contents

- [Architecture Principles](#architecture-principles)
- [Milestones](#milestones)
  - [POC — Proof of Concept](#poc--proof-of-concept)
  - [Alpha — Paladin vs Dragon](#alpha--paladin-vs-dragon)
  - [Beta — Full System Coverage](#beta--full-system-coverage)
  - [Release — Migration & Content](#release--migration--content)
  - [Post-Release — Hardening & Bonus Features](#post-release--hardening--bonus-features)
- [Current State](#current-state)
- [Status Legend](#status-legend)
- [Phase Overview](#phase-overview)
  - [Wave: POC — Proof of Concept](#wave-poc--proof-of-concept)
  - [Wave: Alpha — Paladin vs Dragon](#wave-alpha--paladin-vs-dragon)
  - [Wave: Beta — Full System Coverage](#wave-beta--full-system-coverage)
  - [Wave: Release — Migration & Content](#wave-release--migration--content)
  - [Wave: Post-Release — Hardening & Bonus Features](#wave-post-release--hardening--bonus-features)
- [Dependency Graph](#dependency-graph)

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
| **Actions live on items** | Items own their actions via the Action System; actions can be checks, attacks, spell casts, and can be chained into sequences |
| **Localize early** | All user-facing strings use i18n keys — no hardcoded English. Pre-localize CONFIG objects at init time. |
| **Compendium as source of truth** | All SRD content stored as JSON in source, built to Foundry packs. Compendium browsers provide amalgamated cross-pack search. |
| **Bonus type stacking** | Stacking engine with `bonusType` field. Highest-wins resolution (except dodge/untyped/circumstance — always stack). Penalties always apply. |
| **Document store refresh on update** | Override `update()` on all document classes to refresh active Pinia stores, ensuring Vue reactivity stays in sync with Foundry's data layer |
| **Build toward the Action System** | Every phase that touches combat data (BAB, saves, AC, feats, conditions) is designed knowing its output will feed the ActionDataModel, TurnActionBudget, and ExecutionEngine. No throwaway combat code. |
| **Building-block phases** | Each phase produces a testable building block that unlocks the next. Phases are layered by *system dependency*, not by item type. |
| **Combat state on `system` fields** | Turn economy (TurnActionBudget) and other combat runtime state is persisted via `Combatant.system` using a `TypeDataModel` schema — not in-memory Maps or transient class properties. Foundry stores Combat/Combatant documents in LevelDB (`combats.db`), so all combat state survives server restarts. Players can update their own combatant's `system` data per Foundry's permission model. |

---

## Milestones

### POC — Proof of Concept

**Goal**: Foundation, data infrastructure, and testing patterns — every building block exists in isolation before being composed. Items, Active Effects, actors, tokens, rolls, compendium foundations, and the test framework all work independently.

**What POC includes**:
- Weapon item with full DataModel, mixin chain, Vue sheet, Identifiable mixin
- Material AE with phase system, stacking engine, proxy dispatcher
- Localization infrastructure (LOCALIZATION_PREFIXES, lang files, FormGroup auto-labels)
- Testing infrastructure (Vitest, integration harness, mock helpers, CI pipeline) — patterns established early so every subsequent phase includes tests
- Compendium foundation (pack pipeline, origin tracking, UUID helpers, migration version field)
- Actor foundation (Character actor: abilities, AC shell, HP, saves, skills, inventory, tokens, equipment slots)
- Roll formulas (D20Roll, DamageRoll, FormulaFamiliar roll data, formula paths)

**What POC does NOT include**: Classes, races, feats, combat, spells, conditions, or any gameplay logic.

**POC exit criteria**: A Character actor exists on a scene with derived ability scores, saves, HP, and skills. Weapons can be created, identified, and equipped. Material AEs modify item stats with correct stacking. Roll formulas resolve with FormulaFamiliar context. Compendium items can be imported with origin tracking. All strings are localized. Test framework is in place with unit/integration test examples covering poc.1–poc.3.

---

### Alpha — Paladin vs Dragon

**Goal**: A playable combat scenario proving "one of everything" — every building block composed end-to-end. A level 5 Paladin (Human) with a +1 longsword and a Young Adult Black Dragon fight on a grid. The Paladin proves class features, spellcasting (RAW), enhancement stacking, and morale bonus collision. The Dragon proves natural attacks, breath weapon, monster class progression, and frightful presence.

**What Alpha includes**:
- Two races: Human (simple) and Black Dragon (monster class progression, locked levels, natural armor, breath weapon, flight, immunities)
- One class: Paladin (Med BAB, Good Fort, level-up, class features via grant schedule)
- Class features: Divine Grace (CHA → saves), Smite Evil (per-day toggle), Lay on Hands (pool-based healing), Aura of Courage (+4 morale vs fear)
- RAW Paladin spellcasting: 1st-level spells (Bless, Protection from Evil, Divine Favor, Cure Light Wounds)
- +1 longsword (enhancement AE on weapon, +1 enhancement to attack/damage)
- Three feat archetypes: passive (Weapon Focus), toggle (Power Attack), trigger (Cleave)
  - Level 1 character feat: Power Attack (STR 13 ✓)
  - Level 1 Human bonus feat: Weapon Focus (Longsword) (BAB +1 ✓)
  - Level 3 character feat: Cleave (requires Power Attack ✓)
- Action System: ActionDataModel, chains, execution engine, combat maneuvers (trip, grapple, bull rush)
- Natural attacks: bite, claw, wing, tail — primary/secondary rules, multi-attack
- Combat tracker with initiative, turns, TurnActionBudget state machine, progressive full attack
- Breath weapon: 80ft line of acid, Reflex save, area template (line/cone)
- Conditions: Prone (trip pipeline), Frightful Presence → Shaken/Frightened (fear track stub)
- Per-attack chat cards with stacking history showing bonus type collision resolution
- **Stacking proof**: Aura of Courage (+4 morale) vs Bless (+1 morale) on saves vs fear — engine picks +4, rejects +1, chat card shows suppression reason

**What Alpha does NOT include**: Equipment AC (flat numbers only), full spellbook system (only Paladin 1st-level), psionics, consumables, NPC actor type (Dragon is a Character with progression), full enhancements (+2 through +5, special abilities), auras affecting allies, full condition set, data migration.

**Alpha exit criteria**: A GM can create a level 5 Paladin (Human) with a +1 longsword and a Young Adult Black Dragon (built via monster class progression), enter combat, roll initiative, take turns with the progressive full attack state machine, apply Power Attack per-attack, get a Cleave bonus attack on kill, activate Smite Evil via PreRollDialog, use Lay on Hands to heal, cast Bless and Divine Favor (RAW spell slots), see morale stacking collision on fear saves (Aura of Courage +4 suppresses Bless +1), trip an enemy to apply Prone, use a breath weapon (line template with Reflex save), trigger Frightful Presence (Will save vs fear with Aura of Courage granting +4 morale), see natural attacks use primary/secondary rules, see +1 enhancement bonus from longsword in stacking breakdown, and view all results in per-attack chat cards.

---

### Beta — Full System Coverage

**Goal**: Expand from one-of-everything to complete D&D 3.5e system coverage. All item types, NPC/Object/Trap actor types, full condition/buff system, full spellcasting, equipment with AC, full enhancements, companions, psionics.

**Progression philosophy**: Alpha built the engine and proved the architecture handles real D&D complexity. Beta puts more content through it — more item types, more conditions, more feat patterns, full spellcasting. Each new content type proves a variation of the existing architecture, not a new architecture.

> **📌 Milestone placement notes**:
> - **Epic Level Rules**: Release — SRD content that exists in D35E. Lands in the release wave alongside other SRD-completion phases.
> - **Psionics**: Beta (foundation) + Release (full). SRD OGC content, exists in D35E.
> - **Cards**: Release. Card decks exist in D35E — small utility, but bundled with the SRD-completion wave.
> - **Documentation & SRD**: Release — technical docs grow alongside development; the release-wave phase is the user-facing polish pass against the feature-complete system.
> - **Community Hardening**: Release — final tuning pass after content migration is shipped.
> - **Post-Release (Bonus)**: Features that do NOT exist in D35E (Sight/Concealment, Stat Block, Vigor/Wound, Environmental Hazards, Random Treasure Gen, Variant Rules, Divine Rules) plus 3rd-party module integration work.

---

### Release — Migration & Content

**Goal**: Round out remaining SRD content (Epic, Psionics, Cards), migrate existing D35E worlds, write user-facing docs against the feature-complete system, and harden through community feedback.

---

### Post-Release — Hardening & Bonus Features

**Goal**: Third-party module integrations and bonus features that don't exist in D35E.

---

## Current State

| Component | Status | Notes |
|-----------|--------|-------|
| **Weapon** item type | 📝 Planned | Data model done. Vue sheet details, effects tab, tests remaining. |
| **Material** active effect | ✅ Approved | Material AE pattern established. Stacking engine, GeneralSystemModel, v14 CONFIG setup, integration designed. |
| **PhysicalItem / EquippableItem** chain | 📝 Planned | Weight, price, hardness, HP, equipment slots — schema done, tests remaining |
| **Identifiable document** mixin | 📝 Planned | Tracked/identified states with formula-driven names. Uses `system.slug` |
| **Actor (character)** type shell | ✅ Exists | Shell only — no meaningful system data yet |
| **Token / Scene** type wrappers | ✅ Exists | Type aliases, no custom logic |
| **Active Effect phase system** | ✅ Approved | Phase system, stacking engine, GeneralSystemModel designed in poc.2. v14 CONFIG integration planned. |
| **Settings framework** | ✅ Complete | Combat, display, health, roll, skills, currency, game rules categories |
| **FormulaFamiliar system** | ✅ Complete | Schema-driven autocomplete with `#context.property` syntax |
| **Build pipeline** | ✅ Complete | Vite + Vue SFC + SASS + lang merge |

---

## Status Legend

| Symbol | Meaning | Description |
|--------|---------|-------------|
| 📄 Stub | Stub | It's an idea — no ideation done. Phase file is just loose notes. |
| 📖 Rough Sketch | Rough Sketch | Fleshed-out ideas exist, but major design questions remain. |
| 📋 Outlined | Outlined | Well thought out — maybe a couple of open questions. |
| 📝 Planned | Planned | Confident enough to execute independently without design issues. |
| ✅ Approved | Approved | Reached Planned, then confirmed by the user. |
| 🔶 In Progress | In Progress | Approved and actively being implemented. |
| ✅ Complete | Complete | All work items finished. |
| 🔒 Hardened | Hardened | Tested by users and considered bug-free. |

---

## Phase Overview

Phases are organized by **wave**. Each wave maps to a subfolder (`poc/`, `alpha/`, `beta/`, `release/`, `post-release/`) and phases restart at `01` within each wave. This means adding a phase to an earlier wave never renumbers a later one.

Dependencies use `wave.N` notation (e.g. `poc.1`, `alpha.3`, `beta.2`).

---

### Wave: POC — Proof of Concept

`docs/migration-plan/poc/` | poc.1–poc.10

**Goal**: Foundation, data infrastructure, and testing patterns. Every building block exists in isolation before being composed.

| # | Phase | Status | Dependencies | Notes |
|---|-------|--------|--------------|-------|
| 1 | [Item Foundation](poc/phase-01-item-foundation.md) | ✅ Complete | — | Weapon DataModel, mixin chain, Vue sheet, Identifiable |
| 2 | [Active Effect on Item](poc/phase-02-active-effect-on-item.md) | 🔶 In Progress | poc.1 | Material AE, phase system, stacking engine, proxy dispatcher, GeneralSystemModel |
| 3 | [Localization](poc/phase-03-localization.md) | ✅ Complete | — | LOCALIZATION_PREFIXES, lang files, FormGroup auto-labels |
| 4 | [Testing Infrastructure](poc/phase-04-testing-infrastructure.md) | ✅ Complete | poc.1, poc.2, poc.3 | Vitest, Foundry mocks, coverage tooling — establishes test patterns; back-fills poc.1–3 tests |
| 5 | [Compendium Foundation](poc/phase-05-compendium-foundation.md) | 🔶 In Progress | poc.1, poc.2, poc.3 | Pack pipeline, origin tracking, UUID helpers, migration version field |
| 6 | [Actor Foundation](poc/phase-06-actor-foundation.md) | 🔶 In Progress | poc.1, poc.3 | Character actor: abilities, AC shell, HP, saves, inventory, tokens, equipment slots |
| 7 | [Roll Formulas & Custom Rolls](poc/phase-07-roll-formulas.md) | 📋 Outlined | poc.6 | D20Roll, DamageRoll, FormulaFamiliar roll data, formula paths |
| 8 | [Pipeline & Branching](poc/phase-08-pipeline-and-branching.md) | 🔶 In Progress | — | Branching model, PR gate (`test.yml`), release pipeline (`build.yml`), `phases.json` sync. Independent of POC content; can land any time before POC closes. |
| 9 | [Basic Tokens](poc/phase-09-basic-tokens.md) | 📝 Planned | poc.6 | Token placed on scene, moved, `token.actor` resolves correctly, size and HP bar wired. Thin proof before poc.10. |
| 10 | [Basic Combat](poc/phase-10-basic-combat.md) | 📝 Planned | poc.6, poc.7, poc.9 | Combat tracker functional; detects basic move, double move, and main-hand attack. Seeds alpha.3 Action System. |

**Exit criteria**: A Character actor exists on a scene with derived ability scores, saves, and HP. Weapons can be created, identified, and equipped. Material AEs modify item stats with correct stacking. Roll formulas resolve with FormulaFamiliar context. Compendium items can be imported with origin tracking. All strings are localized. Test framework is in place with unit/integration test examples covering poc.1–3.

> **Phase 6 includes Token & Scene**: Token placement, size derivation, Pinia token store, and actor ↔ token linking are part of getting actors visible on the table. TargetingManager stub and movement/action economy integration remain in alpha.7.

---

### Wave: Alpha — Paladin vs Dragon

`docs/migration-plan/alpha/` | alpha.1–alpha.12

**Goal**: A playable combat scenario proving "one of everything." A level 5 Paladin (Human) with a +1 longsword vs a Young Adult Black Dragon.

| # | Phase | Status | Dependencies | Notes |
|---|-------|--------|--------------|-------|
| 1 | [Races & Progression](alpha/phase-01-races-progression.md) | 📋 Outlined | poc.5, poc.7 | Race item, creature types, Progression component, grant system, monster class progression, natural armor, senses, Human + Black Dragon |
| 2 | [Classes & Level History](alpha/phase-02-classes-level-history.md) | 📋 Outlined | alpha.1 | Class item, level-up flow, BAB/save aggregation, skills, milestones, multiclass, Paladin |
| 3 | [Action System](alpha/phase-03-action-system.md) | 📋 Outlined | poc.7, alpha.2 | ActionDataModel, execution engine, attack/damage, chat cards, combat maneuvers (trip, grapple, bull rush), stacking history display |
| 4 | [Feats](alpha/phase-04-feats.md) | 📋 Outlined | poc.6, alpha.3 | Feat item, 3 archetypes: passive (Weapon Focus), toggle (Power Attack), trigger (Cleave). PreRollDialog. Conditional bonuses. |
| 5 | [Natural & Special Attacks](alpha/phase-05-natural-attacks.md) | 📋 Outlined | alpha.3 | Natural attack item type, primary/secondary, multi-attack full-attack generation, TWF iteratives, bite/claw/wing/tail |
| 6 | [Class Features](alpha/phase-06-class-features.md) | 📋 Outlined | alpha.2, alpha.3, alpha.4 | Paladin: Divine Grace (CHA→saves), Smite Evil (per-day toggle), Lay on Hands (pool healing), Aura of Courage (+4 morale vs fear) |
| 7 | [Combat Tracker & Turn Economy](alpha/phase-07-combat-tracker.md) | 📋 Outlined | alpha.3 | Initiative, TurnActionBudget state machine, progressive full attack, token movement with action cost, turn hooks, flat-footed |
| 8 | [Conditions](alpha/phase-08-conditions.md) | 📋 Outlined | alpha.3 | Prone (trip pipeline), Frightful Presence → Shaken/Frightened (fear track stub), condition manager, token icons, stand-up action |
| 9 | [Buff AE Core](alpha/phase-09-buff-ae-core.md) | 📖 Rough Sketch | poc.2, poc.6 | Buff AE subtype: `BuffSystemModel` (active, round-based duration, description), combat-tracker turn-start tick → expiry, deactivation suppression. Minimum surface for alpha.11 spell buffs. Stacking collision proof (Aura of Courage suppresses Bless on fear saves). |
| 10 | [Breath Weapon & Area Templates](alpha/phase-10-breath-weapon.md) | 📋 Outlined | alpha.3, alpha.7 | Line and cone MeasuredTemplate placement, Reflex save workflow, area damage application, breath weapon recharge |
| 11 | [Spells](alpha/phase-11-spells.md) | 📋 Outlined | poc.6, poc.7, alpha.3, alpha.9 | Spell item type, Paladin spellbook, 1st-level slots, cast action, Bless/Protection from Evil/Divine Favor/Cure Light Wounds |
| 12 | [Enhancement](alpha/phase-12-enhancements.md) | 📋 Outlined | poc.1, poc.2 | +1 longsword: minimal EnhancementSystemModel, one AE with +1 enhancement to attack/damage |

**Exit criteria**: A GM can create a level 5 Paladin (Human) with a +1 longsword and a Young Adult Black Dragon, enter combat, roll initiative, take turns with the progressive full attack state machine, apply Power Attack per-attack, get a Cleave bonus attack on kill, activate Smite Evil via PreRollDialog, use Lay on Hands to heal, cast Bless and Divine Favor (RAW spell slots), see morale stacking collision on fear saves (Aura of Courage +4 suppresses Bless +1), trip an enemy to apply Prone, use a breath weapon (line template with Reflex save), trigger Frightful Presence (Will save vs fear with Aura of Courage granting +4 morale), see natural attacks use primary/secondary rules, and view all results in per-attack chat cards.

> **Races and Classes share the Progression component.** alpha.1 builds it; alpha.2 reuses it. Classes depend on Races because both use the same grant scheduling and level history infrastructure.

> **Action System stays monolithic.** Combat maneuvers (trip, grapple, bull rush, disarm, sunder, overrun) live here because Trip → Prone is an Alpha exit criterion.

---

### Wave: Beta — Full System Coverage

`docs/migration-plan/beta/` | beta.1–beta.11

**Goal**: Expand from one-of-everything to complete D&D 3.5e system coverage. All item types, NPC/Object/Trap actor types, full condition/buff system, full spellcasting, equipment with AC, full enhancements, companions, psionics.

| # | Phase | Status | Dependencies | Notes |
|---|-------|--------|--------------|-------|
| 1 | [Equipment & Loot](beta/phase-01-equipment-loot.md) | 📖 Rough Sketch | poc.6, poc.7 | Armor, Shield, Equipment, Loot, Container, Ammo. Full AC calculation. ACP, spell failure, encumbrance. |
| 2 | [Spells & Spellbooks (Full)](beta/phase-02-spells-spellbooks.md) | 📖 Rough Sketch | poc.7, alpha.3, alpha.11 | All caster types, all spell levels, SR, concentration, counterspelling stubs. Multiple spellbooks. |
| 3 | [Buff AE Expansion & Conditions (Full)](beta/phase-03-buffs-conditions.md) | 📖 Rough Sketch | alpha.8, alpha.9, beta.1 | Buff AE expansion over alpha.9 (`buffType` taxonomy, timeline formulas, damage pools, shapechange, dedicated Buffs sheet section), all 25+ conditions, ability damage/drain, energy drain, fast healing, regeneration, disease, full fear track, D35E `buff` item → Buff AE data migration |
| 4 | [Advanced Classes](beta/phase-04-advanced-classes.md) | 📄 Stub | alpha.2 | Prestige classes, NPC classes, racial paragon, substitution levels. Stub — design not started. |
| 5 | [Consumables](beta/phase-05-consumables.md) | 📖 Rough Sketch | alpha.3 | Potion, scroll, wand, poison. Action snapshot pattern. Charges/uses. Splash weapons. |
| 6 | [Advanced Actors](beta/phase-06-advanced-actors.md) | 📖 Rough Sketch | poc.6, alpha.1, alpha.2 | NPC, Trap, Object actor types. Companion bond system (familiar, animal companion, mount, summon, cohort). Portrait Bar (Party HUD). |
| 7 | [Area Effects & Auras (Full)](beta/phase-07-area-effects-auras.md) | 📖 Rough Sketch | alpha.10, beta.2 | Foundry V14 Region behaviors, persistent auras, AE delivery, duration tracking, DoT. Aura of Courage expands to affect allies in 10ft. |
| 8 | [Enhancements (Full)](beta/phase-08-enhancements.md) | 📖 Rough Sketch | alpha.12, beta.1 | +1 through +5, special weapon/armor abilities, cursed items (minimal). Magic Weapon spell stacking proof. |
| 9 | [Metamagic](beta/phase-09-metamagic.md) | 📖 Rough Sketch | alpha.4, beta.2 | Metamagic feats, spell level adjustment, prepared vs spontaneous timing. |
| 10 | [Full Spells](beta/phase-10-full-spells.md) | 📖 Rough Sketch | beta.7, beta.9 | SR, concentration, counterspelling, all delivery types, AoE spell chains. |
| 11 | [Psionics](beta/phase-11-psionics.md) | 📖 Rough Sketch | beta.2 | Power item, power points, augmentation, psionic disciplines, manifester level. |

---

### Wave: Release — Migration & Content

`docs/migration-plan/release/` | release.1–release.7

**Goal**: Round out the system with remaining SRD content (Epic, Psionics, Cards), then migrate existing D35E worlds and harden through community feedback. User-friendly documentation is written here against the feature-complete system.

| # | Phase | Status | Dependencies | Notes |
|---|-------|--------|--------------|-------|
| 1 | [Compendium Browser & Management](release/phase-01-compendium-browser.md) | 📖 Rough Sketch | poc.5, beta.1+ | Cross-compendium search, rich indexing, schema migration runner, diff view |
| 2 | [Documentation & SRD](release/phase-02-documentation-srd.md) | 📖 Rough Sketch | beta.11 | User guide polish (technical docs grow alongside development), SRD journal housing, tutorials, FAQ |
| 3 | [Epic Level Rules](release/phase-03-epic-level-rules.md) | 📖 Rough Sketch | alpha.2, alpha.4, beta.2 | Epic BAB/saves, epic feats, epic spellcasting, epic DR (SRD content, exists in D35E) |
| 4 | [Psionic Rules (Full)](release/phase-04-psionic-rules-full.md) | 📖 Rough Sketch | beta.11, beta.8, release.3 | Full psionic expansion: prestige classes, psi-spell transparency, psionic items, feats |
| 5 | [Cards](release/phase-05-cards.md) | 📖 Rough Sketch | alpha.3 | Card item for tracking abilities, conditions, resources. Counters with rest resets. |
| 6 | [Content Migration](release/phase-06-content-migration.md) | 📖 Rough Sketch | release.1 | D35E → dnd35e transforms, backup/validate/import workflow, world migration runner |
| 7 | [Community Hardening](release/phase-07-community-hardening.md) | 📖 Rough Sketch | release.6 | Playtesting feedback, balance tuning, default value adjustments. Documentation gets a refresh pass after this lands. |

---

### Wave: Post-Release — Hardening & Bonus Features

`docs/migration-plan/post-release/` | post.1–post.9

**Goal**: Third-party integrations and bonus features that don't exist in D35E.

| # | Phase | Status | Dependencies | Notes |
|---|-------|--------|--------------|-------|
| 1 | [3rd Party Art Module Support](post-release/phase-01-art-module-support.md) | 📖 Rough Sketch | poc.5, release.1 | Art module lookup, GM configurator, per-item art override |
| 2 | [Module Integration Testing](post-release/phase-02-module-integration.md) | 📖 Rough Sketch | release.6 | Compatibility matrix, integration helpers, per-module testing |
| 3 | [Sight Distance / Concealment](post-release/phase-03-sight-concealment.md) | 📄 Stub | beta.6 | Concealment as region behavior |
| 4 | [Stat Block Sheet (NPC alternate view)](post-release/phase-04-stat-block-sheet.md) | 📄 Stub | beta.5 | Read-only stat block layout |
| 5 | [Vigor/Wound Variant HP](post-release/phase-05-vigor-wound-hp.md) | 📄 Stub | poc.6 | Variant HP system (does not exist in D35E) |
| 6 | [Environmental Hazards & Overland Travel](post-release/phase-06-environmental-hazards.md) | 📄 Stub | poc.6, beta.3 | Falling, drowning, heat/cold, forced march (does not exist in D35E) |
| 7 | [Divine Rules (Divine Ranks & Powers)](post-release/phase-07-divine-rules.md) | 📄 Stub | beta.5 | Divine ranks, salient abilities |
| 8 | [Variant Rules (Unearthed Arcana OGC)](post-release/phase-08-variant-rules.md) | 📄 Stub | release.7 | Gestalt, flaws, traits (does not exist in D35E) |
| 9 | [Random Treasure Generation](post-release/phase-09-random-treasure.md) | 📄 Stub | beta.1 | Treasure by CR tables |

---

## Dependency Graph

```mermaid
flowchart TD
    subgraph POC["🔷 POC — Proof of Concept"]
        P1["poc.1 Weapon"]
        P2["poc.2 Material AE"]
        P3["poc.3 i18n"]
        P4["poc.4 Testing"]
        P5["poc.5 Compendium"]
        P6["poc.6 Actor + Token"]
        P7["poc.7 Roll Formulas"]
        P8["poc.8 Pipeline"]
        P9["poc.9 Basic Tokens"]
        P10["poc.10 Basic Combat"]
        P1 --> P2
    end
    P1 --> P4
    P2 --> P4
    P3 --> P4
    P1 --> P5
    P2 --> P5
    P3 --> P5
    P1 --> P6
    P6 --> P9
    P6 --> P10
    P7 --> P10
    P9 --> P10
    P3 --> P6
    P6 --> P7

    subgraph ALPHA["🔶 Alpha — Paladin vs Dragon"]
        A1["alpha.1 Races"]
        A2["alpha.2 Classes"]
        A3["alpha.3 Action System"]
        A4["alpha.4 Feats"]
        A5["alpha.5 Natural Attacks"]
        A6["alpha.6 Class Features"]
        A7["alpha.7 Combat Tracker"]
        A8["alpha.8 Conditions"]
        A9["alpha.9 Buff AE Core"]
        A10["alpha.10 Breath Weapon"]
        A11["alpha.11 Spells"]
        A12["alpha.12 Enhancement"]
        A1 --> A2
        A2 --> A3
        A3 --> A4
        A3 --> A5
        A3 --> A6
        A4 --> A6
        A2 --> A6
        A3 --> A7
        A3 --> A8
        A3 --> A10
        A7 --> A10
        A3 --> A11
        A9 --> A11
    end
    P5 --> A1
    P7 --> A1
    P6 --> A4
    P6 --> A11
    P7 --> A11
    P2 --> A9
    P6 --> A9
    P1 --> A12
    P2 --> A12

    subgraph BETA["🟭 Beta — Full System Coverage"]
        B1["beta.1 Equipment"]
        B2["beta.2 Spells Full"]
        B3["beta.3 Buffs/Conditions"]
        B4["beta.4 Advanced Classes"]
        B5["beta.5 Consumables"]
        B6["beta.6 Advanced Actors"]
        B7["beta.7 Area Effects"]
        B8["beta.8 Enhancements"]
        B9["beta.9 Metamagic"]
        B10["beta.10 Full Spells"]
        B11["beta.11 Psionics"]
    end
    P6 --> B1
    P7 --> B1
    P7 --> B2
    A3 --> B2
    A11 --> B2
    A8 --> B3
    A9 --> B3
    B1 --> B3
    A2 --> B4
    A3 --> B5
    P6 --> B6
    A1 --> B6
    A2 --> B6
    A10 --> B7
    B2 --> B7
    A12 --> B8
    B1 --> B8
    A4 --> B9
    B2 --> B9
    B7 --> B10
    B9 --> B10
    B2 --> B11

    subgraph REL["🟛 Release"]
        R1["release.1 Compendium Browser"]
        R2["release.2 Documentation & SRD"]
        R3["release.3 Epic Level"]
        R4["release.4 Psionics Full"]
        R5["release.5 Cards"]
        R6["release.6 Content Migration"]
        R7["release.7 Community Hardening"]
        R1 --> R6
        R6 --> R7
    end
    P5 --> R1
    B1 --> R1
    B11 --> R2
    A2 --> R3
    A4 --> R3
    B2 --> R3
    B11 --> R4
    R3 --> R4
    A3 --> R5

    subgraph POST["⚦ Post-Release"]
        PR1["post.1 Art Module"]
        PR2["post.2 Module Integration"]
        PR8["post.8 Variant Rules"]
    end
    P5 --> PR1
    R1 --> PR1
    R6 --> PR2
    R7 --> PR8
```

---
## Cross-Cutting Concerns

These apply across multiple phases and should be kept in mind throughout.

### Bonus Type Stacking
The `Dnd35eEffectChangeData` is extended with a `bonusType` field that determines stacking resolution. During `applyActiveEffects()`, bonuses of the same type to the same field only apply the highest value (except dodge, untyped, and circumstance — which always stack). Penalties always apply. For Material AEs, bonus type is auto-set based on subtype and never exposed to the UI. How bonus type is exposed for other AE types is determined per-phase.

**Alpha stacking proof** — Paladin attacking with a +1 longsword under Bless + Divine Favor + Aura of Courage:

*Attack roll bonuses*:
- +3 BAB (base)
- +STR (ability, untyped — always stacks)
- +1 enhancement (longsword — enhancement type)
- +1 morale (Bless — morale type, only morale on attack, applies)
- +1 luck (Divine Favor — luck type, applies)

*Save vs fear (e.g., Dragon's Frightful Presence)*:
- +base save + ability mod + CHA via Divine Grace (untyped)
- +4 morale (Aura of Courage) — **APPLIED** (higher morale)
- +1 morale (Bless) — **REJECTED** (same type, lower value)
- Chat card: "Bless (+1 morale) — suppressed by Aura of Courage (+4 morale)"

This proves the stacking engine resolves per-field, not per-source — the same Bless spell applies its morale bonus to attack rolls (where it's the only morale source) but gets suppressed on fear saves (where Aura of Courage provides a higher morale bonus).

### Stacking History & Transparency
The stacking engine tracks detailed history of which bonuses were applied and which were rejected (and why). Stored as `system._stackingHistory`, consumed by the Action System for chat card display. Players can expand/collapse calculations. Every bonus type that uses highest-wins resolution **must track the losers**.

### Dual-Stack Resolution (Masked Effects)
When items have **unidentified effects** (e.g., a hidden +2 enhancement), the stacking engine runs **twice** — once with all bonuses (real stack, used for the actual die roll) and once with only player-visible bonuses (masked stack, used for the player's chat card breakdown). The two stacks can produce **different winners** in highest-wins resolution: if the player casts Magic Weapon (+1 enhancement) on a secretly +2 sword, the player sees "+1 enhancement" in their breakdown, but the real roll uses +2 (the hidden enhancement suppresses Magic Weapon). The gap between the player's perceived total and the die result is intentional — the character doesn't know why the sword performs better than expected. Both histories are stored in chat message flags so the card can re-render for either audience. See Phase 2 §2.5.2 for the algorithm.

### Player Edit Secrets
When a player with edit permission modifies a field that is masked by the identification system, the edit is intercepted and routed into a **Player Edit Secret** — a system-managed Active Effect at higher priority than the mask. This prevents the player from overwriting the GM's hidden data while still letting the player's edit appear in the masked (player-visible) stack. The Player Edit Secret is system-managed but **GM-deletable**, accumulates all masked-field edits into a single AE per item, and is excluded from the real stack. No match-checking is performed against the underlying mask value. See Phase 28 §28.10 for the full design.

### Formula Evaluation & Error Surfacing
The `FormulaFormGroup` component handles field-level formula validation. System-level formula evaluation errors during `prepareDerivedData()` need surfacing via a preparation warning system.

### Document Store Refresh
All document classes override `update()` to refresh active Pinia stores. Pattern established from Phase 1 and maintained for every new document type.

### Pre-localization
CONFIG objects (abilities, skills, sizes, damage types, etc.) are pre-localized at system init time. Established in Phase 3.

### Grant System
First built in Phase 8 (Races & Progression), reused in Phase 9 (Classes). Flat array of entries, each specifying a level threshold and a grant action:
- **Auto-grant**: `{ at: level, type: "grant", uuid }` — instantiates a compendium item.
- **Choice from list**: `{ at: level, type: "choice", from: [uuid, ...] }` — player picks.
- **Choice from filter**: `{ at: level, type: "choice", filter: { type, featType, ... } }` — filtered compendium browser.

Granted items receive `grantedBy: { sourceId, level }` provenance. Level-down removes matching items.

### Schedule System (Value Scaling)
Features own their own scaling via `system.schedules`. Each entry targets a field path and defines a threshold table keyed on a formula reference (e.g., `@classes.rogue.level`). Replaces D35E's nested ternary patterns.

### Progression Component
Shared data structure in both **Class** and **Race** items. Contains HD size, BAB rate, save progression, skill points per level, and grant schedule. The level-up system aggregates all progressions — no distinction between class and racial HD. Standard races (Human) have no progression. Monstrous races (Dragon) embed progressions that appear alongside class progressions.

BAB and save progressions use standardized rates (High/Med/Low BAB, Good/Poor saves). Creature type determines defaults via lookup table — "Dragon" auto-fills d12 HD, Good BAB, Good Fort/Ref/Will.

### Level History
Characters track an immutable ledger: `system.levelHistory: LevelRecord[]`. Each record captures progression source, HP breakdown (die size, roll, permanent CON mod), skill allocation, ability score increase, grants, and choices. BAB, saves, and total HP are **derived** from history + schedules in `prepareDerivedData()` — never stored.

Monster class progressions break creature abilities into a class-like progression starting at 1 HD. Specific levels can override HD to 0 via `hdOverride` — these grant racial abilities but no HP/skills/milestone.

### Soft Validation (Edit Rules)
No hard locks. Warnings are computed in `prepareDerivedData()` and stored as `derived.levelWarnings` — never persisted, always recomputed.

### Advancement: Milestones vs XP
Default: milestone. Optional XP mode via `advancementMode` setting with GM-defined XP table. Party level-up scene control button (GM-only).

### Central Prerequisite Registry
During `prepareDerivedData()`, actor scans all items with prerequisites and builds `derived.prerequisiteRegistry`. Provides single validation point, sheet display, and level history integration.

### Action/Effect Eligibility Per Item Type
Each item type declares `canGrantActions` and `canAcceptEffects` booleans — per-type constants controlling sheet UI and drag-drop.

### AE Generator Pattern
Items that exist to generate Active Effects. Store configuration, produce AE when triggered. Examples: Power Attack (slider), Illuminable items (light settings).

### Bond Pattern
Specialized AE generator establishing a relationship between two documents. The AE *is* the relationship. Bond types: `container`, `familiar`, `animalCompanion`, `mount`, `summon`, `cohort`, `commanded`.

### Damage Types as Config Data
`fire`, `cold`, `slashing`, etc. are config constants with system setting overrides for homebrew — NOT a Foundry item type.

### Item-on-Creature Targeting
Some spells and effects target **items**, not creatures (Magic Weapon, Magic Vestment, Keen Edge, Align Weapon). The action system supports this via `effect.target: 'item-on-creature'` with an `itemTargetFilter` that restricts the picker by item type and equipped status. Execution flow: select target token → Item Picker Dialog (filtered inventory list) → apply AE to the selected item with `transfer: true`. The `#targetItem` formula context provides autocomplete for the target item's properties. Proven in Phase 16 via Magic Weapon. Actions are configured on each item's dedicated **Actions tab** — every action-bearing item sheet has an Actions tab where users can add, edit, reorder, and chain any number of actions.

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

| D35E Type | dnd35e Type | Phase | Notes |
|-----------|-------------|-------|-------|
| Weapon | Weapon item | 1 ✅ | Field renames |
| Equipment | Equipment item | 19 | Armor, shield, wondrous |
| Loot | Loot item | 19 | Generic items |
| Consumable | Consumable item | 22 | Potions, scrolls, wands |
| Class | Class item | 9 | Restructured progression |
| Spell | Spell item | 17 (Alpha), 20 (Full) | Restructured |
| Feat | Feat item | 11 | combatChanges → AE pattern |
| Buff | **Buff Active Effect** | alpha.9 (core), beta.3 (expansion + item→AE migration) | Alpha introduces the minimal AE subtype (active, round duration, changes via stacking engine); beta.3 adds buffType / timeline / damage pool / shapechange and migrates D35E `buff` items |
| Attack | Attack item | 10 | Actions via Action System |
| Race | Race item | 8 | Restructured with grants |
| Enhancement | **Enhancement Active Effect** | 18 (Alpha), 25 (Full) | Item → AE |
| Material | **Material Active Effect** | 2 ✅ | Done |
| Aura | **Aura Active Effect** | 24 | Item → AE |
| Alignment | Actor property | — | Dropped as type |
| Damage-type | Config constant | — | Dropped as type |
| Full-attack | Action Chain | 10 | Dropped as type — computed |
| Card | Card item | 37 | Post-Release |
| Valuable | Loot subtype | 19 | Merged into loot |

---

## D35E → dnd35e Full Coverage Audit

Every D35E feature, every SRD rule area, accounted for. Nothing dropped.

### D35E Actor Types (4) → dnd35e

| D35E Type | dnd35e Type | Phase |
|-----------|-------------|-------|
| character | Character actor | 6 |
| npc | NPC actor | 23 |
| trap | Trap actor | 6 (TrapSystemModel shell), 23 (full) |
| object | Object actor | 23 |

### D35E Item Types (18) → dnd35e

| D35E Type | dnd35e Type | Phase | Notes |
|-----------|-------------|-------|-------|
| weapon | Weapon item | 1 ✅ | Field renames |
| equipment | Equipment item | 19 | Armor, shield, wondrous |
| loot | Loot item | 19 | Generic items |
| consumable | Consumable item | 22 | Potions, scrolls, wands |
| class | Class item | 9 | Restructured progression |
| spell | Spell item | 17 (Alpha), 20 (Full) | Restructured |
| feat | Feat item | 11 | combatChanges → AE pattern |
| buff | **Buff Active Effect** | alpha.9 (core), beta.3 (expansion + item→AE migration) | Alpha introduces the minimal AE subtype; beta.3 adds the full schema and migrates D35E `buff` items |
| attack | Natural Attack item | 12 | Actions via Action System |
| race | Race item | 8 | Restructured with grants |
| enhancement | **Enhancement Active Effect** | 18 (Alpha), 25 (Full) | Item → AE |
| material | **Material Active Effect** | 2 ✅ | Done |
| aura | **Aura Active Effect** | 24 | Item → AE |
| alignment | Actor property | — | Dropped as type |
| damage-type | Config constant | — | Dropped as type |
| full-attack | Action Chain | 10 | Dropped as type — computed |
| card | Card item | 37 | Post-Release |
| valuable | Loot subtype | 19 | Merged into loot |

### D35E combatChanges → dnd35e AE Action-Phase Changes

| D35E combatChange itemType | dnd35e Equivalent | Phase |
|----------------------------|-------------------|-------|
| `all` / `allOptional` | AE change with `phase: 'action.*'` | 10, 11 |
| `attack` / `attackOptional` | AE change with `phase: 'action.attack'` | 10, 11 |
| `spell` / `spellOptional` | AE change with `phase: 'action.spell'` | 20 |
| `defense` / `defenseOptional` | AE change with `phase: 'initial'` targeting AC | 6, 19 |
| `savingThrow` / `savingThrowOptional` | AE change with `phase: 'action.save'` | 10 |
| `grapple` / `grappleOptional` | AE change with `phase: 'action.check'` targeting CMB | 10 |
| `skill` / `skillOptional` | AE change with `phase: 'action.check'` targeting skills | 6, 7 |
| `resistance` / `resistanceOptional` | AE change with `phase: 'action.spell'` targeting SR | 20, 21 |

### D35E Condition Indicators (25) → dnd35e

| D35E Condition | Phase | Status |
|----------------|-------|--------|
| blind | 21 | 📝 Planned |
| dazzled | 21 | 📝 Planned |
| deaf | 21 | 📝 Planned |
| entangled | 21 | 📝 Planned |
| fatigued | 21 | 📝 Planned |
| exhausted | 21 | 📝 Planned |
| grappled | 10 | 📝 Planned |
| helpless | 21 | 📝 Planned |
| paralyzed | 21 | 📝 Planned |
| pinned | 10 | 📝 Planned |
| fear (shaken/frightened/panicked) | 15 (stub), 21 (full) | Planned — 3-tier track, stub in Alpha for Frightful Presence |
| sickened | 21 | 📝 Planned |
| stunned | 21 | 📝 Planned |
| polymorphed | 21 | 📝 Planned |
| wildshaped | 21 | 📝 Planned |
| prone | 15 | Planned (Alpha) |
| dead | 6/21 | 📝 Planned |
| dying | 6/21 | 📝 Planned |
| disabled | 21 | 📝 Planned |
| stable | 21 | 📝 Planned |
| unconscious | 21 | 📝 Planned |
| staggered | 21 | 📝 Planned |
| invisible | 21 | 📝 Planned |
| banished | 21 | 📝 Planned |

### D35E Bonus Types (21) → dnd35e

| D35E Type | Stacking Rule | Phase |
|-----------|--------------|-------|
| untyped | Always stacks | 2 ✅ |
| base | Replace (BAB) | 2 ✅ |
| enh (enhancement) | Highest wins | 2 ✅ |
| dodge | Always stacks | 2 ✅ |
| inherent | Highest wins | 2 |
| deflection | Highest wins | 2 |
| morale | Highest wins | 2 |
| luck | Highest wins | 2 |
| sacred | Highest wins | 2 |
| insight | Highest wins | 2 |
| resist (resistance) | Highest wins | 2 |
| profane | Highest wins | 2 |
| trait | Highest wins | 2 |
| racial | Always stacks | 2 ✅ |
| size | Highest wins | 2 ✅ |
| competence | Highest wins | 2 |
| circumstance | Always stacks | 2 |
| alchemical | Highest wins | 2 |
| penalty | Always applies | 2 ✅ |
| replace | Override | 2 ✅ |
| shield | Highest wins | 2 |

### SRD Rules → Phase Coverage

| SRD Rule Area | Phase | Status |
|---------------|-------|--------|
| **Core Mechanic** (d20 + mod vs DC) | 7 | Designed |
| **Ability Scores** | 6 | Designed |
| **Races** (7 core + monstrous) | 8 | Designed |
| **Base Classes** (11 classes) | 9, 13 | Designed |
| **Prestige Classes** (14 SRD) | 9 | Designed |
| **NPC Classes** (5 classes) | 23 | Designed |
| **Multiclassing** | 9 | Designed |
| **Skills** | 6, 7 | Designed |
| **Feats** | 11, 26 | Designed |
| **Equipment** | 1, 19 | Designed |
| **Special Materials** | 2 ✅ | Done |
| **Magic Items** | 19, 22, 25 | Designed |
| **Combat: Initiative** | 14 | Designed |
| **Combat: Attack/Damage** | 10 | Designed |
| **Combat: AC & Saves** | 6, 10 | Designed |
| **Combat: Actions** | 10, 14 | Designed |
| **Combat: AoO** | 10 | Designed |
| **Combat: Full Attack** | 10 | Designed |
| **Combat: Special Attacks** (Bull Rush, Charge, Disarm, Grapple, Trip, etc.) | 10, 15 | Designed |
| **Combat: Mounted Combat** | 10 | Designed |
| **Combat: TWF** | 12 | Designed |
| **Combat: Cover** | 10 | Designed |
| **Combat: Flanking** | 11 | Designed |
| **Combat: Injury & Death** | 6, 21 | Designed |
| **Combat: Movement** | 14 | Designed |
| **Special Abilities** (Ex/Su/Sp, senses, DR, SR, etc.) | 8, 12, 13, 21 | Designed |
| **Magic** (spells, metamagic, counterspelling) | 17, 20, 26, 27 | Designed |
| **Monsters** (types, advancement, templates) | 8, 23 | Designed |
| **Conditions** (25+) | 15, 21 | Designed |
| **Epic Rules** | 35 | Post-Release |
| **Psionics** | 28, 36 | Beta / Post-Release |
| **Divine Rules** | 42 | Post-Release |
| **Variant Rules** | 43 | Post-Release |

### D35E Feature Coverage — Subsystem Mapping

| D35E Feature | Phase | Notes |
|--------------|-------|-------|
| combatChanges system | 10, 11 | → AE action-phase changes + PreRollDialog |
| combatChangesRange sliders | 11 | → AE Generator slider config |
| specialActions (26 commands) | 10, 9, 21 | → Action System + Grant System + AE lifecycle |
| 4 spellbooks per actor | 20 | → Spellbook sub-documents |
| 2 card decks | 37 | → Card items |
| Companion/Minion system | 23 | → Bond AE pattern |
| Treasure generator | 44 | Post-Release |
| Encounter generator | 44 | Post-Release |
| Point buy calculator | 6 | → Settings-based character creation |
| Rest dialog | 21 | → Rest action with configurable rules |
| Party HUD / Portrait bar | 23 | → TopPortraitBar equivalent |
| Stat block alternate sheet | 39 | Post-Release |
| Custom currency | 6 | → Config-based currency system |
| Fortification % | 19 | → Actor AC deferred field |
| Concealment % | 21 | → Actor AC deferred field |
| Arcane spell failure % | 19, 20 | → Equipment AE + caster check |
| Sneak attack dice | 11 | → Feat-generated precision damage |

---

## Open Architecture Sessions

### Alignment System — RESOLVED
Actor alignment is a strongly-typed tuple `[LawAxis, MoralAxis]`. Weapon alignment (Holy/Unholy/Axiomatic/Anarchic) is an enhancement AE. Alignment DR uses the same keywords. Full details in Metaphysical PropertyMap.

### DR & Energy Resistance Extensibility
DR system handles complex RAW interactions while remaining user-friendly and homebrew-extensible. Core data structures in place. Remaining: damage pipeline resolution in Phase 10 and enhancement threshold rules in Phase 25.

### Migration Versioning
Track `system.migration.version` on every actor/item. Field established in Phase 5. Runner in Phase 30.

### Action System Integration
All combat-related data feeds the Action System:
- Stats that action formulas reference → register in FormulaFamiliar schema (Phase 7)
- Modifiers of action behavior → AE changes targeting action schema fields (Phase 10)
- Grants/modifies available actions → EffectTrigger (Phase 10)
- Changes turn economy → TurnActionBudget state modification (Phase 14)