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
      // `elapsed`: rounds ticked so far. Incremented on the bearer's turn start by the
      //   combat tracker hook.
      // `deleteOnExpiry`: default true for spell buffs — when `elapsed >= rounds`, the
      //   AE is deleted. If false, it is marked inactive but retained (for sheet display).
      duration: new fields.SchemaField({
        rounds: requiredNumberField({ initial: 0, min: 0 }),
        elapsed: requiredNumberField({ initial: 0, min: 0 }),
        deleteOnExpiry: requiredBooleanField({ initial: true }),
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

alpha.7 (Combat Tracker & Turn Economy) already stubs *"buff expirations (stub for Phase 20)"* in its combat tracker turn-start hook. Alpha.9 fills in the stub:

1. On the bearer actor's turn-start, iterate active Buff AEs on the actor.
2. For each: `system.duration.elapsed += 1`.
3. If `elapsed >= rounds && rounds > 0`:
   - If `deleteOnExpiry` → `effect.delete()`.
   - Else → `effect.update({ 'system.active': false, disabled: true })`.

Buffs with `rounds === 0` are treated as **indefinite** (no tick) — used by passive/permanent buffs migrated from D35E `buff` items in beta.3, but rejected in alpha.9 since Bless/PfE/Divine Favor all set explicit round durations.

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
