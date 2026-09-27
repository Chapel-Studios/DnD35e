# Alpha Phase 9 — Buff Active Effect (Core)

**Status**: 📖 Rough Sketch

> **Milestone**: Alpha  
> **Dependencies**: poc.2 (Active Effect on Item — stacking engine, phase system, GeneralSystemModel), poc.6 (Actor Foundation — Buff AEs live on actors). Soft sibling: alpha.8 (Conditions) — both use the "AE subtype with its own SystemModel + actor placement" pattern.  
> **Goal**: Introduce the **Buff Active Effect subtype** with the minimum surface needed for Paladin alpha spells (Bless, Protection from Evil, Divine Favor). Buff AEs are *AE subtype documents*, not item documents — `Buff` is **not** a D&D 3.5e item type in dnd35e. A spell's cast action creates a Buff AE **directly on the target actor**; the buff carries `bonusType`-tagged changes that flow through the Phase 2 stacking engine; the buff can be toggled on/off; it ticks down with combat rounds and expires.

---

## 9.1 Why Buff AE Core Lives in Alpha

The alpha exit criteria require players to *"cast Bless and Divine Favor (RAW spell slots), see morale stacking collision on fear saves (Aura of Courage +4 suppresses Bless +1)."* That collision is only meaningful if Bless actually applies its +1 morale bonus through a Buff AE.

- alpha.11 (Spells) — Paladin casts Bless / Protection from Evil / Divine Favor; cast action creates a Buff AE on the target.
- alpha.6 (Class Features) — Aura of Courage applies a `morale` change of `+4` that collides with the Bless buff (suppressed) on fear saves.
- alpha.8 (Conditions) and alpha.6 already use the AE pipeline; Buff AE Core adds the *temporary, toggleable, duration-tracked, activatable* AE subtype that conditions and class-feature passives don't need.

This phase delivers **only the minimum surface those three spells consume**. Everything else — `buffType` taxonomy, formula-driven timelines, damage pools, shapechange, the dedicated "Buffs" sheet section, and the D35E `buff` item → Buff AE data migration — is **beta.3** (Buff AE Expansion & Conditions Full). See §9.7 below.

---

## 9.2 What's In vs. What's Deferred

### In (alpha.9)

- New AE subtype `buff` registered alongside `general`, `material`, `secret`.
- `BuffSystemModel` schema with the minimum fields below.
- `Dnd35eBuffActiveEffect` class extending `Dnd35eActiveEffect`.
- Non-transferring: created directly on the bearer (target actor), not on an item.
- Activation/deactivation toggle. Deactivated Buff AE suppresses all its changes but is not deleted.
- Round-based duration with combat-tracker tick-down and expiry behavior.
- Changes flow through the Phase 2 stacking engine via `bonusType`.
- Minimal Buff AE config sheet (read/edit name, description, duration, changes, activation).
- Tests covering: creation, change application via stacking, deactivation suppression, round tick-down, expiry.

### Deferred to beta.3 (Buff AE Expansion)

- `buffType` taxonomy: `'temp' | 'perm' | 'item' | 'shapechange' | 'misc'`.
- `timeline.formula` — formula-driven durations replacing the simple `rounds` field.
- `damagePool: { max, current }` — Stoneskin-style absorb.
- `shapechange: { type, source, ... }` — polymorph / wildshape integration.
- `hideFromToken: boolean`.
- Dedicated **"Buffs" sheet section** UI on the character sheet (alpha.9 buffs render in the generic effects list).
- D35E `buff` item → Buff AE **data migration**.
- `actorTurnEnd` / `creationInitiativeStart` expiry-trigger evaluation logic (§9.4b) — the `expiryTrigger` schema field ships in alpha.9, only its `actorTurnStart` case is wired.

> Beta.3 *extends* alpha.9's schema; it does not replace it. The alpha.9 fields below are stable contracts that beta.3 builds on.

---

## 9.3 BuffSystemModel — Schema (Alpha Core)

```ts
// src/entities/activeEffects/buff/BuffSystemModel.mts
import { Dnd35eActiveEffectSystemModel } from '...';

export class BuffSystemModel extends Dnd35eActiveEffectSystemModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),

      // On/off toggle. Cast action sets `true`; expiry or dismissal sets `false`.
      // Deactivated buffs are NOT deleted (unless `duration.deleteOnExpiry`); their
      // changes are suppressed in `applyActiveEffects()` via the existing AE pipeline.
      active: requiredBooleanField({ initial: true }),

      // Round-based duration.
      // `rounds`: total duration in combat rounds (set by the cast action at cast time).
      // `elapsed`: rounds ticked so far. Incremented per `expiryTrigger` below by the
      //   combat tracker hook.
      // `deleteOnExpiry`: default true for spell buffs — when `elapsed >= rounds`, the
      //   AE is deleted. If false, it is marked inactive but retained (for sheet display).
      // `expiryTrigger`: which turn-boundary `elapsed` ticks/expires against — see §9.4b.
      //   Alpha.9 only wires `'actorTurnStart'` (the only case Bless/PfE/Divine Favor need);
      //   the field exists now so beta.3 doesn't need a schema migration to add the other two.
      // `creationRound`/`creationInitiative`: combat round + initiative captured at AE
      //   creation time — only read when `expiryTrigger === 'creationInitiativeStart'`.
      duration: new fields.SchemaField({
        rounds: requiredNumberField({ initial: 0, min: 0 }),
        elapsed: requiredNumberField({ initial: 0, min: 0 }),
        deleteOnExpiry: requiredBooleanField({ initial: true }),
        expiryTrigger: requiredStringField({
          initial: 'actorTurnStart',
          choices: ['actorTurnStart', 'actorTurnEnd', 'creationInitiativeStart'],
        }),
        creationRound: optionalNumberField(),
        creationInitiative: optionalNumberField(),
      }),

      // Short human-facing description shown on the AE sheet and chat card.
      description: new fields.HTMLField({ required: false }),
    };
  }
}
```

> `bonusType` is **per-change**, already on the base `Dnd35eEffectChangeData` from poc.2 — Buff AE inherits this from the parent AE schema's `changes[]` array. No new field needed at the buff level.

### Flag convention

- `flags.dnd35e.isSpellEffect: true` on Buff AEs created by spell cast actions.  
  Already referenced by alpha.11 §16.4 — preserves the spell→buff provenance for Dispel Magic logic in beta.

---

## 9.4 Lifecycle Hooks

### Creation (cast-action side)

Owned by alpha.11 (Spells). When a Paladin casts Bless:

1. Cast action selects target token(s).
2. Action builds an AE document body: `type: 'buff'`, `name: 'Bless'`, `system.duration.rounds: 10 * casterLevel`, `system.active: true`, `changes: [...]` (morale +1 attack, morale +1 saves vs fear), `flags.dnd35e.isSpellEffect: true`.
3. `Actor.createEmbeddedDocuments('ActiveEffect', [aeData])` on the target — non-transferring (no item parent).

Alpha.9 provides the *target* (the AE subtype + schema) for this flow. It does **not** implement the cast action itself.

### Activation / Deactivation

User-facing toggle on the AE sheet (and on the actor's effects list, post-beta in the dedicated Buffs section). Flips `system.active`. The Phase 2 effect application pipeline already gates change application on `disabled` (Foundry's native flag) — the alpha.9 toggle uses the same mechanism but is exposed as "Active" on the Buff sheet for user-facing clarity.

> Note: `system.active` and core Foundry `disabled` are kept in sync: `active === !disabled`. Stored on `system` so beta.3 can extend with derived activation logic (e.g., activation conditions evaluated by FormulaFamiliar) without restructuring.

### Round tick (combat-tracker side)

alpha.7 (Combat Tracker & Turn Economy) already stubs *"buff expirations (stub for Phase 20)"* in its combat tracker turn-start hook. Alpha.9 fills in the stub for the `'actorTurnStart'` trigger only:

1. On the bearer actor's turn-start, iterate active Buff AEs on the actor with `expiryTrigger === 'actorTurnStart'`.
2. For each: `system.duration.elapsed += 1`.
3. If `elapsed >= rounds && rounds > 0`:
   - If `deleteOnExpiry` → `effect.delete()`.
   - Else → `effect.update({ 'system.active': false, disabled: true })`.

Buffs with `rounds === 0` are treated as **indefinite** (no tick) — used by passive/permanent buffs migrated from D35E `buff` items in beta.3, but rejected in alpha.9 since Bless/PfE/Divine Favor all set explicit round durations.

### 9.4b Expiry Trigger Points (schema now, remaining evaluation logic beta.3)

D&D 3.5e duration wording maps to three distinct turn-boundary checks, not just one — `expiryTrigger` picks which:

| `expiryTrigger` | SRD wording it matches | Evaluated where | Alpha.9 status |
|---|---|---|---|
| `actorTurnStart` (default) | "1 round/level", "until the start of your next turn" | `CombatDnd35e#_onStartTurn()`, bearer only (existing alpha.7 stub) | ✅ wired |
| `actorTurnEnd` | "until the end of this turn" | `CombatDnd35e#_onEndTurn()`, bearer only — **not yet overridden** in dnd35e; core's `Combat#_onEndTurn()` hook point already exists (see `types/foundry/client/documents/combat.d.mts`) | ❌ beta.3 |
| `creationInitiativeStart` | "1 round" measured from the moment of casting, independent of whose turn it is next — the effect lapses when initiative order returns to the same count it was created at, not at the bearer's own turn | `CombatDnd35e#_onStartTurn()`, evaluated for **every** combatant that turn (not just the bearer) against `creationRound`/`creationInitiative` | ❌ beta.3 |

> **Legacy D35E precedent (verified against real source, `Data/systems/D35E/module/`)**: D35E implements the `creationInitiativeStart` case by inserting a literal synthetic "ghost" `Combatant` into the tracker (`flags.D35E.buffId`, `combat.js` `addBuffsToCombat()`) at `anchorInitiative ± 0.01` — `+0.01` for a normal tick, `-0.01` when `system.timeline.tickOnEnd` is set (their `actorTurnEnd`-equivalent). The anchor is whoever was the *active combatant when the buff was created* (usually the caster, not the bearer) — not the bearer's own turn. The ghost row is **visible** in D35E's tracker (shows the buff's name/icon as its own turn); reaching it silently runs `Actor#progressBuff()` then auto-advances (`combat.js` `_processCurrentCombatant()`/`nextTurn()`). This is a proven approach but has real UX cost (phantom tracker rows) — dnd35e's `CombatDnd35e` uses real `_onStartTurn`/`_onEndTurn`/`_onStartRound`/`_onEndRound` overrides, not synthetic combatants, so beta.3 should evaluate a `creationRound`/`creationInitiative` comparison inside the real per-combatant turn hooks instead of replicating the ghost-combatant trick — open design question to settle when beta.3 is scoped in detail.

An on-expiry **and per-round-while-active action** hook is explicitly out of scope for both alpha.9 and beta.3 — see §9.4c below.

> poc.10 Story E's short-duration combat conditions (Charged/Defensive Fighting/Total Defense) are **not** part of this system — they only ever need the `actorTurnStart` case ("until your next turn"), which Foundry's own native `ActiveEffect.duration` + `ActiveEffectRegistry` already provides for free (see `conditions.mts`/`ActiveEffectDnd35e.mts#_onUpdate`). This `expiryTrigger` design is for the general Buff AE system only.

### 9.4c Recurring / On-Expiry Action Hook (deferred design)

alpha.9/beta.3's duration system (§9.4b) only ever *deletes or deactivates* a buff on expiry. Many D&D 3.5e buffs and poisons need to *do* something every round they're active (and/or once on expiry), not just vanish — damage-over-time poisons, fast healing/regeneration buffs, etc.

**Confirmed legacy precedent** (verified against real source, `Data/systems/D35E/module/actor/entity.js` `applyOnRoundBuffActions()`): D35E buffs carry `system.perRoundActions[]`, an array of `{ action: string }` mini-DSL strings (e.g. `"Regenerate 5 on self;"`, `"SelfDamage -2 on self;"`, `@roundDelta` substitution) executed every round the buff is active. These are **not** silently auto-applied — they're posted as a chat card with one clickable button per action (`action: 'customAction'`) that the GM/player clicks to confirm, matching the same click-to-apply pattern the rest of D35E's roll/damage flow uses.

dnd35e should NOT copy D35E's raw string-macro DSL verbatim — the system already has richer typed action definitions (`@items/baseItem/actions`) that a "run this on my turn while active" reference could point to instead of a bespoke string language. This needs its own design pass once the general Buff AE system (beta.3) exists: likely a `perRoundActions`-equivalent field referencing real `IAction` entries, evaluated at the same expiry-trigger checkpoints as `expiryTrigger` (§9.4b), and surfaced via a confirm-to-apply chat card rather than silent auto-application (consistent with the rest of this codebase's damage/roll conventions).

---

## 9.5 Sheet (Alpha — Minimal)

A minimal Vue Buff AE config sheet (`BuffSheet.vue`) extending the base AE sheet:

- Name, description, image — inherited.
- Changes table — inherited.
- **Activation row**: toggle for `system.active`.
- **Duration row**: `rounds` (number), `elapsed` (number, GM-only edit), `deleteOnExpiry` (checkbox).
- No `buffType` selector, no timeline formula picker, no damage pool — those are beta.3.

The dedicated "Buffs" section on the character sheet is **deferred to beta.3**. In alpha.9, Buff AEs render in the generic effects list with the rest of the AEs.

---

## 9.6 Integration Tests (Alpha Exit Coverage)

The buff AE Core must prove four behaviors before alpha.9 closes:

1. **Creation + change application**: A Buff AE created on a Character actor with a `morale +1` attack change is applied through the stacking engine; the actor's attack derives include the morale bonus.
2. **Stacking collision**: With Aura of Courage (`morale +4` on fear saves) present, a Bless Buff AE (`morale +1` on fear saves) is **suppressed** by the stacking engine — stacking history records "Bless (+1 morale) — suppressed by Aura of Courage (+4 morale)." This is the alpha exit-criterion stacking proof.
3. **Round tick + expiry**: A Buff AE with `rounds: 2, deleteOnExpiry: true` ticks to expiry over two combat-tracker turn-starts; the AE is deleted at the end of the second turn-start.
4. **Deactivation suppression**: Toggling `system.active: false` causes all changes to vanish from the actor's derived data without deleting the AE.

---

## 9.7 Out of Scope (Explicit)

- ❌ `buffType` field and taxonomy.
- ❌ Formula-driven timelines.
- ❌ Damage pool, shapechange, hideFromToken.
- ❌ Dedicated "Buffs" sheet section.
- ❌ D35E `buff` item → Buff AE data migration.
- ❌ Buff stacking-by-source rules (multiple Bless from different casters) — alpha.9 lets all buff changes flow through the standard stacking engine, with `bonusType` doing the work.
- ❌ Dispel Magic interaction beyond setting `flags.dnd35e.isSpellEffect: true` as provenance.
- ❌ `actorTurnEnd` / `creationInitiativeStart` expiry-trigger evaluation (§9.4b) — schema field ships, only `actorTurnStart` is wired.
- ❌ On-expiry/recurring action execution hook (§9.4c).

These all land in **beta.3** (Buff AE Expansion & Conditions Full).

---

## 9.8 Files to Create / Modify

### Create

- `src/entities/activeEffects/buff/Buff.mts` — `Dnd35eBuffActiveEffect` class.
- `src/entities/activeEffects/buff/BuffSystemModel.mts` — schema.
- `src/entities/activeEffects/buff/BuffSystemData.mts` — runtime types.
- `src/entities/activeEffects/buff/BuffStore.mts` — Pinia store (mirrors `material/`).
- `src/entities/activeEffects/buff/components/BuffSheet.vue` — minimal sheet.
- `src/entities/activeEffects/buff/index.mts` — barrel.
- `tests/unit/buff-ae-core.test.mts` — schema + lifecycle tests.
- `tests/e2e/buff-stacking.spec.ts` — alpha exit-criterion stacking proof against real Foundry.

> The `poc/refactor-naming-conventions` refactor already parks the legacy `src/entities/items/Dnd35eBuff/Dnd35eBuff.mts` placeholder at `src/entities/activeEffects/buff/` as obsolete reference. Alpha.9 replaces the placeholder content but inherits the location.

### Modify

- `src/entities/activeEffects/registration.mts` — register `'buff'` subtype.
- `system.json.template` — add `'buff'` to `documentTypes.ActiveEffect.types`.
- `src/lang/<locale>/dnd35e.json` — add buff label keys.
- `src/entities/activeEffects/types.mts` — add Buff AE to the discriminated union.

### Cross-phase touches

- `alpha/phase-07-combat-tracker.md` — the turn-start "buff expirations (stub)" hook becomes the real implementation. Sub-checklist line moves from "stub" to "implemented in alpha.9."
- `alpha/phase-11-spells.md` — adds alpha.9 as a hard dependency; cast actions for Bless / PfE / Divine Favor construct Buff AE bodies using the alpha.9 schema.
- `beta/phase-03-buffs-conditions.md` — header retitled to "Buff AE Expansion & Conditions (Full)"; buff sections rescope as expansions over the alpha.9 schema, not greenfield creation.
- `docs/architecture/property-maps/PropertyMap-ActiveEffects.md` §5 — alpha core vs. beta expansion split called out explicitly.

---

## 9.9 Completion Checklist

- [ ] Create `src/entities/activeEffects/buff/` slice (`Buff.mts`, `BuffSystemModel.mts`, `BuffSystemData.mts`, `BuffStore.mts`, `index.mts`).
- [ ] Define `BuffSystemModel` schema with `active`, `duration.{rounds, elapsed, deleteOnExpiry}`, `description`.
- [ ] Implement `Dnd35eBuffActiveEffect` class extending the base AE.
- [ ] Register `'buff'` subtype in `src/entities/activeEffects/registration.mts` and `system.json.template`.
- [ ] Add Buff label / description i18n keys.
- [ ] Implement `system.active` ↔ Foundry `disabled` sync (deactivation suppresses changes without deletion).
- [ ] Fill in the alpha.7 combat-tracker turn-start hook: tick `duration.elapsed` on each active Buff AE on the bearer; expire per `deleteOnExpiry`.
- [ ] Minimal Buff AE config sheet (Vue) — name, description, activation toggle, duration row, changes table.
- [ ] Unit test: schema validation, default values, `active` ↔ `disabled` sync.
- [ ] Integration test: Buff AE with `morale +1` attack change creates expected derived bonus on a Character actor.
- [ ] Integration test: Bless Buff AE (`morale +1` fear-save) is suppressed by Aura of Courage (`morale +4` fear-save) in stacking history. **(Alpha exit-criterion proof.)**
- [ ] Integration test: Buff AE ticks down over two combat-tracker turn-starts and is deleted at expiry.
- [ ] Integration test: toggling `system.active: false` removes the Buff AE's changes from derived data without deletion.
- [ ] Cross-phase: update `alpha/phase-07-combat-tracker.md` checklist — buff expiry line moves from "stub" to "implemented (depends on alpha.9)".
- [ ] Cross-phase: update `alpha/phase-11-spells.md` dependency line + cast-action prose to reference alpha.9 Buff AE.
- [ ] Cross-phase: update `beta/phase-03-buffs-conditions.md` header + buff sections to "expansion over alpha.9".
- [ ] Cross-phase: update `docs/architecture/property-maps/PropertyMap-ActiveEffects.md` §5 with alpha/beta split callout.

---

## 9.10 Open Questions

1. **Activation source-of-truth**: `system.active` vs Foundry `disabled`. Proposal: keep both in sync, expose `system.active` on the sheet for clarity, treat `disabled` as the canonical flag for the AE application pipeline. Open to inverting if beta.3 needs `system.active` to be derived (e.g., gated by a formula).
2. **`rounds: 0` semantics**: Treat as indefinite (no tick, no expiry) per §9.4, or reject as invalid in alpha.9 and require beta.3 to introduce indefinite buffs? Recommended: accept but rejected by the alpha.9 cast actions (Bless/PfE/Divine Favor all set explicit rounds).
3. **Buff Store scope**: Does the Pinia store carry derived "is this buff a spell effect" / "source caster" data, or do we keep it purely the AE document + reactivity? Recommended: just the document, derived selectors as needed by the sheet.
4. **Tests against real Foundry vs. mocks**: The stacking-collision proof is best done as an E2E test (Playwright against Foundry). Confirm scope — alpha.9 owns the test, or does alpha.6 (Aura of Courage) / alpha.11 (Bless cast) own the integration?
