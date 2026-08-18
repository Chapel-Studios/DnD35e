# POC Phase 10: Basic Combat

**Status**: 🔶 In Progress

> **Milestone**: POC  
> **Dependencies**: poc.6, poc.7, poc.9  
> **Goal**: The combat tracker is functional. A character can take moves, 5-foot steps, withdraws, charges, melee attacks (including manual full attacks and two-weapon fighting), and ranged/thrown attacks with ammo — proving the full manual action-economy loop. Charge (a movement action, not a combat maneuver itself) is implemented in full (movement + mandatory attack) this phase, proving out the movement-linked-attack machinery alpha.3's actual combat maneuvers will need; automated/progressive full-attack UX and the combat maneuvers themselves (bull rush, grapple, trip, etc.) stay deferred to alpha.3.

---

## Table of Contents

1. [Overview & Scope](#overview--scope)
2. [CombatantDnd35e & Action Economy](#combatantdnd35e--action-economy)
3. [Initiative & Combat Tracker](#initiative--combat-tracker)
4. [ActionDataModel — First Cut](#actiondatamodel--first-cut)
5. [Default Weapon Actions](#default-weapon-actions)
6. [SIZE_REACH & Target Validation](#size_reach--target-validation)
7. [Movement Integration & Provoking Actions](#movement-integration--provoking-actions)
8. [Action Execution Engine](#action-execution-engine)
9. [Chat Card](#chat-card)
10. [Ranged Attacks & Ammo](#ranged-attacks--ammo)
11. [Attacks of Opportunity](#attacks-of-opportunity)
12. [Sheet & Canvas (HUD) Triggers](#sheet--canvas-hud-triggers)
13. [Open Decisions](#open-decisions)
14. [Files to Create / Modify](#files-to-create--modify)
15. [Stories & Completion Checklist](#stories--completion-checklist)

---

## Overview & Scope

Phase 10 is the proof that a full manual combat exchange works end-to-end. It sits between the actor/roll foundation (poc.6/poc.7) and the full Action System (alpha.3). Most of alpha.3's originally-planned scope has been pulled forward into poc.10 — Charge (a movement action, not a combat maneuver) is fully implemented here (not just its attack-roll half), serving as an early proof-of-concept for the movement+attack linkage alpha.3's combat maneuvers will reuse; the maneuvers themselves (bull rush, grapple, trip, disarm, etc.) and fully-automated/progressive full-attack UX stay deferred.

### What Phase 6 already provides
- Actor HP, `DocumentEventEmitter`, `takeDamage`/`dying`/`death` event cascade
- `wellKnownEvents` registry and `registerEventType()` infrastructure
- `destroyed` cascade on item HP

### What Phase 7 already provides
- `D20Roll` custom roll class (already carries a `confirmCritical(targetAC)` method explicitly reserved for Phase 10's attack rolls — see §10.7)
- `FormulaFamiliar` resolve pipeline (`#context.property` syntax, via `FormulaData.resolve()`/`FormulaResolver.resolveFormula()` — **no** `@attr`/`getRollData()` bridge exists or is planned; see `docs/migration-plan/post-release/WISHLIST.md`). Foundry's own `Actor#getRollData()`/`Item#getRollData()` exist only as a narrow AE change-value fallback (`resolveChangeValue.mts`) and are never used to build roll formulas — FormulaFamiliar resolves everything our roll formulas need before a `Roll` is ever constructed
- The `Creature.rollSave()` → `D20RollDialogConfig` → `D20Roll` → `buildSaveCard()` roll+chat-card pipeline (`src/dice/rollMessages.mts`), which initiative and attack rolls both mirror

### What Phase 9 already provides
- `TokenDocumentDnd35e` real class with `_preCreate()` size defaults
- `SIZE_TOKEN_DIMENSIONS` constant
- 5-mode movement speed fields on the actor sheet (`walk`, `fly`, `swim`, `burrow`, `climb`)
- `_getAnimationMovementSpeed()` override on `TokenDnd35e`
- Full Foundry v13+ Movement Action system already implemented: `movementBudget.mts` (`getMovementBudget()`/`isOverBudget()`), `movementActionGating.mts` (custom `run`/`dropProne`/`standUp` actions + gating functions), `TokenDocumentDnd35e._onUpdateMovement()` (fires after a completed drag), `TokenRulerDnd35e` (live budget visualization)
- Flat-footed condition fully implemented: `FLAT_FOOTED_CONDITION_ID` in `src/constants/conditions.mts`, `denyDexToAC()` AE change, `CreatureAC.vue` toggle UI — only the combat-start auto-apply hook is missing
- `aooCount` derived field already on `CreatureSystemModel`/`CreatureSystemData` (aliased `attacksOfOpportunity`), displayed via `AooPerRound.vue`, plus a `THREATENED_SHOW_SQUARES` GM setting already registered
- Equip-slot infrastructure already exists: `MAIN_HAND_EQUIP_SLOT`/`OFF_HAND_EQUIP_SLOT` (`@constants/equipmentSlots.mjs`), `equippedSlotIds`/`isEquipped`/`isCarried` on `EquippableItemSystemData`/`PhysicalItemSystemData`, weapon `weaponSubtype` (including `LIGHT_WEAPON`) and the `weaponDamage` group (`damageRoll`, `damageType`, `critRange`, `critMultiplier`, `rangeIncrement`, `attackFormula`, `damageFormula`) plus `attackNotes`/`damageNotes` on `WeaponSystemModel` (`src/documents/items/physical/weapon/data/WeaponSystemModel.mts`) — audited against the legacy D35E weapon sheet's Details tab (§10.4 below)

### What Phase 10 adds
- `DamageRoll` custom roll class (sibling of `D20Roll`; was pushed back from Phase 7 — not implemented yet)
- `CombatantDnd35e` with per-round action economy tracked in `flags.dnd35e.actionEconomy` (Combatant has no `system`/TypeDataModel support in this Foundry version — verified against the bundled v14 type defs)
- Custom `rollInitiative()` mirroring `rollSave()`'s dialog → roll → chat-card pipeline (no `CONFIG.Combat.initiative.formula`, since there's no roll-data bridge to feed it)
- Combat tracker rows show action pips (standard/move/AoO) sourced from combatant flags; pips reset on turn start
- `ActionDataModel` first cut: attack actions (melee, ranged/thrown) with `check`/`damage`/`chain`/`requiresEquipped`/`provokes`/`maxTargets` — no stored `hand`/`defaultSlotId` fields; both are derived live at execution time (§10.3)
- Weapons get real, stored `MeleeWeaponAttack`/`RangedWeaponAttack`/`ThrownWeaponAttack` actions, auto-created/deleted as `weaponSubtype`/`thrown` change (`systemCreated` flag, mirroring `isMasterwork`/`syncMasterworkAeState()`); live weapon data merges onto them via `Weapon.getContributedActorChanges()` until a user edits one, at which point it becomes permanent
- Actions tab/interface on the weapon sheet for authoring/editing actions
- `SIZE_REACH` constant: size → reach in grid squares
- Movement-provokes integration folded into the *existing* `_onUpdateMovement()` — no new Token hooks
- Three new movement actions: `fiveFootStep`, `withdraw`, and `charge` (§10.6) — `charge` is provoking like `walk`/`run`, combat-only, straight-line-only (same drag-waypoint restriction as `run`), always spends the full turn (move + standard), and mandates a single melee attack, auto-checking the Attack Roll Dialog's Charge toggle on that attack. Charge is a movement action, not a combat maneuver — implementing it fully here is an early proof-of-concept for the movement+attack linkage alpha.3's actual combat maneuvers will need
- `UseActionContext`, `preUseAction` / `postUseAction` / `dealDamage` domain events
- `useAction()` execution engine on `ActorDnd35e`, supporting manual full attack (repeated attacks spending a per-hand BAB pool) and two-weapon fighting (per-hand BAB, SRD off-hand penalty using existing `weaponSubtype`)
- D20Roll vs target AC → hit/miss attack card; a **chained** Resolution card is posted once the target's row is applied — the defender's Roll Defense Dialog finalizes hit/miss, and on a hit, damage is rolled **and auto-applied** as part of posting that same card, with a delta-based Undo button available. This two-card Attack → Resolution chain matches D35E's own attack/defense dialog exchange (see §10.8)
- `buildAttackCard()` chat card, mirroring `buildSaveCard()`'s precompiled-Handlebars pattern
- New `Ammo` item type + equippable Quiver support; ranged/thrown actions consume ammo
- Attacks of Opportunity: automatic detection of provoking actions taken in a threatened square, with asymmetric player/GM visibility; threatened-square highlighting on token selection
- Token HUD bottom row (new, alongside Foundry's existing left/right HUD columns): **Weapon Attacks** and **Combat Maneuvers** controls, each expanding a list on click the same way the existing Movement Action control does; Weapon Attacks is fully populated this phase, Combat Maneuvers has a single entry this phase (Total Defense — real maneuvers like trip/grapple/bull rush are alpha.3) + sheet weapon-row attack buttons (work regardless of equip state)

### Scope boundaries — deliberately excluded
| Feature | Deferred to |
|---------|-------------|
| Automated/progressive full-attack UX (auto-suggested iterative sequence, stop/continue flow) | alpha.3 |
| Combat maneuvers (trip, grapple, bull rush) | alpha.3 |
| Feats/abilities that grant generic attack overrides (e.g. Cleave-style free attacks) — `useAction()` reserves a `free: true` bypass for this, but no trigger-scanning system is built since no Feat item type exists yet | alpha.3 |
| Author-added custom weapon actions (`CustomWeaponAction`, weapon sheet "New Action" button) | alpha.3 |
| GM manual AoO override UX (veto/force controls) — explore-at-phase-start once real play surfaces what's needed | alpha.3 |
| Precision damage (Sneak Attack/Skirmish/Sudden Strike) eligibility system, and any GM override for it | alpha.3 |
| Spell attacks | alpha.11 |

---

## §10.1 CombatantDnd35e & Action Economy

### Why flags, not a system model

Verified against the bundled Foundry v14 type defs (`types/foundry/common/documents/combatant.d.mts`): `CombatantSchema` has only `actorId`/`tokenId`/`sceneId`/`name`/`img`/`initiative`/`hidden`/`defeated`/`flags` — no `type`, no `system` `TypeDataField`. Combatant cannot host a `TypeDataModel` in this Foundry version. Per-round action economy lives in `flags.dnd35e.actionEconomy`, read/written through a plain-function module — matching the convention already established by `movementBudget.mts`/`movementActionGating.mts` (exported functions operating on a passed-in document), not a stateful wrapper class.

### Action economy shape

```typescript
// src/documents/combat/combatant/combatantActionEconomy.mts
interface CombatantActionEconomy {
  actions: { standard: boolean; move: boolean; minor: boolean; aoo: number };
  bab: { main: number; off: number };
  used: { standard: boolean; move: boolean; minor: boolean; standardAttackUsed: boolean; movedAfterAttack: boolean; chargedThisTurn: boolean };
}

function getActionEconomy(combatant: CombatantDnd35e): CombatantActionEconomy { /* reads flags.dnd35e.actionEconomy, applies defaults */ }
async function resetActionEconomy(combatant: CombatantDnd35e, actor: ActorDnd35e): Promise<void> {
  // Refill both hands to actor.system.attributes.bab.total, aoo to actor.system.aooCount,
  // reset actions.standard/move/minor to true, clear all `used` flags
}
async function spendStandardAction(combatant: CombatantDnd35e): Promise<void> { /* actions.standard = false, used.standard = true */ }
async function spendMoveAction(combatant: CombatantDnd35e): Promise<void> { /* actions.move = false, used.move = true */ }
async function spendMinorAction(combatant: CombatantDnd35e): Promise<void> { /* actions.minor = false, used.minor = true */ }
async function spendHandBab(combatant: CombatantDnd35e, hand: 'main' | 'off' | 'both', amount: number): Promise<void> { /* hand === 'both': subtract amount from both bab.main and bab.off (each floored at 0); else bab[hand] -= amount, floor 0 */ }
async function spendAoO(combatant: CombatantDnd35e): Promise<void> { /* actions.aoo -= 1, floor 0 */ }
async function markMovedAfterAttack(combatant: CombatantDnd35e): Promise<void> { /* used.movedAfterAttack = true */ }
// Set by `_onUpdateMovement()` (§10.6) once a `charge` movement action completes. Read directly by
// `executeAction()` to auto-check the Charge toggle; consumed by `useAction()` right after that
// attack resolves (calls `markMovedAfterAttack()` to enforce SRD's "only a single melee attack" charge
// restriction) — never cleared independently, since `resetActionEconomy()` wipes all `used` flags at
// the combatant's next turn anyway.
async function markChargedThisTurn(combatant: CombatantDnd35e): Promise<void> { /* used.chargedThisTurn = true */ }
// Inverse of spendMoveAction/spendStandardAction — powers the Move Action card's Undo button (§10.6). Does not
// touch `used.movedAfterAttack`; refunding a move doesn't retroactively un-provoke or re-enable spent attacks.
async function refundMoveAction(combatant: CombatantDnd35e): Promise<void> { /* actions.move = true, used.move = false */ }
async function refundStandardAction(combatant: CombatantDnd35e): Promise<void> { /* actions.standard = true, used.standard = false */ }
// Inverse of spendHandBab — powers the Resolution card's Undo button (§10.7): undoing a hit refunds the
// attacker's standard action *and* the BAB spent from the acting hand(s) in the same click as the damage reversal.
async function refundHandBab(combatant: CombatantDnd35e, hand: 'main' | 'off' | 'both', amount: number): Promise<void> { /* hand === 'both': refund amount to both bab.main and bab.off; else bab[hand] += amount — capped at actor.system.attributes.bab.total */ }
function canUseHandAttack(combatant: CombatantDnd35e, hand: 'main' | 'off' | 'both'): boolean {
  const econ = getActionEconomy(combatant);
  if (econ.used.movedAfterAttack) return false;
  if (econ.actions.standard) return true;
  // Two-handed wielding needs BAB remaining in *both* pools — spendHandBab()'s 'both' case draws from both at once.
  return hand === 'both'
    ? (econ.bab.main > 0 && econ.bab.off > 0)
    : econ.bab[hand] > 0;
}
```

### CombatantDnd35e class

```typescript
// src/documents/combat/combatant/CombatantDnd35e.mts
class CombatantDnd35e extends foundry.documents.BaseCombatant {
  /** Convenience accessor — delegates to combatantActionEconomy.mts, does not own the state. */
  get actionEconomy(): CombatantActionEconomy {
    return getActionEconomy(this);
  }
}
```

Register: `CONFIG.Combatant.documentClass = CombatantDnd35e`

### CombatDnd35e — `_onStartRound()`/`_onStartTurn()` overrides, not `_onUpdate()`

Foundry v14's actual client-side `Combat` class (`client/documents/combat.mjs`, verified against the bundled game install — **not** `types/foundry/client/documents/combat.d.mts`, which is stale here: it declares `_onEndTurn(combatant)`/`_onEndRound()`/`_onStartRound()`/`_onStartTurn(combatant)` with **no `context` parameter at all**, even though the sibling `_clearMovementHistoryOnStartTurn(combatant, context)` two members later in the same file *does* type it — the runtime source unambiguously calls all four with a `context: CombatRoundEventContext | CombatTurnEventContext` argument) already ships dedicated, granular lifecycle hooks for exactly this need: `_onEnter`/`_onExit` (combatant added/removed from the encounter), and — driven by an internal `_manageTurnEvents()` → `#triggerTurnEvents()` interval-walk that runs once the triggering Combat update completes — `_onEndTurn(combatant, context)`, `_onEndRound(context)`, `_onStartRound(context)`, `_onStartTurn(combatant, context)`, invoked in that exact order for **every round/turn boundary actually crossed**, even when a single `.update()` jumps several rounds/turns at once (a GM manually reordering combatants, or skipping several defeated combatants in one step). All four already execute GM-gated internally (`if (game.user.isActiveGM)`, inside `#triggerTurnEvents()`'s caller) — no manual `userId`/`game.user.isActiveGM` check needed in the override. This is strictly more precise than a global `Hooks.on('updateCombat', ...)` or a blunt `_onUpdate()` diff of round/turn fields, and it's also more *correct*: an `_onUpdate()` diff only ever sees the update's final round/turn values, so it silently skips every intermediate boundary crossed during a multi-step jump — `_onStartRound`/`_onStartTurn` fire once per boundary regardless.

```typescript
// src/documents/combat/CombatDnd35e.mts
class CombatDnd35e extends foundry.documents.Combat {
  protected override async _onStartRound(context: CombatRoundEventContext): Promise<void> {
    await super._onStartRound(context);
    if (context.round !== 1) return; // only combat's actual first round applies Flat-Footed (Story A)
    for (const combatant of this.combatants) {
      void (combatant.actor as ActorDnd35e | undefined)?.toggleStatusEffect(FLAT_FOOTED_CONDITION_ID, { active: true });
    }
  }

  protected override async _onStartTurn(combatant: Combatant, context: CombatTurnEventContext): Promise<void> {
    await super._onStartTurn(combatant, context);
    const actor = combatant.actor as ActorDnd35e | undefined;
    if (actor) await resetActionEconomy(combatant as CombatantDnd35e, actor);
  }
}
```

Register: `CONFIG.Combat.documentClass = CombatDnd35e`. Since the repo's bundled `.d.mts` doesn't declare the `context` parameter on `_onStartRound`/`_onStartTurn`, implementing this needs a small local type augmentation first (patch `types/foundry/client/documents/combat.d.mts` or add an ambient override) — a Story A prep note, not a separate story.

### Action consumption

The execution engine and the movement integration (§10.6) both consume actions through the module functions above (`spendStandardAction()`, `spendHandBab()`, etc.) rather than raw `.update()` calls — keeps the flag shape encapsulated in one place.

---

## §10.2 Initiative & Combat Tracker

### system.init schema cleanup: drop the `.total` wrapper

`system.init` is currently a `SchemaField` with a single `total` child (`CreatureSystemModel.mts`) purely because it was modeled after saves/AC before anyone needed anything else on it. Since initiative has no other subfields (no separate base/modifiers breakdown stored on the actor — situational bonuses are transient dialog input, not persisted), flatten it to a plain derived number field: `system.init` directly, dropping `.total`. Touches `CreatureSystemModel.mts`/`CreatureSystemData.mts` (schema), `CombatAttributes.vue` (`field-path="system.init.total"` → `"system.init"`), and this section's own `rollInitiative()` below.

### Situational modifier becomes a formula input (retroactive to rollSave)

The D20 roll dialog's situational-modifier field (`D20RollDialogConfig.mts`/`D20RollDialogApp.vue`) is currently a plain `<input type="number">`. Since `rollInitiative()` reuses this same dialog, and initiative situational bonuses (e.g. a feat granting `+2 initiative`) are exactly the kind of thing FormulaFamiliar should express, the dialog is upgraded to accept a formula instead of a raw number — **and this upgrade is retroactive**: `rollSave()` (already shipped, Phase 7) gets it for free since it shares the same dialog component.

Only the **Self** context (the rolling actor) is available for poc.10 — no `#target`/`#item`, since a save/initiative roll has neither. Once attack-triggered saves exist (later phases), those dialogs will extend the context list.

- `D20RollDialogData.situationalModifier` changes from `number` to a formula string (raw, unresolved)
- The dialog isn't a document sheet and doesn't need to fake one — following the same convention as the death-threshold formula setting (`FormulaSettingsGroup.vue` / `resolveDeathThresholdValue()`), it calls `buildDocumentFamiliar(actor)` directly to build the `FamiliarSchema` fed straight into `FamiliarOverlayInput.vue`. No document-sheet store, `buildRowContext()`-style faking, or `registerGlobally: false` trick — those solve a different problem (a full sheet's mask/permission/view-mode-aware editing surface) that this standalone dialog doesn't need
- On roll, the formula resolves via `FormulaData.resolveSource()`/`FormulaResolver.resolveFormula()` against `{ self: actor }` into a literal number before being handed to `buildD20Formula()`
- `D20RollDialogResult.situationalModifier` stays a resolved `number` — only the dialog's *input* becomes formula-capable; the roll formula assembly (`buildD20Formula()`) is unaffected

### Custom rollInitiative()

There is no `getRollData()`/`@attr` bridge in this codebase (a deliberate, permanent design choice — see `docs/migration-plan/post-release/WISHLIST.md`), so `CONFIG.Combat.initiative.formula = '1d20 + @attributes.init.total'` cannot work. Initiative instead gets its own roll method mirroring `Creature.rollSave()`'s pipeline:

```typescript
// Creature.mts (or a Combat-adjacent module)
async rollInitiative(): Promise<void> {
  const total = this.system.init; // already a derived field (system.init, no .total wrapper)
  const roll = await D20RollDialogConfig.roll(/* formula built from total, situational modifiers */);
  await buildInitiativeCard(this, roll); // sibling of buildSaveCard(), see §10.8
  const combatant = game.combat?.getCombatantByActor(this.id);
  await combatant?.update({ initiative: roll.total });
}
```

This bypasses Foundry's built-in formula evaluation entirely — `combatant.update({ initiative })` sets the value directly once the dialog+roll+card pipeline completes.

### Combat tracker action pips

The default `CombatTracker` template is extended to show action state for each combatant row, read from `combatant.actionEconomy` (flags, §10.1) rather than `system.actions`:

- **S** (swords icon) — standard action remaining; greyed when `actionEconomy.actions.standard === false`
- **M** (boot icon) — move action remaining; greyed when `actionEconomy.actions.move === false`
- **m** (smaller icon) — minor action remaining; greyed when `actionEconomy.actions.minor === false`
- **AoO count** — numeric badge showing `actionEconomy.actions.aoo`

Implementation (confirmed — Spike 2, §10.14): Subclass `CombatTracker` cleanly, no DOM-injection fallback needed. `CombatTracker` is a real `HandlebarsApplicationMixin`/ApplicationV2 class (verified against the bundled v14.365 client source) with dedicated per-row and per-part extension points: override `_prepareTurnContext(combat, combatant, index)` (call `super._prepareTurnContext()`, then merge `getActionEconomy(combatant)`'s pip/AoO data onto the returned `turn` object) and override `static PARTS` to point `tracker.template` at a system-owned copy of `templates/sidebar/tabs/combat/tracker.hbs` (core's actual per-row markup, confirmed against the bundled template) with pip markup added, reading the merged `turn.actionEconomy`. Register: `CONFIG.ui.combat = CombatTrackerDnd35e` (`CONFIG.ui.combat: ConstructorOf<CombatTracker>` is a real, documented registration point).

> The "provokes" caution badge (§10.10) is a **separate** UI element on the movement-action HUD selector, not the combat tracker — don't conflate the two.

---

## §10.3 ActionDataModel — First Cut

Actions are **embedded DataModel instances** within an item's system data — not separate Foundry Documents.

> **Weapon-only, by design.** D35E's `attack`/`full-attack` item types are dropped entirely (`docs/migration-plan/release/phase-06-content-migration.md` line 126; `docs/architecture/property-maps/PropertyMap-Metaphysical.md` §"No attack/full-attack item types"). `ActionDataModel` is **only** embeddable on `Weapon.system.actions[]` for poc.10 — it cannot be created as a standalone item or attached to any other item type. This is the direct replacement for D35E's weapon-sheet "create an attack for this weapon" workflow: instead of authoring a separate `attack` item linked back to the weapon, the action lives embedded on the weapon itself (see "Embedding actions in WeaponSystemModel" and §10.4 below). Non-weapon attacks (natural attacks/bite/claw, unarmed strike, grapple) are a **separate, actor-level** concern intentionally out of scope here — tracked in `docs/migration-plan/alpha/phase-05-natural-attacks.md` (natural attacks) and alpha.3's combat-maneuver work (unarmed strike/grapple defaults); `phase-05-natural-attacks.md`'s own `AttackSystemModel` sketch predates the "drop attack item type" decision and should be reconciled to reuse `ActionDataModel` (embedded on the actor or a natural-attack-only item) rather than inventing a parallel attack-item type when that phase is next revised.

### ActionDataModel schema

```typescript
// src/documents/items/physical/weapon/data/ActionDataModel.mts — co-located with Weapon for now;
// promote to a shared location if/when alpha.3+ needs actions on non-weapon items
class ActionDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      id: new foundry.data.fields.StringField({ required: true, blank: false }),
      name: new foundry.data.fields.StringField({ required: true, blank: false }),
      type: new foundry.data.fields.StringField({
        // poc.10: attack only (melee and ranged/thrown both use 'attack', distinguished by the `range` block, §10.9)
        choices: ['attack'],
        initial: 'attack',
      }),
      activation: new foundry.data.fields.StringField({
        // poc.10: standard/move. Manual full attack repeats the same standard action's hand-BAB pool — no new activation value needed.
        choices: ['standard', 'move'],
        initial: 'standard',
      }),
      // No `hand` field, no `defaultSlotId` field — both were considered and dropped. Which BAB pool
      // an attack draws from, and which hand a `requiresEquipped: false` action uses when unequipped,
      // are both determined live at execution time rather than authored per-action (see below).
      requiresEquipped: new foundry.data.fields.BooleanField({ initial: true }),
      // Ranged/thrown actions default true when used while within an enemy's reach — see §10.10.
      provokes: new foundry.data.fields.BooleanField({ initial: false }),
      // Hard cap on simultaneous targets. Every poc.10 action (melee, ranged, thrown) is a single-target
      // weapon attack, so this always defaults to (and stays) 1 — a single attack action only ever
      // targets one creature per SRD. Not yet raised by anything, but exists so a future AOE/spell-style
      // action type (alpha.11+) can opt into more than one without a schema migration.
      maxTargets: new foundry.data.fields.NumberField({ initial: 1, integer: true, min: 1 }),

      // Attack check (used when type === 'attack')
      check: new foundry.data.fields.SchemaField({
        formula: new FormulaField({
          label: 'DND35E.ACTION.checkFormula',
          // Default: "1d20 + #self.attributes.bab.total + #self.abilities.str.mod"
        }),
        against: new foundry.data.fields.StringField({
          choices: ['armorClass', 'touchAc', 'flatFootedAc'],
          initial: 'armorClass',
        }),
      }, { required: false, nullable: true, initial: null }),

      // Damage roll (triggered on hit via chain)
      damage: new foundry.data.fields.SchemaField({
        formula: new FormulaField({
          label: 'DND35E.ACTION.damageFormula',
          // Default filled from weapon's damage die + #self.abilities.str.mod
        }),
        type: new foundry.data.fields.StringField({
          label: 'DND35E.ACTION.damageType',
        }),
        critRange: new foundry.data.fields.NumberField({ initial: 20, integer: true }),
        critMultiplier: new foundry.data.fields.NumberField({ initial: 2, integer: true }),
      }, { required: false, nullable: true, initial: null }),

      // Range/ammo block — present only on ranged/thrown actions, see §10.9
      range: new foundry.data.fields.SchemaField({
        increment: new foundry.data.fields.NumberField({ integer: true }),
        ammoType: new foundry.data.fields.StringField(), // matches an Ammo item's ammoType, or null for self-consuming thrown weapons
      }, { required: false, nullable: true, initial: null }),

      // Execution chain: what to trigger after this action resolves
      chain: new foundry.data.fields.ArrayField(
        new foundry.data.fields.EmbeddedDataField(ActionChainLinkModel)
      ),
    };
  }
}

class ActionChainLinkModel extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      trigger: new foundry.data.fields.StringField({
        choices: ['onSuccess', 'onFailure', 'onCrit', 'onFumble', 'always'],
      }),
      actionId: new foundry.data.fields.StringField(),
      description: new foundry.data.fields.StringField(),
    };
  }
}
```

**Public interface: `executeAction()`.** `ActionDataModel` also declares a public instance method, `executeAction(context: UseActionContext, targetIds: string[]): Promise<ActionResult>` — the *only* entry point the execution engine (`useAction()`, §10.7) calls to run an action; it never invokes attack-specific logic directly. See "ActionDataModel#executeAction()" in §10.7 for the poc.10 implementation, shared unchanged by all four weapon-attack subtypes below — this is also the hook alpha.3+ action types (skill checks, spells, combat maneuvers) are expected to override.

`requiresEquipped` lives on the **action**, not the weapon — a dagger has a melee "Attack" action (`requiresEquipped: true`) and a "Throw" action that may independently be flagged `requiresEquipped: false`, since a thrown dagger can be attacked with straight from a harness/sheath without ever occupying a hand slot.

**No stored `defaultSlotId`.** Which hand an attack action draws from is a **dialog-time choice for every action**, not authored per-action and not gated on `requiresEquipped`: the Attack Roll Dialog (§10.7) always shows a Hand select (Main / Off), pre-filled by auto-detection (the main hand, unless the weapon is already expressly equipped in the off-hand slot, in which case that becomes the default) but always user-overridable — the same "auto-detect, always shown as an override" shape as Wield Mode (§10.7). One additional constraint, enforced in `executeAction()`:
- **A free hand is required to throw a `requiresEquipped: false` action** — the selected hand's equip slot must be empty (or already occupied by the weapon actually being thrown) at the moment of the attack; a hand with a different weapon already equipped can't also throw something.

**Using a `requiresEquipped: false` action never costs an equip action.** That's the entire point of the flag — attacking with it doesn't touch `equippedSlotIds` at all, so there's no equip/unequip event for the existing mid-combat equip-cost listener (`itemEquipped`/`itemUnequipped`, `src/documents/items/physical/equippableItem/events/equipped.mts` → `spendMoveAction()` while `game.combat?.started`, unchanged from today) to react to. That listener still spends a move action for a genuine equip-state change — explicitly equipping/unequipping a weapon via the sheet or HUD mid-combat — it just never fires as a side effect of using a `requiresEquipped: false` action, since using one is not an equip-state change.

### Two-weapon fighting penalty (computed, not stored)

Not a schema field — computed at execution time by inspecting whatever weapon currently occupies the actor's **off-hand** slot, regardless of which hand is actually attacking. Baseline SRD penalty (no feat awareness yet): **-6 primary-hand / -10 off-hand**, reduced to **-4/-8** on **both** hands' attacks when the off-hand's equipped weapon has `weaponSubtype === LIGHT_WEAPON` — a Light main-hand weapon paired with a non-Light off-hand weapon gets *no additional* reduction, matching the SRD rule that only the *off-hand* weapon's lightness matters, not the attacking hand's. Feat-driven refinements (Two-Weapon Fighting, Improved/Greater TWF) land later, once a Feat item type exists to configure them.

### Wield mode & STR bonus scaling (computed, not stored)

Also not a schema field — like the TWF penalty above, a weapon's STR damage contribution depends on *how it's currently wielded*, which can change attack-to-attack as equip slots are swapped mid-combat, so it's derived at execution time rather than baked into the action's stored `damage.formula`. Three wield modes, mirroring D35E's own Attack dialog dropdown:

| Wield mode | STR bonus | Detection |
|---|---|---|
| Primary Hand | Full `#self.abilities.str.mod` | Weapon's `equippedSlotIds` occupies only the main-hand slot (or only the off-hand slot with nothing wielded in the other hand, or is the hand selected in the Attack Roll Dialog for a `requiresEquipped: false` action) |
| Off-Hand | Half, rounded down: `$floor(#self.abilities.str.mod / 2)` | Weapon's `equippedSlotIds` occupies only the off-hand slot **and** a different weapon currently occupies the main-hand slot (a genuine two-weapon-fighting pair) |
| Two-Handed | 1.5×, rounded down: `$floor(#self.abilities.str.mod * 1.5)` | Weapon's `equippedSlotIds` occupies **both** the main-hand and off-hand slots simultaneously |

`detectWieldMode(actor, item)` (`src/documents/actors/baseActor/ActorDnd35e.mts`, called from `ActionDataModel#executeAction()`) computes this fresh from the weapon's **current** `equippedSlotIds` at attack time. This same detection also decides which per-hand BAB pool(s) the attack draws from (§10.1) — there is no separately-stored `hand` field on the action at all: Primary Hand and Off-Hand each map straight to that slot's own pool (`main`/`off`), and Two-Handed (occupying both slots) spends from **both** pools simultaneously via `spendHandBab(combatant, 'both', amount)`, which already supports a `'both'` hand value.

**`$floor`/`$ceiling`/`$round`/`$absolute` — new FormulaFamiliar aliases, evaluated locally whenever possible; `$`-stripped Math-proxy syntax kept only as a fallback.** Foundry's `Roll` grammar does accept arbitrary `name(args)` function-call syntax generically — `parser.mjs`'s `_onFunctionTerm()` records whatever function name was matched, with no allowlist — and resolves the callee at evaluation time via `FunctionTerm.function` (`client/dice/terms/function.mjs`): `CONFIG.Dice.functions[this.fn] ?? Math[this.fn]`. So bare `floor(x)`/`ceil(x)`/`round(x)`/`abs(x)` genuinely work today, confirmed against the bundled v14.365 client source (not the possibly-stale `.d.mts`). But this exact class was previously named `MathTerm` and later renamed to `FunctionTerm` — `Roll.fromData()` still remaps a serialized `class: "MathTerm"` to `"FunctionTerm"` for backwards compatibility — real precedent for Foundry reshuffling this mechanism release to release. Leaning on it as the *only* evaluation path is a bet on API stability this system doesn't need to make.

So these four aliases evaluate their own argument locally whenever they safely can, and only fall back to emitting Foundry's Math-proxy call when they truly can't:

- Resolve the inner argument the same way as before (`#self.x` tokens become literals; dice-term syntax like `1d6` passes through unresolved, since it can't be evaluated without actually rolling)
- If the resolved argument is already a plain finite number — no dice-term syntax left in it — compute the result immediately with plain JS (`Math.floor`/`Math.ceil`/`Math.round`/`Math.abs`) and emit that literal number, exactly like `$fromFeet`/`$fromKg` already do. This is the path every current use in this doc takes: `#self.abilities.str.mod` always resolves to a plain number, so `$floor(#self.abilities.str.mod / 2)` resolves straight to a literal (e.g. `1`) and never touches Foundry's Math proxy at all
- Only when the resolved argument still contains real dice-term syntax that can't be evaluated without rolling (e.g. `$ceiling(1d6 / 2)`) does it fall back to re-emitting the bare, `$`-stripped call (`ceil(1d6 / 2)`) for Foundry's `Roll`/`FunctionTerm` to evaluate once the dice exist — the same mechanism above, now demoted to a hedge for the one case that genuinely can't be precomputed, not the primary path
- `$ceiling` strips to `ceil` and `$absolute` strips to `abs` (Foundry's actual `Math.ceil`/`Math.abs` method names); `$floor`/`$round` pass straight through unchanged since those names already match
- New `FunctionName` entries (`floor`, `ceiling`, `round`, `absolute`), single-argument, same tier/file as the existing array and unit-conversion functions
- Only meaningful for `string`-typed `FormulaField`s destined for a `Roll` (`check.formula`/`damage.formula`) — the system's own hand-rolled `evaluateBooleanExpression()` grammar (used for `boolean`-typed formula fields) has no function-call syntax at all, so a `$floor`/`$ceiling`/`$round`/`$absolute` inside a boolean-typed field would strip down to a bare `floor(...)`/`abs(...)` call that grammar can't parse — not a concern for STR scaling (a `string`-typed damage formula), but worth flagging as a boundary if these aliases get reused elsewhere later

`getWieldModeStrTerm(wieldMode)` builds the appropriate fragment (` + #self.abilities.str.mod`, ` + $floor(#self.abilities.str.mod / 2)`, or ` + $floor(#self.abilities.str.mod * 1.5)`) and is appended to the resolved damage formula the same way the TWF penalty and `damageBonus` are already appended — see `ActionDataModel#executeAction()` in §10.7. Because the STR term is always computed fresh from the current wield mode, the seeded `damage.formula` (§10.4) never bakes a flat STR mod into the stored weapon action.

### Actions are real, stored, system-managed entries — `WeaponSystemModel.actions`

Default actions are **not** computed fresh every prep cycle and never baked into a `getContributedActorChanges()` value literal — an earlier draft of this section explored that and was reverted. Instead `WeaponSystemModel.actions` is a genuine `ArrayField` of `TypedSchemaField`-discriminated `ActionDataModel` subtypes, seeded automatically and kept in sync with the weapon's classification fields, mirroring the existing `isMasterwork`/`syncMasterworkAeState()` pattern (`src/documents/activeEffects/material/logic/masterworkAe.mts`) that already does exactly this shape of "derived boolean + auto-create/auto-delete a real child entity" for Masterwork material.

**Melee vs. Ranged is driven by `weaponSubtype`, not `rangeIncrement`.** `weaponSubtype` (`WEAPON_SUBTYPES`, `src/documents/items/physical/weapon/data/constants.mts`) gains a new `twoHandedRanged` value alongside the existing `unarmed`/`light`/`oneHanded`/`twoHanded`/`ranged` — a deliberate non-RAW addition purely to distinguish weapons that require both hands to use at range (longbow, heavy crossbow) from one-handed ranged weapons (hand crossbow, sling). `weaponSubtype === 'ranged' || weaponSubtype === 'twoHandedRanged'` ⇒ the weapon auto-creates/keeps a `RangedWeaponAttack` and deletes any system-created `MeleeWeaponAttack`; any other `weaponSubtype` value ⇒ auto-creates/keeps a `MeleeWeaponAttack` and deletes any system-created `RangedWeaponAttack`. This is a straight either/or swap, not a "weapon has both" scenario.

**Thrown is an orthogonal weapon detail, not a category.** The existing `WEAPON_PROPERTY_THROWN` checkbox (§10.4's Weapon Property flags) independently auto-creates/deletes a `ThrownWeaponAttack` **regardless of `weaponSubtype`** — a melee-subtype weapon with `thrown` checked is a dagger (melee weapon, secondary thrown attack); a ranged-subtype weapon with `thrown` checked is the rare "thrown at range" edge case (a boomerang-style weapon). Both combinations are valid and independent of the Melee/Ranged auto-swap above.

**Auto-create/auto-delete mechanics** (new module, sibling of `masterworkAe.mts`: `src/documents/items/physical/weapon/logic/weaponActionSync.mts`):

- Every `ActionDataModel` entry carries `systemCreated: boolean` (initial `true` on auto-created entries). The moment a user edits any field on a system-created entry, it flips to `false` and becomes permanent — never auto-deleted, never auto-merged (see §10.4), mirroring how a custom Masterwork AE is never deleted, only disabled.
- Switching `weaponSubtype` between the ranged-group and everything else: create the now-applicable subtype's entry if none exists; delete the now-inapplicable subtype's entry **only if `systemCreated === true`** (a user-edited one is left in place, orphaned but intact, same as a custom Masterwork AE surviving `isMasterwork` toggling off).
- Toggling `WEAPON_PROPERTY_THROWN` on: create a `ThrownWeaponAttack` if none exists. Toggling it off: delete the `ThrownWeaponAttack` only if `systemCreated === true`.
- This sync runs from the same lifecycle point `syncMasterworkAeState()` does today (an item update hook reacting to the relevant field's change), not from `prepareDerivedData()` — it performs real array-mutating updates, which prep-time derivation must never do.

**No Actor-Proxy-style dispatch needed.** `ActorProxyDnd35e`'s `Proxy`/`construct` trap exists because `Actor`/`Item` are full `foundry.abstract.Document` subclasses registered via `CONFIG.dnd35e.actor.documentClasses` — Foundry's core constructor has no built-in way to pick a system-specific subclass per `type`, hence the manual trick. `ActionDataModel` subtypes are not separate embedded Documents (no independent collection, no `system.json` type registration) — they're entries in a `TypedSchemaField`, which **already** dispatches to the correct `DataModel` subclass per entry based on its own `type` key, natively, the same way Foundry core's own `Region.shapes: ArrayField<TypedSchemaField<typeof BaseShapeData.TYPES>>` gives every shape entry (`rectangle`/`circle`/`polygon`/`ellipse`) its own subclass with type-specific behavior. `TypedSchemaField({ melee: MeleeWeaponAttack, ranged: RangedWeaponAttack, thrown: ThrownWeaponAttack })` is sufficient on its own for poc.10's three system-managed subtypes — no proxy layer required. (`custom: CustomWeaponAction` is deferred to alpha.3 — see Scope boundaries above.)

**Scope for poc.10.** Only `Weapon` gets a native `actions` collection with `*WeaponAttack` subtypes. The general "any item/actor can grant actions" architecture (already sketched, unimplemented, in `PropertyMap-Physical.md`'s `ConsumableSystemModel.actionSnapshot`) arrives later via the Enhancements system, which will deliver actions through AE contributions rather than giving every item type its own native `actions` collection — a different mechanism, out of scope here. `*WeaponAttack` subtypes remain weapon-exclusive by design.

### Actions tab on the weapon sheet — system-managed actions only to start

`WeaponSystemModel.actions` holds the auto-managed `MeleeWeaponAttack`/`RangedWeaponAttack`/`ThrownWeaponAttack` entries for poc.10 — each a normal editable row, distinguished only by a small badge/icon while `systemCreated === true` (informational — editing it is exactly how it becomes permanent). Follows the existing `FormGroupSection`/`FormGroup` patterns for field permissions and view-mode awareness. No custom-action authoring this phase (`CustomWeaponAction`, alpha.3).

### FormulaFamiliar contexts

The `check.formula` and `damage.formula` fields declare the following FormulaFamiliar contexts:

```typescript
const actionFormulaContexts: FormulaContext[] = [
  {
    contextName: 'Actor',
    resolvePath: 'parent.parent',   // ActionDataModel → Item → Actor
    documentType: 'Actor',
    aliases: ['self'],
    // Exposes: #self.abilities.str.mod, #self.attributes.bab.total, etc.
  },
  {
    contextName: 'Item',
    resolvePath: 'parent',
    documentType: 'Item',
    aliases: ['item', 'weapon'],
    // Exposes: #item.enhancement, #item.damage, etc.
  },
  {
    contextName: 'Target',
    resolvePath: 'runtime',         // Resolved at execution time
    documentType: 'Actor',
    aliases: [],
    // Exposes: #target.defense.armorClass, #target.defense.touchAC, etc.
  },
];
```

### Embedding actions in WeaponSystemModel

```typescript
// In WeaponSystemModel.defineSchema()
actions: new foundry.data.fields.ArrayField(
  new foundry.data.fields.TypedSchemaField({
    melee: MeleeWeaponAttack,
    ranged: RangedWeaponAttack,
    thrown: ThrownWeaponAttack,
  }),
  { label: 'DND35E.ITEM.actions' }
),
```

`TypedSchemaField` is a real, already-used-by-core primitive (`Region.shapes: ArrayField<TypedSchemaField<typeof BaseShapeData.TYPES>>`, `types/foundry/common/documents/region.d.mts`) — a discriminated union where each entry's own `type` key selects which subtype schema validates/casts it, auto-inserting the `type` field itself. Changing an existing entry's `type` after creation requires `ForcedReplacement`; the sync logic in §10.3 never needs this since it always deletes-and-recreates rather than mutating `type` in place.

---

## §10.4 Weapon Actions — Seeding, Sync, and Live Merge

### Seeding & sync are real mutations, not prep-cycle derivation

Unlike an earlier reverted draft ("computed fresh every prep cycle, never stored"), `MeleeWeaponAttack`/`RangedWeaponAttack`/`ThrownWeaponAttack` entries are real, persisted `actions` array entries — auto-created/auto-deleted by `weaponActionSync.mts` (§10.3) in response to `weaponSubtype`/`properties` changes, not rebuilt on every `prepareDerivedData()` pass. This runs from an item-update hook (the same lifecycle point `syncMasterworkAeState()` reacts from today), since it performs a genuine array mutation — prep-time derivation must stay read-only.

A freshly auto-created entry seeds only what's structurally required to exist as a valid, visible row: `type`, `systemCreated: true`, a name-formula default (`#item.name (Melee)` / `#item.name (Thrown - #item.weaponDamage.rangeIncrement)`), `activation: 'standard'`, `requiresEquipped: true`. It does **not** snapshot `damageRoll`/`critRange`/etc. as literal values — those stay live-merged every prep cycle (below), the same anti-staleness goal the earlier "computed, never stored" draft was chasing, just achieved by merging onto a real stored entry instead of never storing one at all.

### Live merge happens during `applyActiveEffects`, via `getContributedActorChanges()` — not a separate collection-time step

`Weapon.getContributedActorChanges()` (the same no-backing-document contribution channel `EquippableItem`/`PhysicalItem` already use for equipped-status/carried-weight) stays the single mechanism for layering the weapon's live shared data onto its own stored actions, rather than introducing a second, parallel "merge at collection time" step. Reasoning: `system.attacks.actions` can be targeted by real AEs too (a future Keen/enhancement AE changing `critRange`/`damageType` on a specific action) — running the weapon's own contribution through the *same* stacking pipeline (`applyStackedActiveEffectChanges`) as any other AE-sourced change means both sources resolve through one consistent bonus-type-stacking pass, with `effectOverrides` history recorded for both, rather than a bespoke merge-order-dependent step that has to know how to interact with the stacking engine's results after the fact.

Concretely: the actor's prep step first does a **structural collection pass** — walk each weapon's `system.actions` entries and seed one corresponding stub per entry onto `system.attacks.actions` (`{ id, itemUuid, type, systemCreated }`, sourced 1:1 from the stored entry's own `_id`/`type`/`systemCreated`, nothing else). Then `Weapon.getContributedActorChanges()` contributes the live-computed fields (`check.formula`, `damage.formula`, `damage.critRange`, etc.) as targeted changes keyed to that specific action's path (`system.attacks.actions.<id>.damage.formula`, etc.), which flow through normal OVERRIDE-mode stacking resolution alongside anything else targeting that same path. **The merge only applies while `systemCreated === true`** — the moment a user edits the entry (flipping `systemCreated` to `false`), it exits the merge entirely and becomes fully author-owned from then on — never auto-overwritten again, matching the "editing it is how it becomes permanent" semantics from §10.3:

```typescript
// Weapon.mts — src/documents/items/physical/weapon/Weapon.mts
override getContributedActorChanges(phase: string): EffectChangeDataDnd35e[] {
  const changes = super.getContributedActorChanges(phase);
  if (phase !== FINAL_EFFECT_CHANGE_PHASE) return changes;

  const { damageRoll, damageType, critRange, critMultiplier, rangeIncrement, attackFormula, damageFormula, autoScaleDamage } = this.system.weaponDamage;
  const attackBonusTerm = attackFormula ? ` + ${attackFormula}` : '';
  const damageBonusTerm = damageFormula ? ` + ${damageFormula}` : '';
  const attackAbility = this.system.properties.has(WEAPON_PROPERTY_FINESSE) ? 'dex' : 'str';
  const damageRollTerm = autoScaleDamage
    ? scaleDamageDie(damageRoll || '1d4', this.system.designedForSize)
    : (damageRoll || '1d4');

  const actionChanges: EffectChangeDataDnd35e[] = [];
  // Only system-created, still-unedited entries get the live merge — a user-edited entry
  // has already detached itself (systemCreated flipped to false) and is read verbatim below.
  for (const action of this.system.actions.filter((a) => a.systemCreated)) {
    const base = `system.attacks.actions.${action._id}`;
    const isRangedOrThrown = action.type === 'ranged' || action.type === 'thrown';
    actionChanges.push(
      {
        key: `${base}.check.formula`,
        target: EFFECT_CHANGE_TARGET.ACTOR,
        type: SYSTEM_CHANGE_TYPE.OVERRIDE,
        phase,
        value: `1d20 + #self.attributes.bab.total + #self.abilities.${isRangedOrThrown ? 'dex' : attackAbility}.mod${attackBonusTerm}`,
      },
      {
        key: `${base}.damage.formula`,
        target: EFFECT_CHANGE_TARGET.ACTOR,
        type: SYSTEM_CHANGE_TYPE.OVERRIDE,
        phase,
        value: `${damageRollTerm}${damageBonusTerm}`,
      },
      {
        key: `${base}.damage.type`,
        target: EFFECT_CHANGE_TARGET.ACTOR,
        type: SYSTEM_CHANGE_TYPE.OVERRIDE,
        phase,
        value: damageType || 'bludgeoning',
      },
      {
        key: `${base}.damage.critRange`,
        target: EFFECT_CHANGE_TARGET.ACTOR,
        type: SYSTEM_CHANGE_TYPE.OVERRIDE,
        phase,
        value: critRange,
      },
      {
        key: `${base}.damage.critMultiplier`,
        target: EFFECT_CHANGE_TARGET.ACTOR,
        type: SYSTEM_CHANGE_TYPE.OVERRIDE,
        phase,
        value: critMultiplier || 2,
      },
    );
    if (isRangedOrThrown) {
      actionChanges.push({
        key: `${base}.range.increment`,
        target: EFFECT_CHANGE_TARGET.ACTOR,
        type: SYSTEM_CHANGE_TYPE.OVERRIDE,
        phase,
        value: rangeIncrement,
      });
    }
  }

  return [...changes, ...actionChanges];
}
```

`chain`/`activation`/`requiresEquipped`/`provokes` are **not** contributed here — those are authored, real fields living directly on the stored `ActionDataModel` entry (system-created entries seed sane defaults once at creation, per §10.4's seeding note above; editing any of them flips `systemCreated` to `false` just like editing a mechanical field would).

Any system-created entry that's already detached via a user edit is **not** looped over above — `system.attacks.actions.<id>` reads straight from `this.system.actions` verbatim for it, with no contributed-change layer at all (its own formula fields already reference the weapon's live data via FormulaFamiliar, e.g. `#item.weaponDamage.damageRoll`, so there's nothing mechanical left to merge).

> `chain` is read, not decorative — poc.10 only ever honors the **first** matching link (`chain[0]` whose `trigger` matches the outcome, e.g. `onSuccess`). `actionId: 'damage'` is a **sentinel**, not a real cross-action lookup: it tells the execution engine "resolve this same action's own embedded `.damage` block," since no second action is ever created for it to reference. Multi-link chains, non-`damage` sentinel values, and real ID-based hops to a different action are unsupported this phase — that's the alpha.3 upgrade this field is future-proofed for.

### Weapon Property flags (`system.properties`)

The legacy weapon sheet's "Weapon Properties" checkboxes (`dnd35e.WEAPON.Property.*` localization keys already exist in `src/lang/en/weapons.json`) have no schema field on `WeaponSystemModel` at all today. Rather than leave this as an unwired cleanup item, poc.10 adds the field and wires up the five properties its own mechanics actually touch — everything else on that checklist (`blocking`, `brace`, `double`, `disarm`, `fragile`, `grapple`, `improvised`, `monk`, `performance`, `sunder`, `trip`) is either purely descriptive or gates a combat-maneuver action, so it's deferred to alpha.3 (§18.7 Combat Maneuvers already covers Disarm/Sunder/Trip/Grapple) rather than parked in the poc.11 cleanup phase — poc.11 is for debt discovered *during* POC work, not pre-planned future scope.

```typescript
// src/constants/weapons/weaponProperties.mts
const WEAPON_PROPERTY_FINESSE = 'finesse' as const;
const WEAPON_PROPERTY_REACH = 'reach' as const;
// Spiked chain (SRD) and homebrew weapons emulating it: still doubles SIZE_REACH like any other
// reach weapon, but also threatens adjacent squares instead of leaving the usual dead zone (below).
// Only meaningful in combination with WEAPON_PROPERTY_REACH — a no-op on a non-reach weapon.
const WEAPON_PROPERTY_THREATENS_ADJACENT = 'threatensAdjacent' as const;
const WEAPON_PROPERTY_THROWN = 'thrown' as const;
const WEAPON_PROPERTY_NON_LETHAL = 'nonLethal' as const;
const WEAPON_PROPERTY_NON_LETHAL_NO_PENALTY = 'nonLethalNoPenalty' as const;

// alpha.3 extends this array with the remaining 11 `dnd35e.WEAPON.Property.*` keys once
// combat maneuvers need them — the SetField below just widens its `choices` at that point.
const WEAPON_PROPERTIES = [
  WEAPON_PROPERTY_FINESSE,
  WEAPON_PROPERTY_REACH,
  WEAPON_PROPERTY_THREATENS_ADJACENT,
  WEAPON_PROPERTY_THROWN,
  WEAPON_PROPERTY_NON_LETHAL,
  WEAPON_PROPERTY_NON_LETHAL_NO_PENALTY,
];
type WeaponProperty = (typeof WEAPON_PROPERTIES)[number];
```

`WeaponSystemModel` gets `properties: new foundry.data.fields.SetField(new foundry.data.fields.StringField({ choices: WEAPON_PROPERTIES }))`, exposed on the weapon sheet as a plain checkbox list (label per property from `dnd35e.WEAPON.Property.<key>`). `item.system.properties` is a JS `Set<WeaponProperty>`, so `.has(WEAPON_PROPERTY_FINESSE)` etc. is how every mechanic below reads it.

**`finesse`** — read live every time `getContributedActorChanges()` builds the default melee action's `check.formula` ability term (`#self.abilities.dex.mod` instead of `#self.abilities.str.mod` when the property is set), the same way `damageType`/`critRange` are read live from `weaponDamage` above. Damage still uses STR (finesse only changes the attack-roll ability, never damage) and there's still no Feat-gating (Weapon Finesse doesn't exist as a real prerequisite check until a Feat item type exists) — same simplification already accepted for TWF feat refinements above. Because the default action is rebuilt fresh every prep cycle rather than seeded once, toggling `finesse` (or `damageType`, or anything else in `weaponDamage`) takes effect on the very next attack — no stale-formula gap to work around.

**`reach`** — read live in `executeAction()` (§10.7): when the acting weapon has this property, the attacker's `SIZE_REACH` entry is doubled for that attack's reach check, matching the SRD reach-weapon table's Medium-creature case (5 ft → 10 ft). **Matches SRD's adjacent-foe exclusion too**: a reach weapon can't be used against an adjacent foe, so `executeAction()` also rejects a target at the attacker's un-doubled `SIZE_REACH` distance — a "dead zone" at ordinary melee range, not just a floor-less "anything up to double reach" check.

**`threatensAdjacent`** — the SRD's spiked chain is the sole reach weapon exempt from that dead zone ("unlike most other weapons with reach, you can use a spiked chain to make attacks against adjacent foes"). Rather than hardcode a spiked-chain special case, this is a standalone weapon-property checkbox: any weapon with both `reach` and `threatensAdjacent` skips the adjacent-foe rejection entirely, so a homebrew weapon can emulate the spiked chain just by checking both boxes. It's a no-op without `reach` also set — there's no adjacent-foe dead zone to exempt from on an ordinary weapon. This doesn't model the SRD's "tall" vs. "long" creature reach-table split (`SIZE_REACH` itself doesn't track that distinction — same simplification boundary, not a new one).

**`nonLethal` / `nonLethalNoPenalty`** — per SRD nonlethal-damage rules: a weapon that normally deals nonlethal damage (a sap, etc.) can be used for lethal damage instead, and a normally-lethal weapon can be used to deal nonlethal damage instead, but switching either direction costs a −4 attack penalty unless the weapon is specifically exempt. `nonLethal` marks the weapon's *natural* damage type as nonlethal (pre-checks the Attack Roll Dialog's Non-lethal toggle — see §10.7's Attack Type table); `nonLethalNoPenalty` waives the −4 switch penalty for this weapon regardless of which direction the toggle ends up in. The dialog's Non-lethal toggle itself is unchanged (still a manual, user-overridable checkbox) — only its pre-checked default and the penalty math behind it become weapon-aware, computed in `executeAction()` the same way the two-weapon-fighting penalty already is (see below).

> **Deliberate deviation from D35E**: D35E's actual implementation (`module/item/extensions/use.js`) only penalizes switching *into* nonlethal (`nonLethal && nonLethal !== itemNonLethal`) — a naturally-nonlethal weapon (sap) dealing lethal damage costs nothing in D35E, which is a one-directional simplification of the RAW rule. dnd35e goes full RAW here: the penalty is symmetric (`isNonLethal !== weaponNonLethalDefault`), still waived by `nonLethalNoPenalty`. Don't "fix" this to match D35E — the asymmetry there is the bug, not a spec to replicate.

**`thrown`** — checking this box auto-creates a `ThrownWeaponAttack` entry (§10.3's sync mechanism), independent of `weaponSubtype`; unchecking it deletes that entry if still `systemCreated`. It also gates whether the wield-mode STR term (`getWieldModeStrTerm()`) is appended to the thrown action's damage formula in `executeAction()`. Per SRD, STR-to-damage only applies to weapons thrown by hand (daggers, javelins, handaxes), not true ranged weapons (bows, crossbows) — composite-bow STR ratings are a separate, unmodeled mechanic. Concretely: melee actions always get the STR term; a `ThrownWeaponAttack` always gets it (that's what makes it "thrown" rather than "ranged"); a `RangedWeaponAttack` never does.

**Generic ad hoc "Throw" HUD action.** Per SRD, any weapon (or improvised item) can be thrown even if it wasn't designed for it, at a flat −4 attack penalty, 10-foot range increment, and threatening a critical only on a natural 20 (×2 damage) regardless of the weapon's own crit range/multiplier. Rather than modeling this as another stored `ActionDataModel` entry, poc.10 adds a single always-available Token HUD / Actions-tab "Throw" action that throws whatever's currently held in a free (or freeable) hand, applying that ad hoc math directly in `executeAction()` — no `properties.has(WEAPON_PROPERTY_THROWN)` entry required. Once a weapon *does* have a real `ThrownWeaponAttack` (property checked), that's used instead for that weapon specifically (no −4 penalty, the weapon's own range increment/crit range/multiplier) — the generic Throw action remains the fallback for anything else being thrown.

The legacy sheet's Weapon Damage Alignment checkboxes (Good/Evil/Chaotic/Lawful, for DR bypass) are likewise **not** part of `ActionDataModel` or `system.properties` — that's resolved as an enhancement-AE concern (`docs/architecture/property-maps/PropertyMap-ActiveEffects.md`: "Weapon alignment = enhancement AE with conditional damage + DR bypass changes"), not a weapon-schema or action field.

### Threat range (`weaponDamage.critRange`) becomes a number, not a range string

`critRange` changes from a `StringField` (`'20'`, `'19-20'`, ...) to a plain `NumberField` (`integer: true`, `min: 2`, `max: 20`, `initial: 20`) representing only the **low end** of the threat range — natural 20 always threatens, so there's nothing to store for the high end. This removes any `Number(critRange.split('-')[0]) || 20` string-parsing entirely — `getContributedActorChanges()` (§10.4 above) and `ActionDataModel.damage.critRange` (already a `NumberField`, unchanged) both assign the number straight through.

**Display convention — matches SRD equipment-table notation** (e.g. how a longsword's "19-20/×2" is written):

| `critRange` value | Displayed as |
|---|---|
| `20` (default) | `20` |
| `19` | `19 / 20` |
| `< 19` (e.g. `17`) | `17-20` |

A small `formatThreatRange(critRange: number): string` helper implements this table — used wherever a threat range renders as text (weapon sheet read-only display, Actions tab action row).

**Keen becomes a pure AE — no bespoke "isKeen"/"threatRangeExtended" flag anywhere.** Per design decision, Keen (and Improved Critical, and any future threat-range-widening effect) is *just* an Active Effect that changes `system.weaponDamage.critRange`. The SRD's "doubles the threat range" doubles the *count* of threatening values, not a flat subtraction, so the AE's change value is a formula (not a flat number) — confirmed against D35E's own doubling math (`module/actor/entity.js`: `21 - 2*(21-baseCrit)`), applied with `OVERRIDE` mode using the formula `21 - 2 * (21 - #self.weaponDamage.critRange)`. A weapon with `critRange: 20` (threatens on 20 only) becomes `19` (19-20); a weapon already at `critRange: 19` (rapier/scimitar) becomes `17` (17-20). This is still a **beta.8** deliverable (the enhancement/AE-authoring system doesn't exist until then) — poc.10's job is only to make sure `executeAction()` reads the **live, AE-processed** `item.system.weaponDamage.critRange` at attack time, so Keen works automatically the day it lands in beta.8 with zero further poc.10 code changes. Because the default action is now rebuilt every prep cycle by `getContributedActorChanges()` (§10.4 above) rather than seeded once, `action.damage.critRange` is *already* refreshed with the live, AE-processed value on every cycle — `executeAction()` reading `item.system.weaponDamage.critRange` directly instead of trusting that snapshot is a defensive/explicit choice, not a workaround for staleness the way it was under the old `_onCreate()` design.

`D20Roll.isCriticalThreat` (`src/dice/D20Roll.mts`, shipped in Phase 7) changes from a no-arg getter hardcoded to natural-20 (`r.result === die.faces`) to a method accepting an optional threshold: `isCriticalThreat(threshold: number = 20): boolean`, testing `r.result >= threshold`. The default preserves today's behavior for saves/ability checks (which have no threat range); `executeAction()` is the only caller that passes a non-default value, reading it from the weapon's live `critRange`.

### Weapon damage scaling by size (`designedForSize`)

`designedForSize` already exists on `EquippableItemSystemModel` (`src/documents/items/physical/equippableItem/data/EquippableItemSystemModel.mts`, default `'medium'`), inherited by `WeaponSystemModel` — no schema change needed for the field itself. What's new is making it actually drive damage:

- **The entered `weaponDamage.damageRoll` is always the Medium-creature baseline.** A weapon's damage die as typed on the sheet (`1d8` for a longsword, etc.) represents what that weapon deals when sized for a Medium wielder — exactly the convention the SRD's own equipment tables use.
- **New field**: `weaponDamage.autoScaleDamage` (`BooleanField`, `initial: true`). Label/hint text makes the Medium-baseline convention explicit, e.g. *"Damage above is for a Medium-sized weapon. Automatically scale for this weapon's Designed For Size."* Unchecking it freezes the entered damage roll regardless of `designedForSize` — an escape hatch for homebrew weapons that don't follow the standard size-damage progression.
- **`Weapon._preCreate()` (new)**: when the weapon is created directly embedded on an Actor (`this.parent instanceof Actor` — the case that fires when a weapon is dragged from a compendium onto a character) and the creating data didn't already explicitly set a size, default `designedForSize` to the actor's own `system.size` (`src/documents/actors/baseActor/data/ActorSystemModel.mts`). A Small character's dragged-on shortsword defaults to `designedForSize: 'small'` instead of sitting at the schema's generic `'medium'` default; an author-authored compendium item that already specifies a size (e.g. a purpose-built "Large Longsword") is left alone.

```typescript
// Weapon.mts — new, alongside the existing getContributedActorChanges() override (§10.4)
protected override async _preCreate(data: object, options: object, user: User): Promise<void> {
  await super._preCreate(data, options, user);
  if (this.parent instanceof ActorDnd35e && !foundry.utils.hasProperty(data, 'system.designedForSize')) {
    this.updateSource({ 'system.designedForSize': this.parent.system.size });
  }
}
```

**Size-based damage scaling is a plain TypeScript helper, not a FormulaFamiliar function.** `scaleDamageDie(dieFormula: string, size: Size): string` (`src/documents/items/physical/weapon/logic/weaponDamageScaling.mts`, sibling of `weaponActionSync.mts`) is a plain function, not a `$`-prefixed FormulaFamiliar alias — the size→die step table it implements has nothing to do with formula resolution or `Roll` grammar, so there's no reason to route it through FormulaFamiliar at all. It mirrors D35E's own `sizeRoll()` helper (`module/actor/entity.js`) — **the exact table is transcribed from that source as its own implementation task, not reproduced from memory in this doc** (same "verify against source, don't assume" standard applied everywhere else in this phase).

`Weapon.getContributedActorChanges()`'s built `damage.formula` (§10.4) calls `scaleDamageDie()` directly, in plain TypeScript, when `autoScaleDamage` is checked: `` `${autoScaleDamage ? scaleDamageDie(damageRoll || '1d4', this.system.designedForSize) : (damageRoll || '1d4')}${damageBonusTerm}` ``. Because `getContributedActorChanges()` itself reruns every prep cycle, `designedForSize`/`damageRoll` are read live at that point and the already-scaled literal die string (e.g. `"2d6"`) is what lands in the contributed `damage.formula` change directly — there's no separate formula-resolution-time step for this part, and no `$sizeScale(...)` marker to strip or translate.

---

## §10.5 SIZE_REACH & Target Validation

### Constant

```typescript
// src/constants/sizes.mts — alongside SIZE_TOKEN_DIMENSIONS
export const SIZE_REACH: Record<Size, number> = {
  fine:       0,   // no reach, can't threaten
  diminutive: 0,
  tiny:       0,
  small:      1,
  medium:     1,
  large:      2,
  huge:       3,
  gargantuan: 3,
  colossal:   4,
};
```

Values are in **grid squares** — the system's canonical storage unit for every distance-bearing field (`speed.*`, `senses[].distance`, `rangeIncrement`, etc.; 1 square = 5 ft = 1.5 m, per phase 07 §7.2d's `$fromFeet`/`$fromMeters` architecture change), not feet. Based on D&D 3.5e SRD Table 8-4 (5 ft reach = 1 square for Small/Medium, 10 ft = 2 squares for Large, etc.).

### Target validation

Before executing an attack action, the execution engine validates that the target is within reach. `canvas.grid.measurePath().distance` is expressed in the **scene's** configured grid distance units (ft or m, per `grid.distance` — see `registerScenes()`), not squares, so `reachSquares` is converted the same way `TokenRulerDnd35e#getLocalizedBudget()` already converts a stored square count for comparison against Foundry's own measurement:

```typescript
function isWithinReach(attacker: TokenDnd35e, target: TokenDnd35e, reachSquares: number): boolean {
  const { measurement: { convertToLocalizedDistance } } = useSettingsStore();
  const distance = canvas.grid.measurePath([attacker.center, target.center]).distance;
  return distance <= convertToLocalizedDistance(reachSquares);
}
```

---

## §10.6 Movement Integration & Provoking Actions

No new Token hooks. This folds into the **existing** `TokenDocumentDnd35e._onUpdateMovement()` (already shipped in poc.9) and the **existing** `getMovementBudget()`/`isOverBudget()` machinery (`movementBudget.mts`) — there is no distance math left to reinvent.

### Action-economy consumption

```typescript
// TokenDocumentDnd35e._onUpdateMovement() — appended alongside the existing Prone-toggle logic
const combat = game.combat;
if (combat?.started) {
  const combatant = combat.getCombatantByToken(this.id) as CombatantDnd35e | undefined;
  const actor = this.actor as ActorDnd35e | null;
  if (combatant && actor) {
    const budget = getMovementBudget(actor, movementAction);
    const cost = /* sum of movement.passed.waypoints costs, in feet */;
    if (movementAction === CHARGE_MOVEMENT_ACTION) {
      // Charge always spends the full turn, regardless of how far the token actually moved —
      // unlike walk/run's budget-tiered spend below, there's no partial/over-budget branch here.
      await spendMoveAction(combatant);
      await spendStandardAction(combatant);
      await buildMoveActionCard(combatant, actor, { spent: ['move', 'standard'], cost, budget, overBudget: false });
      // Only auto-links to the next attack when the charge actually reaches melee range of a hostile
      // token — no warning/blocking otherwise (§10.6's "Charge" subsection); a charge that comes up
      // short just behaves like an ordinary (costly) move.
      const reachedTarget = canvas.tokens?.placeables.some(t =>
        t.actor && t.document.disposition !== this.disposition && isWithinReach(this.object as TokenDnd35e, t, SIZE_REACH[actor.system.details.size as Size] ?? 1),
      );
      if (reachedTarget) await markChargedThisTurn(combatant);
    } else if (cost > 0 && cost <= budget) {
      await spendMoveAction(combatant);
      await buildMoveActionCard(combatant, actor, { spent: ['move'], cost, budget, overBudget: false });
    } else if (cost > budget && cost <= budget * 2) {
      await spendMoveAction(combatant);
      await spendStandardAction(combatant);
      await buildMoveActionCard(combatant, actor, { spent: ['move', 'standard'], cost, budget, overBudget: false });
    } else if (cost > budget * 2) {
      await buildMoveActionCard(combatant, actor, { spent: [], cost, budget, overBudget: true });
    }
  }
}
```

### Move Action Spent chat card (undoable)

Every action-economy consumption from movement now posts a small chat card instead of silently updating flags — the GM/player gets a visible, permanent log entry, and a way to back out of it:

- `buildMoveActionCard()` (sibling of `buildAttackCard()`/`buildResolutionCard()`, `src/dice/rollMessages.mts`) posts a compact message: combatant name, movement action used, feet moved, and which action(s) were consumed (Move, or Move + Standard)
- Stores `message.flags.dnd35e.moveActionCard = { combatantId, spent: ('move' | 'standard')[], cost, budget, overBudget: boolean, priorPosition: { x, y, elevation } | null, undone: false }` — `priorPosition` is read straight off `movement.passed.waypoints[0]` (the first waypoint of the passed path is always the pre-move origin, already available in this hook — no new pre-update hook needed) and stored only when something was actually spent (`null` in the `overBudget` branch, where the token never actually committed the move)
- When `overBudget` is true (moved further than two move actions' worth), the card renders a warning banner ("Moved further than allowed for a single action") **in addition to** the existing `ui.notifications.warn` toast — the toast is easy to miss mid-session; the chat card is a permanent log entry. Nothing is consumed in this branch, so there's nothing to refund and no Undo button
- An **Undo** button (`data-action="undo-move-action"`), visible/enabled only for the GM or the combatant's owner, appears whenever `spent.length > 0`
- On click: calls `refundMoveAction(combatant)` and/or `refundStandardAction(combatant)` for each entry in `spent`, **and** — since the token physically moved — updates the token document back to `priorPosition` (teleporting it back to where it stood before the move committed), then sets `undone: true` and re-renders the card ("Undone — action(s) refunded, token returned to its prior position")
- **Scope**: Undo reverses both halves of the move together — the action-economy flags *and* the physical repositioning — since a refunded move action that leaves the token standing in its new square would be a lie about what state the character is actually in. There's no partial-undo option (refund flags only, keep the new position, or vice versa); if a GM wants a different combination, they use Foundry's native token-update tools directly instead of this button

Template: `src/dice/templates/move-action-card.hbs`.

### provokes on movement actions

Each movement action config (`movementActionGating.mts`) gains a `provokes: boolean`: `walk`/`run`/`charge` → `true`; `standUp` → `true` (SRD: standing from prone provokes); `dropProne`/`fiveFootStep`/`withdraw` → `false`.

### Three new movement actions

Following the same custom-action pattern as `RUN_MOVEMENT_ACTION`/`DROP_PRONE_MOVEMENT_ACTION`:

- **`fiveFootStep`** — single square, `provokes: false`. Gated by a new `canSelectFiveFootStepMovementAction()`: only selectable if no other movement has been taken yet this turn; using it consumes the rest of the turn's movement.
- **`withdraw`** — full-round action, doubles move speed, `provokes: false`. Gated by `canSelectWithdrawMovementAction()`: combat-only, consumes the standard action.
- **`charge`** — full-round action, doubles move speed (`ACTION_TO_SPEED_KEY`/`ACTION_SPEED_MULTIPLIER` in `movementBudget.mts` extended with `charge: 'land'` / `charge: 2`, identical shape to `withdraw`'s existing 2x entry), `provokes: true`. Gated by a new `canSelectChargeMovementAction()`: combat-only, same shape as `canSelectWithdrawMovementAction()`. Registered as `const CHARGE_MOVEMENT_ACTION = 'charge'` in `movementActionGating.mts`, same declaration pattern as `RUN_MOVEMENT_ACTION`. See below.

All three new gating functions are `combat?.started`-only, matching the existing pattern for `run`/`dropProne`/`standUp`.

### Charge

Charge (a movement action, not a combat maneuver — SRD lists it under "Special Attacks" alongside the maneuvers, but mechanically it's just movement plus a mandatory melee attack, not an opposed check) is pulled forward in full this phase (not just its attack-roll half, which already existed — see §10.7's Charge toggle) as an early proof-of-concept for the movement+attack linkage alpha.3's combat maneuvers will build on: the movement half and the attack half are wired together end-to-end.

- **Straight-line only**, enforced exactly like `run`: `TokenDnd35e#_addDragWaypoint` refuses to add intermediate waypoints while `charge` is the active movement action — no new geometry/obstruction validation is added. A player who wants to charge around a corner simply can't drag that path; nothing more sophisticated (line-of-sight, terrain checks) is attempted this phase.
- **Always a full-round action**: unlike `walk`/`run`'s budget-tiered spend (move-only vs. move+standard depending on distance), a completed `charge` waypoint spends move **and** standard unconditionally, regardless of how far the token actually moved (§10.6's action-economy code sample above) — matching SRD's "charging is a full-round action."
- **No reach/legality validation**: SRD requires a charge to end within reach of the target with a clear path, but poc.10 doesn't enforce or block an "illegal" charge — the move always completes once dragged. Whether it reaches a target only affects the one thing described next.
- **Auto-links to the next attack, doesn't block anything**: once the completed charge waypoint places the token within melee reach (`isWithinReach()`, §10.5) of at least one hostile token, `markChargedThisTurn(combatant)` sets `used.chargedThisTurn` (§10.1). This is read once by `executeAction()` (§10.7) to pre-check the Charge toggle on that combatant's very next attack this turn — still fully user-overridable, same as every other auto-detected toggle. A charge that doesn't end in reach of anyone simply doesn't set the flag; nothing warns or blocks (mirrors the "trust the player" philosophy already used for straight-line dragging).
- **Enforces SRD's "single melee attack" restriction**: per SRD, charging replaces a character's entire turn with one mandatory melee attack — not a full attack sequence. `useAction()` (§10.7) checks `used.chargedThisTurn` right after that attack resolves and, if set, calls `markMovedAfterAttack(combatant)` — reusing the existing "moved after attack" gate on `canUseHandAttack()` to block any further BAB-funded attacks this turn, rather than introducing a second gating flag.

### Where AoO detection hooks in

When `_onUpdateMovement()` processes a `provokes: true` movement action and the mover was in/passed through an enemy's threatened area, it defers to the AoO detection flow — see §10.10.

---

## §10.7 Action Execution Engine

### UseActionContext & events

These were deferred from poc.6 §5.9. They are registered here.

```typescript
// Register at system init
registerEventType('preUseAction');
registerEventType('postUseAction');
registerEventType('dealDamage');
registerEventType('undoDealDamage');
```

Event payloads:

| Event | Payload | Emitted when | Example use case |
|-------|---------|-------------|----------------|
| `preUseAction` | `UseActionContext & { cancel: () => void }` | Before action executes | Silence, exhaustion, curse gates |
| `postUseAction` | `UseActionContext & { result: ActionResult }` | After action completes | Resource tracking, backlash effects |
| `dealDamage` | `{ amount: number; damageType: string; target: ActorDnd35e; context?: UseActionContext }` | Damage is applied to the target's HP as part of posting the Resolution card (**not** when the damage is rolled) | Cleave trigger, life-drain |
| `undoDealDamage` | `{ amount: number; damageType: string; target: ActorDnd35e; context?: UseActionContext }` | The Resolution card's Undo button is clicked, reversing a prior `dealDamage` | Subscribers to `dealDamage` (e.g. a future life-drain effect) reverse their own reaction too |

```typescript
interface UseActionContext {
  actor: ActorDnd35e;
  item: ItemDnd35e;
  action: ActionDataModel;
  itemId: string;
  actionId: string;
  hand?: 'main' | 'off' | 'both';
  /** Bypasses the normal action-economy gate entirely. Reserved for future AoO/Cleave-style
   *  free-attack grants (§10.10) — no caller sets this in poc.10 except the
   *  AoO flow itself. */
  free?: boolean;
  params: unknown[];
}

interface ActionResult {
  hit: boolean;
  criticalHit: boolean;
  attackTotal?: number;
  targetAc?: number;
  damageDealt?: number;
  /** Set from the dialog's Non-lethal toggle — routes damage application to the `hp.nonlethal` bucket instead of `hp.current` (§10.7). */
  nonLethal?: boolean;
  /** The posted attack card, once one exists — lets `useAction()` update its `actionEconomySpent`
   *  flag after spending (see `buildAttackCard()`, §10.8), without changing the spend-after-execute
   *  ordering that keeps a cancelled dialog from spending an action it shouldn't. */
  attackMessage?: ChatMessage;
  cancelled: boolean;
}
```

### preUseAction Cancellation Pattern

`preUseAction` merges `cancel: () => void` into the context. Any subscriber calling `cancel()` aborts execution before the action budget is consumed. Multiple calls are idempotent.

```typescript
const cancelled = { value: false };
await this.events.emit('preUseAction', { ...context, cancel: () => { cancelled.value = true; } });
if (cancelled.value) return { hit: false, criticalHit: false, cancelled: true };
```

### useAction() on ActorDnd35e — manual full attack + TWF

```typescript
async useAction(itemId: string, actionId: string, targetId?: string, options?: { free?: boolean }): Promise<ActionResult | null> {
  const item = this.items.get(itemId);
  // Default melee/thrown actions AND custom actions both live on the actor's derived
  // system.attacks.actions array (§10.3/§10.4's getContributedActorChanges() redesign) —
  // never item.system.actions, which only ever holds authored custom actions on the weapon itself.
  const action = this.system.attacks.actions?.find((a: ActionDataModel) => a.id === actionId && a.itemUuid === item.uuid);
  // No stored action.hand field — derived live from the weapon's current equip state (§10.3).
  const wieldMode = detectWieldMode(this, item);
  const hand = wieldModeToBabHand(wieldMode); // 'main' | 'off' | 'both'
  const context: UseActionContext = { actor: this, item, action, itemId, actionId, hand, free: options?.free, params: [targetId] };

  // preUseAction — allow cancellation
  let cancelled = false;
  await this.events.emit('preUseAction', { ...context, cancel: () => { cancelled = true; } });
  if (cancelled) return { hit: false, criticalHit: false, cancelled: true };

  // Validate action economy (during active combat only) — bypassed entirely when options.free
  const combat = game.combat;
  const combatant = combat?.getCombatantByActor(this.id) as CombatantDnd35e | undefined;
  if (combat?.started && combatant && !options?.free) {
    if (!canUseHandAttack(combatant, hand)) {
      ui.notifications.warn(game.i18n.localize('DND35E.COMBAT.noActionAvailable'));
      return null;
    }
  }

  // Calls the action's own public interface — useAction() never reaches into attack-specific
  // internals directly; a future skill/spell action type resolves through this same call.
  const result = await action.executeAction(context, targetId ? [targetId] : []);

  // Consume action slot — first attack this turn on this hand also spends the standard action;
  // repeat manual attacks (dual-wielding or otherwise) just spend the hand's BAB pool. A two-handed
  // weapon's `hand === 'both'` spends from both pools at once (spendHandBab()'s 'both' case). Spend
  // happens AFTER execution (not before) so a cancelled dialog never costs an action — but that means the
  // spend details aren't known yet when buildAttackCard() posted the card inside executeAction(),
  // so the card's actionEconomySpent flag is patched in right here, once the spend actually happens.
  const babSpent = 5;
  if (combat?.started && combatant && !result.cancelled && !options?.free) {
    await spendStandardAction(combatant);
    await spendHandBab(combatant, hand, babSpent);
    await result.attackMessage?.update({
      'flags.dnd35e.attackCard.actionEconomySpent': { standardActionSpent: true, hand, babSpent },
    });
    // SRD: a charge permits only this one melee attack. Reuses the existing "moved after attack" gate
    // rather than a second bespoke flag — canUseHandAttack() already treats it as a hard stop.
    if (getActionEconomy(combatant).used.chargedThisTurn) await markMovedAfterAttack(combatant);
  }

  await this.events.emit('postUseAction', { ...context, result });
  return result;
}
```

`wieldModeToBabHand(wieldMode)` is the small mapping helper behind this: Primary Hand → `'main'`, Off-Hand → `'off'`, Two-Handed → `'both'` — the same three-way detection `detectWieldMode()` already does for the STR-scaling table (§10.3), now reused for BAB-pool consumption too instead of a separately-authored `hand` field.

### DamageRoll (new)

Sibling of `D20Roll` — same minimal-wrapper shape, same rule (formula arrives **already fully resolved** through FormulaFamiliar, no `data` substitution). Its only added behavior is critical-hit multiplication, done via Foundry's built-in `Roll.alter()` (pure dice/numeric-term math, unrelated to the `@attr`/`getRollData()` roll-data bridge):

```typescript
// src/dice/DamageRoll.mts — sibling of D20Roll.mts
class DamageRoll extends Roll {
  constructor(formula: string, options: Record<string, unknown> & { critMultiplier?: number } = {}) {
    super(formula, {}, options); // data is always {} — formula already resolved, see D20Roll's doc comment
  }

  /** Multiplies dice + flat numeric terms in place before evaluation — SRD's "roll all damage, then ×multiplier" simplified to a single multiplied roll. */
  async evaluateCritical(critMultiplier: number): Promise<this> {
    this.alter(critMultiplier, 0, { multiplyNumeric: true });
    return this.evaluate();
  }
}

export { DamageRoll };
```

### Attack Roll Dialog — auto-detected combat modifiers

Attacking opens a confirmation dialog before rolling — mirroring D35E's "Use: Claw" dialog (attack roll bonus/damage bonus formula fields, a Combat Status checklist of situational modifiers, Weapon Wield Mode, Roll Mode). `D20RollDialogConfig`/`D20RollDialogApp.vue` (Phase 7, already reused by `rollSave()`/`rollInitiative()`) is documented as generic to "any d20 check (saves, ability checks, **attack rolls**)" — poc.10 reuses it here rather than rolling immediately on HUD/sheet click.

`D20RollDialogData`/`D20RollDialogResult` (§10.2) gain an optional `combatModifiers` array, rendered by `D20RollDialogApp.vue` as **two separate checklists** — "Attack Type" and "Combat Status" — alongside the existing freeform `situationalModifier`/`damageBonus` formula fields (the dialog's "Situational Bonuses" section):

```typescript
type CombatModifierGroup = 'attackType' | 'combatStatus';

interface CombatModifierToggle {
  id: string;                  // 'flanking' | 'prone' | 'nonLethal' | ...
  group: CombatModifierGroup;  // which dialog section this toggle renders under
  label: string;                // localized, e.g. "Flanking (+2)"
  tooltip: string;               // localized help text behind a help icon — explains how this affects the roll
  value: number;                 // signed modifier, e.g. +2, -4
  checked: boolean;              // pre-set by auto-detection; always user-togglable
  autoDetected: boolean;         // true = system computed this value; false = user opted in manually
}
```

Every toggle renders with a small help icon (`fa-circle-question`) next to its label; the icon's title/tooltip is `tooltip`, so users can see *why* a box affects their roll (e.g. "subtracts from your attack roll" vs. "reduces your AC until your next turn") without leaving the dialog.

**Attack Type** — player-declared choices that change the shape of the attack itself, not passive circumstances:

| Toggle | poc.10 handling | Tooltip |
|---|---|---|
| Non-lethal | **Auto-detected**, pre-checked when the acting weapon has the `nonLethal` property (§10.3) — e.g. a sap defaults checked, a longsword defaults unchecked. Always user-overridable. When checked: flags the resulting hit's damage as nonlethal, routed to `hp.nonlethal` via the existing `handleNonLethalDamageUpdate()` bucket instead of `hp.current` (see "GM-gated attack resolution" below). The −4 switch penalty is **not** a flat toggle value — it only applies when the final checked state differs from the weapon's `nonLethal` default (either direction — full RAW, not D35E's one-directional version), and is waived entirely when the weapon has `nonLethalNoPenalty` (§10.3); computed alongside the two-weapon-fighting penalty in `executeAction()`, not folded into the generic `situationalModifier` sum | "Deals nonlethal damage. Switching this weapon's normal damage type (lethal ↔ nonlethal) costs −4 to attack unless the weapon is exempt." |
| Defensive Fighting (−4) | Manual-only, always unchecked — a player-declared stance, not something geometry can detect. When checked: applies −4 to the attack roll and a short-duration self-targeted AE (+2 AC until the attacker's next turn — see "Charged / Defensive Fighting AE application" below) | "Subtracts 4 from this attack roll. In exchange you fight defensively, gaining +2 AC until your next turn — applied automatically as a short buff." |
| Charge (+2) | **Auto-detected**, pre-checked when `used.chargedThisTurn` is set on the combatant (§10.1/§10.6) — i.e. this combatant completed a `charge` movement action this turn that ended within melee reach of a hostile token. Still fully user-overridable. When checked: applies +2 to the attack roll and a short-duration self-targeted AE (−2 AC until the attacker's next turn), read back by the Roll Defense Dialog's "Charged" toggle when someone attacks this creature before its next turn. Per SRD, a charge permits only this one melee attack — enforced by `useAction()` calling `markMovedAfterAttack()` right after this attack resolves (§10.1/§10.6), not a second toggle-driven gate | "Adds 2 to this attack roll. Charging leaves you with −2 AC until your next turn — applied automatically as a short debuff, and limits you to this single attack." |

> **Self-effects, not target effects**: per SRD, Charging grants +2 attack / −2 AC to the *charger*, and Fighting Defensively grants −4 attack / +2 AC to the *fighter* — both self-effects on the attacker, lasting until that creature's own next turn, unrelated to whoever they're attacking (d20srd.org → Combat → Special Attacks → Charge). The short-duration self-AE just automates that bookkeeping so a later attacker's Roll Defense Dialog can auto-detect it; the Roll Defense Dialog's own Charged/Defensive Fighting toggles remain fully manual-overridable regardless.

**Combat Status** — situational circumstances the system tries to auto-detect; the user can still override any of them:

| Toggle | poc.10 handling | Tooltip |
|---|---|---|
| Flanking (+2) | **Auto-detected**, pre-checked via `isFlanking()` (§10.10, geometry already scoped this phase) | "You and an ally are on opposite sides of the target, denying it the ability to fully defend against both of you." |
| High Ground (+1) | **Auto-detected**, pre-checked via `isOnHigherGround(attackerToken, targetToken)` (new helper, alongside `isFlanking()`) — compares `attackerToken.document.elevation` against `targetToken.document.elevation`. Both are already expressed in the scene's grid distance units (Foundry's own `TokenDocument#elevation`, confirmed against the bundled v14.365 client source — same units `canvas.grid.measurePath()` returns), so no square-to-distance conversion is needed here the way `isWithinReach()`/`SIZE_REACH` require. "Significantly" lower is a flat threshold, `HIGH_GROUND_ELEVATION_SQUARES` (2 squares / 10 ft), converted via the same `convertToLocalizedDistance()` helper `isWithinReach()` already uses | "Attacking a foe on significantly lower ground grants a bonus on melee attack rolls." |
| Squeezing (−4) | **Auto-detected**, pre-checked via `actor.statuses.has(SQUEEZING_CONDITION_ID)` — a new persistent condition, same pattern as Prone: an icon-only status the GM/player toggles manually via the Token HUD (`conditions.mts`, Story A), not derived from corridor-width geometry. The dialog just reads whatever's already applied | "Squeezing through a space narrower than your own imposes a penalty on attack rolls (and to AC, not yet applied automatically)." |
| Prone (−4) | **Auto-detected**, pre-checked via `actor.statuses.has('prone')` (already implemented, poc.9's Drop Prone/Stand Up movement actions). SRD also disallows ranged attacks while prone except crossbows — not enforced yet, noted as a minor follow-up, not a blocker | "Attacking in melee while lying prone imposes a penalty on the attack roll." |
| Proficient | Manual-only, **unchecked by default** — inverted from a "Not Proficient" penalty toggle to a "Proficient" toggle so the field reads the way the rule is actually worded (proficiency is what avoids the penalty, not the other way around). Unlike every other Combat Status toggle (where `checked` applies the toggle's `value`), this one inverts: the −4 applies only while **unchecked** — `executeAction()` reads it directly the same way it already special-cases the Non-lethal switch penalty and TWF penalty, rather than folding it into the generic `situationalModifier` sum. Defaults unchecked since there's no feat/class proficiency data to auto-detect from yet — alpha's Feat/proficiency system flips this to auto-detected once it lands; until then a GM/player checks it manually to flag proficient weapon use | "Attacking with a weapon you're proficient with avoids a −4 penalty. Leave unchecked to apply the non-proficiency penalty." |

**Omitted from both sections**: Feats / Conditional Modifiers — empty until the Feat system exists (alpha.4); unrelated to the flat penalties above, which aren't feat-driven.

**Not dialog fields at all**:
- Attack Roll Bonus / Damage Bonus (formula) — these are the "Situational Bonuses" section's two freeform formula inputs (`situationalModifier`/`damageBonus`), not checkboxes; `damageBonus` is carried through untouched and only folded into the resolved damage formula once damage is actually rolled, post-hit ("we don't act on it until we roll damage")
- Primary Attack — removed entirely; `hand` (`main`/`off`/`both`) is derived live from `detectWieldMode()` (§10.3), not a stored per-action field — nothing left to ask for a `requiresEquipped: true` action
- Roll Mode — already supported, `D20RollDialogApp.vue` already exposes `CONFIG.ChatMessage.modes`

**Hand select — new dialog field, always shown.** A Main/Off select present for every attack action, not gated on `requiresEquipped` — pre-filled by auto-detection (the main hand, unless the weapon is already expressly equipped in the off-hand slot) and always user-overridable, the same auto-detect-plus-override shape as Wield Mode below. For a `requiresEquipped: false` action specifically, `executeAction()` additionally enforces that the selected hand is actually free (or already holds the weapon being thrown) before allowing the attack — see §10.3's "No stored `defaultSlotId`" section.

**Wield Mode — a real dialog field, auto-filled.** Unlike the list above, Wield Mode (Primary Hand / Off-Hand / Two-Handed — §10.3's STR-scaling table) mirrors D35E's own dropdown directly: it's a `MultiOptionToggle` (same component as the Roll Defense Dialog's Covered/check-mode toggles) shown in the dialog and always user-overridable, but pre-selected by `detectWieldMode(actor, item)` from the weapon's current `equippedSlotIds` (and, for the Off-Hand case, whether a different weapon currently occupies the other hand) — the player never has to manually configure it for the common case, only override it for an edge case the auto-detection guesses wrong.

`executeAction()` builds the `combatModifiers` array right before opening the dialog (evaluating `isFlanking()`, `isOnHigherGround()`, `actor.statuses.has(PRONE_CONDITION_ID)`, `actor.statuses.has(SQUEEZING_CONDITION_ID)`, and — during active combat — the combatant's `used.chargedThisTurn` flag for the Charge toggle, §10.1/§10.6), and folds the dialog's returned `situationalModifier` (freeform formula sum + checked toggle values across both groups) into the resolved attack formula. The separate `damageBonus` field is passed through untouched and only folded into the resolved damage formula later, once damage is actually rolled. The dialog's returned Wield Mode selection feeds `getWieldModeStrTerm()` (§10.3), appended to the resolved damage formula the same way.

### ActionDataModel#executeAction()

This is the standard **public** interface every `ActionDataModel` subtype exposes to the outside world — `useAction()` (below) calls `action.executeAction(context, targetIds)` and nothing else; it never reaches into attack-specific internals directly. For poc.10, `MeleeWeaponAttack`/`RangedWeaponAttack`/`ThrownWeaponAttack` all share one identical implementation (branching internally on `this.range`/weapon properties, never on subtype), so it's implemented once directly on the `ActionDataModel` base class and inherited unchanged by all four — no per-subtype override needed yet. This is also the hook alpha.3+ non-weapon action types (skill checks, spells, combat maneuvers) are expected to override with their own resolution logic; `useAction()`'s call site doesn't change when they do.

Both `this.check.formula` and `this.damage.formula` are `FormulaField`s (§10.3) — resolved via `FormulaData.resolve()` against a `documentDataMap` (built the same way `FormulaData`/`FormulaResolver` already do it elsewhere in the codebase) into a plain string with every `#self.x`/`#target.x` token replaced by its literal value. The resulting string is what gets handed to `D20Roll`/`DamageRoll` — never a Foundry `data` object, never `getRollData()`.

Hit/miss and damage are **not** decided here — mirroring D35E's two-sided attack/defense flow, the defender's own Roll Defense step (below) supplies Concealment, Cover, Total Defense, Charged, and the rest before a hit is final. This method's job is: validate reach, run the Attack Roll Dialog, roll the attack die, and post the attack card with a raw total and a **not-yet-rolled** damage formula snapshot per target — see "GM-gated attack resolution" below.

```typescript
// ActionDataModel.mts — a public instance method on the DataModel itself, not a private
// Actor method; `this` is the action instance being executed (§10.3)
async executeAction(context: UseActionContext, targetIds: string[] = []): Promise<ActionResult> {
  const { actor, item, hand } = context;
  // Every poc.10 action defaults maxTargets to 1 (§10.3) — no melee or ranged/thrown weapon attack
  // can legitimately have more than one target this phase. Extra ids beyond the cap are dropped with
  // a warning rather than silently attacking only the first N — the caller (HUD/sheet trigger, or a
  // GM's Change Target(s) click) should never have offered more than the action allows in the first place.
  if (targetIds.length > this.maxTargets) {
    ui.notifications.warn(game.i18n.format('DND35E.COMBAT.tooManyTargets', { max: this.maxTargets }));
    targetIds = targetIds.slice(0, this.maxTargets);
  }
  const targets = targetIds.map(id => game.actors?.get(id)).filter((a): a is ActorDnd35e => !!a);
  const attackerToken = canvas.tokens?.placeables.find(t => t.actor?.id === actor.id) ?? null;
  // Only needed to read the Charge auto-detection flag (§10.1/§10.6) and, later, to enforce the
  // post-charge single-attack restriction back in useAction() — undefined outside active combat.
  const combatant = game.combat?.getCombatantByActor(actor.id) as CombatantDnd35e | undefined;


  // Reach validation against every target (melee only — ranged/thrown reach handling is §10.9).
  // A weapon with the `reach` property (§10.3) doubles the attacker's SIZE_REACH for this attack —
  // but per SRD, a reach weapon can't be used against an adjacent foe, unless it also has the
  // `threatensAdjacent` property (spiked chain and homebrew equivalents), so the valid target band
  // is (baseReach, doubledReach] for an ordinary reach weapon, or [0, doubledReach] when
  // `threatensAdjacent` is set too — checked both ways below.
  if (attackerToken && !this.range) {
    const baseReach = SIZE_REACH[actor.system.details.size as Size] ?? 1;
    const hasReachProperty = item.system.properties.has(WEAPON_PROPERTY_REACH);
    const hasDeadZone = hasReachProperty && !item.system.properties.has(WEAPON_PROPERTY_THREATENS_ADJACENT);
    const reach = hasReachProperty ? baseReach * 2 : baseReach;
    for (const target of targets) {
      const targetToken = canvas.tokens?.placeables.find(t => t.actor?.id === target.id) ?? null;
      if (!targetToken) continue;
      if (hasDeadZone && isWithinReach(attackerToken, targetToken, baseReach)) {
        ui.notifications.warn(game.i18n.format('DND35E.COMBAT.targetTooCloseForReach', { target: target.name }));
        return { hit: false, criticalHit: false, cancelled: false };
      }
      if (!isWithinReach(attackerToken, targetToken, reach)) {
        ui.notifications.warn(game.i18n.format('DND35E.COMBAT.targetOutOfReach', { target: target.name }));
        return { hit: false, criticalHit: false, cancelled: false };
      }
    }
  }

  // Two-weapon fighting penalty — computed here, not stored on the action (§10.3)
  const twfPenalty = getTwoWeaponFightingPenalty(item, hand);
  // Non-lethal switch penalty — see §10.3's `nonLethal`/`nonLethalNoPenalty` properties
  const weaponNonLethalDefault = item.system.properties.has(WEAPON_PROPERTY_NON_LETHAL);

  // Attack Roll Dialog — auto-detected combat modifiers, user-overridable (see above).
  // Every poc.10 action caps at maxTargets: 1 (§10.3, enforced above), so targets[0] is always the
  // entire target list for a weapon attack — flanking geometry genuinely only ever needs one target
  // here, not a stand-in simplification for a broader multi-target case that doesn't exist yet.
  const primaryTargetToken = targets[0] ? (canvas.tokens?.placeables.find(t => t.actor?.id === targets[0].id) ?? null) : null;
  const combatModifiers: CombatModifierToggle[] = [
    { id: 'flanking', group: 'combatStatus', label: game.i18n.localize('DND35E.COMBAT.MODIFIER.flanking'), tooltip: game.i18n.localize('DND35E.COMBAT.MODIFIER.flanking.tooltip'), value: 2, checked: isFlanking(attackerToken, primaryTargetToken), autoDetected: true },
    { id: 'prone', group: 'combatStatus', label: game.i18n.localize('DND35E.COMBAT.MODIFIER.prone'), tooltip: game.i18n.localize('DND35E.COMBAT.MODIFIER.prone.tooltip'), value: -4, checked: actor.statuses.has(PRONE_CONDITION_ID) && !action.range, autoDetected: true },
    { id: 'squeezing', group: 'combatStatus', label: game.i18n.localize('DND35E.COMBAT.MODIFIER.squeezing'), tooltip: game.i18n.localize('DND35E.COMBAT.MODIFIER.squeezing.tooltip'), value: -4, checked: actor.statuses.has(SQUEEZING_CONDITION_ID), autoDetected: true },
    { id: 'highGround', group: 'combatStatus', label: game.i18n.localize('DND35E.COMBAT.MODIFIER.highGround'), tooltip: game.i18n.localize('DND35E.COMBAT.MODIFIER.highGround.tooltip'), value: 1, checked: isOnHigherGround(attackerToken, primaryTargetToken), autoDetected: true },
    // value: 0 here on purpose — inverted from the other toggles: the −4 applies only while this
    // stays *unchecked* (see §10.7's Proficient row), so it's kept out of this flat sum and applied
    // next to twfPenalty/nonLethalPenalty below instead, once the dialog's final checked state is known.
    { id: 'proficient', group: 'combatStatus', label: game.i18n.localize('DND35E.COMBAT.MODIFIER.proficient'), tooltip: game.i18n.localize('DND35E.COMBAT.MODIFIER.proficient.tooltip'), value: 0, checked: false, autoDetected: false },
    { id: 'charge', group: 'attackType', label: game.i18n.localize('DND35E.COMBAT.MODIFIER.charge'), tooltip: game.i18n.localize('DND35E.COMBAT.MODIFIER.charge.tooltip'), value: 2, checked: combatant ? getActionEconomy(combatant).used.chargedThisTurn : false, autoDetected: true },
    { id: 'defensiveFighting', group: 'attackType', label: game.i18n.localize('DND35E.COMBAT.MODIFIER.defensiveFighting'), tooltip: game.i18n.localize('DND35E.COMBAT.MODIFIER.defensiveFighting.tooltip'), value: -4, checked: false, autoDetected: false },
    // value: 0 here on purpose — the real −4 switch penalty is conditional (only when the final
    // checked state differs from `weaponNonLethalDefault`, waived by nonLethalNoPenalty) and is
    // computed after the dialog closes, alongside twfPenalty, rather than folded into this flat sum.
    { id: 'nonLethal', group: 'attackType', label: game.i18n.localize('DND35E.COMBAT.MODIFIER.nonLethal'), tooltip: game.i18n.localize('DND35E.COMBAT.MODIFIER.nonLethal.tooltip'), value: 0, checked: weaponNonLethalDefault, autoDetected: true },
  ];
  const dialogResult = await D20RollDialogConfig.roll({
    title: game.i18n.format('DND35E.COMBAT.attackRollTitle', { weapon: item.name }),
    baseLabel: this.name,
    baseTotal: 0, // preview only — the real formula (incl. #self/#item tokens) resolves below
    situationalModifier: 0,
    damageBonus: '', // separate formula field — folded into damage only, never the attack roll (see below)
    combatModifiers,
    rollMode: game.settings.get('core', 'rollMode'),
    actorName: actor.name,
    actorImage: actor.img,
  });
  if (!dialogResult) return { hit: false, criticalHit: false, cancelled: false }; // user cancelled

  // `combatModifiers` round-trips with final checked state — the numeric sum already folds into
  // `situationalModifier` below, but Non-lethal/Charge/Defensive Fighting also need their own booleans.
  const isNonLethal = dialogResult.combatModifiers.find(m => m.id === 'nonLethal')?.checked ?? false;
  // §10.3: penalty only applies when the final state deviates from the weapon's natural type, and
  // is waived entirely by `nonLethalNoPenalty` — never a flat -4, so it's kept out of the toggle's
  // own `value`/`situationalModifier` sum and applied here next to twfPenalty instead.
  const nonLethalPenalty = isNonLethal !== weaponNonLethalDefault && !item.system.properties.has(WEAPON_PROPERTY_NON_LETHAL_NO_PENALTY)
    ? -4
    : 0;
  // §10.7: Proficient inverts the usual checked-applies-value shape — unchecked is what applies
  // the −4, so it's computed here rather than folded into the toggle's own `value`.
  const isProficient = dialogResult.combatModifiers.find(m => m.id === 'proficient')?.checked ?? false;
  const proficiencyPenalty = isProficient ? 0 : -4;
  // Applies the short-duration self-AE (see "Charged / Defensive Fighting AE application" below) —
  // read back later by the Roll Defense Dialog's own Charged/Defensive Fighting auto-detection.
  if (dialogResult.combatModifiers.find(m => m.id === 'charge')?.checked) await applyChargedAE(actor);
  if (dialogResult.combatModifiers.find(m => m.id === 'defensiveFighting')?.checked) await applyDefensiveFightingAE(actor);

  // FormulaFamiliar resolution — #self/#item/#target tokens become literal numbers here, before any Roll exists
  const documentDataMap = { self: actor, item, target: targets[0] ?? null };
  const resolvedCheckFormula = this.check?.formula.resolve(documentDataMap, '1d20') ?? '1d20';
  const modifierTerm = dialogResult.situationalModifier ? ` + ${dialogResult.situationalModifier}` : '';
  const flatPenalty = twfPenalty + nonLethalPenalty + proficiencyPenalty;
  const attackFormula = flatPenalty !== 0
    ? `${resolvedCheckFormula} - ${Math.abs(flatPenalty)}${modifierTerm}`
    : `${resolvedCheckFormula}${modifierTerm}`;

  const attackRoll = new D20Roll(attackFormula, {}, { rollMode: dialogResult.rollMode });
  await attackRoll.evaluate();

  // Wield-mode STR term (§10.3): melee always gets it; the ranged/thrown default action only gets
  // it when the weapon has the `thrown` property (true ranged weapons — bows, crossbows — don't
  // add STR to damage). `action.range` is non-null only for the ranged/thrown default action.
  const includeStrTerm = !this.range || item.system.properties.has(WEAPON_PROPERTY_THROWN);
  const strTerm = includeStrTerm ? getWieldModeStrTerm(dialogResult.wieldMode) : '';
  const resolvedDamageFormula = this.damage ? `${this.damage.formula.resolve(documentDataMap, '0') ?? '0'}${strTerm}` : null;

  // Live critRange (§10.4's "Threat range becomes a number" — post-AE, so a beta.8 Keen effect
  // applies automatically), not the seed-time `action.damage.critRange` snapshot.
  const effectiveCritRange = item.system.weaponDamage.critRange;

  // Hit/miss and damage are decided later, per target, once someone clicks that target's row on the
  // attack card (see "GM-gated attack resolution" below) — `result` here is a placeholder; anything
  // needing the real outcome should key off `dealDamage`/`undoDealDamage`, not this return value.
  const result: ActionResult = { hit: false, criticalHit: false, attackTotal: attackRoll.total, cancelled: false, nonLethal: isNonLethal };
  result.attackMessage = await buildAttackCard(context, attackRoll, result, targets, {
    resolvedDamageFormula,
    damageBonusTerm: dialogResult.damageBonus ? ` + ${dialogResult.damageBonus}` : '',
    critMultiplier: this.damage?.critMultiplier ?? 2,
    isCriticalThreat: attackRoll.isCriticalThreat(effectiveCritRange),
  });

  return result;
}
```

### Action Chain — resolving back to the same action instance

Every `*WeaponAttack` action is really a **default 2-step chain**: step 1 is the attack roll itself (`executeAction()`, above); step 2 is whatever this action's own `chain[0]` link says to do once the GM (or self-defending player) confirms a hit — for poc.10, always the `'damage'` sentinel (§10.4), meaning "resolve this action's own embedded `.damage` block." The attack card's Apply button doesn't hardcode "roll damage," and it doesn't look anything up in a step registry either — it resolves back to the **exact same action instance** that fired the attack, then calls that instance's own `continue(stepId, ...)`, the chain-continuation counterpart to `executeAction()`. This is what lets alpha.3 upgrade `chain[0].actionId` from a sentinel to a real cross-action hop (dealing ability damage, applying a debuff, or a combination) — the click handler and the resolution mechanism don't change; only what a given action's own `continue()` does with the stepId it's handed does.

Chat message flags are plain serialized JSON — there's no live object reference to store — so resolving back to "the exact same instance" means reaching through the actor: the attack card stores a composite id, the attacker's real Foundry UUID (works for linked and unlinked/synthetic token actors alike, unlike `game.actors.get()`) plus the action's own `id` (§10.3, already unique per action), and `advanceActionChain()` splits it back apart:

```typescript
// src/dice/actionChainSteps.mts (new)
const ACTION_CHAIN_ID_SEPARATOR = '.Action.'; // never collides with a real Foundry UUID segment (Actor/Item/Scene/Token/etc.)

function buildActionChainId(actor: ActorDnd35e, action: ActionDataModel): string {
  return `${actor.uuid}${ACTION_CHAIN_ID_SEPARATOR}${action.id}`;
}

// src/dice/rollMessages.mts — triggered by the attack card's data-action="apply-attack" click handler.
// Resolves back to the concrete action instance rather than a step registry, then hands off to it
// entirely — this function's own body never changes when a future action type's continue() differs.
async function advanceActionChain(message: ChatMessage, targetId: string): Promise<void> {
  const attackCard = message.flags.dnd35e.attackCard;
  const row = attackCard.targets.find(t => t.targetId === targetId);
  if (!row || row.resolved) return; // already resolved — one-shot per target

  const [actorUuid, actionId] = attackCard.actionUuid.split(ACTION_CHAIN_ID_SEPARATOR);
  const actor = (await fromUuid(actorUuid)) as ActorDnd35e | null;
  // Same derived collection useAction() already searches (§10.7) — every system-created and custom
  // action across all of the actor's items, flattened by getContributedActorChanges() (§10.4).
  const action = actor?.system.attacks.actions?.find((a: ActionDataModel) => a.id === actionId);
  if (!action) return; // the acting item/action no longer exists (deleted since the card posted)

  await action.continue(attackCard.stepId, message, targetId);
}
```

`ActionDataModel#continue()` is implemented once on the base class (same "one shared implementation" shape as `executeAction()`) and handles poc.10's only sentinel:

```typescript
// ActionDataModel.mts — the chain-continuation counterpart to executeAction(). `stepId` is always
// this action's own chain[0].actionId value (§10.4) — 'damage' is the only sentinel poc.10 ever
// produces. alpha.3 overriding this method (or branching on a real, non-sentinel stepId) is how a
// different action type resolves a different step 2.
async continue(stepId: string, message: ChatMessage, targetId: string): Promise<void> {
  if (stepId !== 'damage') return; // no other sentinel exists yet (alpha.3 upgrades this to real cross-action hops)

  const attackCard = message.flags.dnd35e.attackCard;
  const row = attackCard.targets.find(t => t.targetId === targetId)!;

  const actor = game.actors?.get(attackCard.actorId);
  const target = game.actors?.get(targetId);
  if (!actor || !target) return;

  const dialogResult = await RollDefenseDialogConfig.roll(buildRollDefenseDialogData(target, actor));
  if (!dialogResult) return; // cancelled — row stays unresolved, Apply button reappears

  const { hit, criticalHit, effectiveAc } = evaluateDefense(attackCard.attackTotal, attackCard.isCriticalThreat, dialogResult);

  let damageRoll: DamageRoll | null = null;
  if (hit && attackCard.resolvedDamageFormula) {
    damageRoll = new DamageRoll(`${attackCard.resolvedDamageFormula}${attackCard.damageBonusTerm}`);
    if (criticalHit) await damageRoll.evaluateCritical(attackCard.critMultiplier);
    else await damageRoll.evaluate();
    if (dialogResult.applyHalfDamage) damageRoll.total = Math.floor(damageRoll.total / 2);
  }

  row.resolved = true;
  row.hit = hit;
  await message.update({ 'flags.dnd35e.attackCard': attackCard }); // re-render the attack card row (Apply → "Hit"/"Miss")

  // buildResolutionCard() applies the damage as part of posting — no separate GM click, no editable total
  await buildResolutionCard(actor, target, attackCard, dialogResult, { hit, criticalHit, effectiveAc }, damageRoll);
}
```

### GM-gated attack resolution (2-card chain: Attack → Resolution, damage auto-applied on hit)

D35E never applies damage silently, and never lets the attack roll alone decide hit/miss either — the defender always gets their own dialog (`ACRollDefense`) to fold in Concealment, Cover, Total Defense, and the rest before a hit is final. Phase 10 adopts that same two-sided shape, chained across exactly two chat messages instead of D35E's single combined card:

1. **Attack card** (`buildAttackCard()`) — posted immediately from `executeAction()`. Shows the raw attack roll and one row per target, each with an **Apply** button (`data-action="apply-attack"`) that calls `advanceActionChain()` (above)
2. **Resolution card** (`buildResolutionCard()`) — posted once the action's own `continue()` (above) resolves the `'damage'` step for a target's row. The clicking user (GM, or — if `game.settings.get(SYSTEM_ID, PLAYER_SELF_DEFENSE)` is enabled — the target's own owner) gets the **Roll Defense Dialog** (below) for that target; **`PLAYER_SELF_DEFENSE` defaults `true` during poc development** (lets one dev test both the attacker and defender side solo) — `// TODO: flip PLAYER_SELF_DEFENSE's default to false before release; true is a dev/testing convenience, matching D35E's own default is GM-gated Apply` goes on the setting registration itself so the flip isn't forgotten; its result finalizes hit/miss (and crit confirmation), and **on a hit, damage is rolled and applied to the target's HP immediately as part of posting this card** — there is no separate manual "Apply Damage" step. The card carries the one Undo button available for this exchange (see below)


`evaluateDefense()` folds together: the target's static AC (or touch AC, or bypassed entirely in "No Check" mode), the checked Combat Status/Overrides toggles' modifiers, the Concealment formula's miss-chance roll (a d% against the resolved percentage — a miss here overrides an otherwise-successful hit total), and re-confirms the critical threat against the now-final AC (since Cover/Concealment/Total Defense can change what AC a natural-20 needs to beat) — see "Roll Defense Dialog" below for exactly what feeds in.

### Retargeting ("Change Target(s)")

The attack card's target list isn't fixed at cast time — the GM can re-sync it to whatever's currently selected on the canvas:

- A **Change Target(s)** button (`data-action="retarget"`, GM or player that made the attack only — matches Foundry's own targeting authority model) re-reads the user's live `game.user.targets` and replaces the card's **unresolved** rows with that set (capped to `action.maxTargets`, same truncation-with-warning behavior as `executeAction()` above); already-`resolved` rows are left untouched (an applied/miss row doesn't get silently dropped or re-opened by a retarget click)
- The attack card's `targets: [...]` array and one-row-per-target rendering are already general enough for a future action type with `maxTargets > 1` (an AOE/spell-style action, alpha.11+) — but every poc.10 weapon action caps at 1 (§10.3), so in practice a retarget click never produces more than a single row this phase
- Re-renders the attack card's target list; does **not** re-roll the attack die (the same `attackTotal` applies to whichever targets end up in the list)

### Roll Defense Dialog

The defender-side counterpart to the Attack Roll Dialog — same `D20RollDialogConfig`/Vue-app shape (`RollDefenseDialogConfig`/`RollDefenseDialogApp.vue`, sibling files), reusing the two-group `combatModifiers` pattern (Combat Status / Overrides) plus its own formula field, mode toggle, and submit button:

**Combat Status** — situational circumstances read from the *target* being attacked; auto-detected where possible, always user-overridable:

| Toggle | poc.10 handling | Tooltip |
|---|---|---|
| Concealment (0–100%) | **Single formula field**, replacing D35E's two checkboxes (20%/50%) + numeric override. Blank/0 by default; placeholder text hints "e.g. 20 or 50"; any formula or literal 0–100 accepted. A roll >0 triggers a d% miss-chance check during resolution (a failed roll overrides an otherwise-successful hit) | "Chance this attack misses regardless of AC, due to concealment. 20% for normal concealment, 50% for total concealment, or any custom value/formula." |
| Charged (−2) | **Auto-detected**, pre-checked via `actor.statuses.has(CHARGED_CONDITION_ID)` on the **target** — set by `applyChargedAE()` when *that creature* charged on its own last turn (see below); not related to whether the attacker charged. Remains manually toggleable — this is an automation convenience, not the sole way it gets set (see the "escape hatch" callout above) | "This creature charged on its last turn and is at −2 AC until its next turn." |
| Covered / Improved Cover | **3-way `MultiOptionToggle`** (None / Covered +4 / Improved Cover +8) — mutually exclusive by construction, replacing two independent (and previously co-checkable) checkboxes. Manual-only this phase; auto-detection from GM-authored cover regions is a forward-looking note, not built now | "Cover grants +4 AC, Improved Cover +8 AC, against attacks from the covered direction." |
| Flat-Footed | **Auto-detected**, pre-checked via `actor.statuses.has(FLAT_FOOTED_CONDITION_ID)` (existing condition, already auto-applied at combat start per Story A) — moved here from the bottom check-mode row since it's a condition, not a roll mode | "Flat-footed creatures lose their Dex bonus to AC and can't make AoOs." |
| Total Defense (+4) | **Auto-detected**, pre-checked via `actor.statuses.has(TOTAL_DEFENSE_CONDITION_ID)` — set by the new Total Defense special action (below), which the target must have spent its standard action on this round to gain | "This creature used its standard action for Total Defense this round: +4 AC until its next turn." |
| Defensive Fighting (+2) | **Auto-detected**, pre-checked via `actor.statuses.has(DEFENSIVE_FIGHTING_CONDITION_ID)` on the **target** — set by `applyDefensiveFightingAE()` when *that creature* chose Defensive Fighting on its own last attack (mirrors Charged, above) | "This creature fought defensively on its last attack and is at +2 AC until its next turn." |

**Overrides** — GM-discretion valves, all manual except where noted:

| Toggle | poc.10 handling | Tooltip |
|---|---|---|
| Apply Half Damage | Manual-only (existing D35E override). Applied to the rolled damage total *before* it's auto-applied (§10.7's "GM-gated attack resolution"), since there's no separate editable-total step to adjust it at | "Halves the final applied damage (e.g. Evasion-adjacent effects)." |
| Ignore Critical Hit | **Auto-detected**, pre-checked via the target's own `system.defense.criticalImmune` derived field (see "Critical immunity as a derived field" below) | "This creature is immune to critical hits (e.g. undead, constructs, oozes)." |

No Precision Damage override toggle this phase — deferred to alpha.3 (see Scope boundaries above).

**Situational Bonus** (formula field, own section below the toggles): contexts `defender` (preferred; `self` still resolves to the same context) and `attacker` — mirrors the Attack Roll Dialog's own `situationalModifier` field, which gains `attacker` as an alias of its existing `self` (already the default/preferred term there) alongside its existing `target` context. See "FormulaFamiliar context aliasing" below for how this is wired.

**Check mode** — the bottom button row:

- Flat-footed **removed** from this row (relocated to Combat Status above, since it's a condition, not a roll mode)
- Remaining three (**Normal** / **Touch** / **No Check**) become a `MultiOptionToggle` (single-select, matching the component already used for HP adjustment type)
- A new **Defend** button is the dialog's actual roll/submit trigger — performs the AC check using whichever mode is currently selected in the toggle (Normal compares against full AC, Touch against touch AC, No Check skips the roll/miss-chance entirely and reports whatever the toggled Combat Status/Overrides state alone implies)

### Critical immunity as a derived field

`system.defense.criticalImmune` — a new `boolean`, entirely derived (never stored in source, same family as `defense.denyDexToAC`), defaulted `false`. A Racial Trait's AE targets this field directly (`system.defense.criticalImmune`, `OVERRIDE` mode, value `true`) exactly the way `denyDexToAC` is already set by the Flat-Footed condition — this keeps critical-immunity detection inside the same derived-defense-field convention the rest of `CreatureSystemData.defense` already uses, rather than introducing a parallel flags-based mechanism for something that's really just another combat-relevant derived stat.

### Total Defense (special action)

Not a checkbox — Total Defense is its own action, spent on the defender's own turn, not something a defender can retroactively claim mid-attack. It's the one entry populating this phase's **Combat Maneuvers** HUD list (§10.11) — Total Defense isn't itself a maneuver, but it's the only action-shaped control that belongs on that row this phase; Charge already lives in the Movement Actions list instead (§10.6), not here:

- Token HUD **Combat Maneuvers** entry (list built by Story D, §10.11) that spends the creature's **standard action** (`spendStandardAction()`) and applies a self-targeted AE: `+4 AC (dodge)`, `duration: { turns: 1 }` (until the start of the creature's next turn — see Spike 3's AE-duration spike) tagged with a `TOTAL_DEFENSE_CONDITION_ID` status so the Roll Defense Dialog can auto-detect it
- Only selectable during `combat?.started`, gated the same way `run`/`dropProne` movement actions already are (§10.6)
- The Roll Defense Dialog reads this exactly like Charged/Defensive Fighting — no bespoke plumbing beyond the AE + status-id pattern already established

### Charged / Defensive Fighting AE application

Both are the same shape: a short self-targeted AE, applied from the Attack Roll Dialog's own resolution (`executeAction()`, above) onto the **attacker**, read back later — possibly several attacks later, by a different attacker entirely — by the Roll Defense Dialog when *that same creature* becomes a target:

```typescript
// src/documents/actors/creature/logic/combatConditionAEs.mts (new — shared by Charged/Defensive Fighting/Total Defense)
async function applyChargedAE(actor: ActorDnd35e): Promise<void> {
  await createShortDurationAE(actor, { statusId: CHARGED_CONDITION_ID, changes: [{ key: 'system.defense.armorClass.total', value: -2, mode: ADD }] });
}
async function applyDefensiveFightingAE(actor: ActorDnd35e): Promise<void> {
  await createShortDurationAE(actor, { statusId: DEFENSIVE_FIGHTING_CONDITION_ID, changes: [{ key: 'system.defense.armorClass.total', value: 2, mode: ADD }] });
}
```

`createShortDurationAE()` is the one shared helper all three (Charged, Defensive Fighting, Total Defense) go through — see the AE-duration decision immediately below for what `duration` shape it actually writes.

### AE duration review

Total Defense, Defensive Fighting, and Charged all need the same "until the start of your next turn" lifetime — see **Spike 3** in §10.14, **resolved: native mechanism, no custom expiry hook needed**. `createShortDurationAE()` creates the AE with `duration: { value: 1, units: 'turns' }` while combat is active; Foundry v14 core's `duration.expiry` schema default (`initial: d => typeof d?.duration?.value === 'number' ? 'turnStart' : null`) auto-selects `'turnStart'`, and core's own `ActiveEffect#isExpiryEvent('turnStart', ...)` matches specifically against `this.start.combatant` (auto-stamped on creation) — it only fires when it becomes *that* combatant's own turn, not any turn-advance. `Combat#startCombatantTurn()` already calls `ActiveEffect.registry.refresh('turnStart', ...)` on every turn change, so no hook into `CombatDnd35e._onStartTurn()` is required for expiry itself. Broader AE-duration consistency work across all effect types is out of scope here.

### Concealment auto-detection

Promoted to its own story — see **Spike 1** in §10.14. Spikes get their own story slot (not folded into another story's checklist) since they can block, or be blocked by, other work in ways an inline checklist item can't express. **Resolved: no-go** — the Concealment field ships fully manual this phase (see Spike 1's verdict, including its revision note: light-source-radius detection is feasible, but combining it with per-observer senses into full auto-concealment is out of scope here and logged on the wishlist instead).

### FormulaFamiliar context aliasing (self / attacker / target / defender)

Both dialogs' Situational Bonus fields resolve through the same `FormulaData.resolve(documentDataMap, ...)` used everywhere else — `documentDataMap`'s primary key is always literally `'self'` (`buildDocumentDataMap()`'s current contract). To let each dialog show its own preferred term (`self`/`attacker` on the Attack dialog, `defender`/`self` on the Roll Defense dialog, `attacker` unchanged either way) without duplicating context entries in the FormulaFamiliar autocomplete, `buildDocumentDataMap()`/`FormulaData._buildFamiliarFromDocumentMap()` need a small enhancement to accept a caller-supplied preferred alias for the `self` context (existing `aliases` support on `FamiliarContext` — confirmed in `FormulaResolver.aspectResolution.mts` — already does the resolution half; what's missing is a way to *label* the schema entry with the caller's preferred name instead of the hardcoded `'Self'`).

No stopgap — the schema-labeling enhancement above is built as a real Story E task (not a fallback-guarded "resolve or skip" item). `buildDocumentDataMap()`/`FormulaData._buildFamiliarFromDocumentMap()` gain the preferred-alias parameter directly, so the autocomplete shows exactly one preferred term per dialog (`self`/`attacker` on the Attack dialog, `defender`/`self` on the Roll Defense dialog) from day one, with no duplicate-entry period to design around.

### Undo (resolution card)

Same visibility gate the old Apply Damage button had (GM or target owner) — now surfaced directly on the Resolution card, since that's the card that actually mutated HP:

- Appears only when `outcome.hit` was true and damage was actually applied; a miss (or a "No Check" resolution) never shows an Undo button at all — and since nothing was applied on a miss, the attacker's action-economy spend for a missed attack simply can't be undone through this card either (undoing the action and undoing the damage are the same click, not two independent choices)
- `data-action="undo-resolution"` calls `target.takeDamage(-appliedAmount, { damageType, nonlethal, source: actor, isUndo: true })` — i.e. **reverses the exact delta** that was auto-applied when the card was created (heals `appliedAmount` back, or reduces `hp.nonlethal` by `appliedAmount` if it was nonlethal), not a restore of an absolute HP snapshot. This composes safely even if other damage/healing landed on the target in between the card posting and the Undo
- **Also refunds the attacker's action economy in the same click**: when `resolutionCard.actionEconomySpent` is non-null, looks up the attacker's combatant (`game.combat?.getCombatantByActor(resolutionCard.actorId)`) and calls `refundStandardAction(combatant)` + `refundHandBab(combatant, actionEconomySpent.hand, actionEconomySpent.babSpent)` — a `null` value (action was `free: true`, or combat wasn't active when it was spent) means there's nothing to refund, and the click reverses damage only
- Emits `undoDealDamage` (mirrors `dealDamage`'s payload) so anything that reacted to the original `dealDamage` (e.g. a future life-drain effect) gets a chance to reverse itself too
- Sets `flags.dnd35e.resolutionCard.undone = true` and re-renders the card ("Undone — N damage reversed, action(s) refunded"); the button then disables — undo is one-shot, not a full reset back to an editable state (there never was one — damage auto-applied on posting)

### Undo scope across combat chat cards

Only cards that mutate persistent state get an Undo button. The Attack card is a pure record of the raw roll — re-opening a resolved row isn't supported (Retargeting only touches *unresolved* rows), and it never itself mutates HP or action economy, so it gets no Undo. This phase adds Undo to exactly three card types, and in every case Undo reverses everything the card's original action changed, not just one part of it: the Resolution card (HP **and** the attacker's action economy together, above — since damage now auto-applies as part of that same card instead of a separate Damage card), the Move Action Spent card (action economy **and** the token's physical position together, §10.6), and the Ammo Recovery card (every recovered item's quantity increment **and** the cleared combatant tallies together, §10.9). All three follow the same shape: a `data-action="undo-*"` button, same visibility gate as the card's original commit action, a stored `undone`/terminal flag preventing re-use, and a delta-based reversal rather than a snapshot restore.

---

## §10.8 Chat Card

The two-card Attack → Resolution chain is described in §10.7's "GM-gated attack resolution" — mirroring `buildSaveCard()`'s precompiled-Handlebars pattern (**not** the old `renderTemplate()` server-fetch approach, removed by the Vue migration). This section covers each card's content and template.

### Attack card content
- Attacker name + weapon name
- Attack roll: formula + dice result + total (modifier breakdown via `appendModifierBreakdown()`)
- One row per target: name + status ("Pending" / "Hit" / "Miss" once resolved) + an **Apply** button (`data-action="apply-attack"`, disabled/hidden once that row is `resolved`)
- A **Change Target(s)** button (`data-action="retarget"`, GM-only) that re-syncs the unresolved rows to the GM's current canvas target selection (§10.7's "Retargeting")

```typescript
// src/dice/rollMessages.mts — sibling of buildSaveCard()
export async function buildAttackCard(
  context: UseActionContext,
  attackRoll: D20Roll,
  result: ActionResult,
  targets: ActorDnd35e[],
  pending: { resolvedDamageFormula: string | null; damageBonusTerm: string; critMultiplier: number; isCriticalThreat: boolean }
): Promise<ChatMessage> {
  const template = await getTemplate('attack-roll-card'); // precompiled .hbs?raw + Handlebars.compile({ preventIndent: true })
  const content = template({
    actorName: context.actor.name,
    weaponName: context.item.name,
    attackRoll,
    result,
    targets: targets.map(t => ({ targetId: t.id, targetName: t.name, resolved: false })),
  });
  const finalContent = appendModifierBreakdown(content, attackRoll);

  return attackRoll.toMessage({
    content: finalContent,
    speaker: ChatMessage.getSpeaker({ actor: context.actor }),
    flags: {
      dnd35e: {
        attackCard: {
          actorId: context.actor.id,
          itemId: context.itemId,
          actionId: context.actionId,
          weaponName: context.item.name,
          damageType: context.action.damage?.type ?? null,
          attackTotal: attackRoll.total,
          nonLethal: result.nonLethal ?? false,
          hand: context.hand ?? null,
          // Filled in by useAction() right after this card posts, once the action economy has actually
          // been spent (§10.7 "Undo (resolution card)") — null for a `free: true` action, since there's
          // nothing to refund. Threaded onto the Resolution card so its Undo button can reverse both
          // the damage *and* the spend in one click.
          actionEconomySpent: null as { standardActionSpent: boolean; hand: 'main' | 'off'; babSpent: number } | null,
          targets: targets.map(t => ({ targetId: t.id, resolved: false, hit: null })),
          // Snapshotted from the action at post time (§10.7 "Action Chain") — advanceActionChain()
          // resolves the action instance back through actionUuid rather than a stored object reference,
          // and stepId is fixed to whatever chain[0].actionId was when the card posted.
          actionUuid: buildActionChainId(context.actor, context.action),
          stepId: context.action.chain[0]?.actionId ?? 'damage',
          ...pending,
        },
      },
    },
  });
}
```

Template: `src/dice/templates/attack-roll-card.hbs` (naming matches `save-roll-card.hbs`).

### Resolution card content
- Attacker name + target name + weapon name
- Final defended AC (or touch AC, or "No Check") the attack was resolved against, and the roll mode used
- Which Combat Status/Overrides toggles applied (e.g. "Flanking, Total Defense") — a compact summary, not the full dialog re-rendered
- Concealment miss-chance roll result, if a concealment percentage was set ("Concealment: rolled 62, needed >20 — hit stands")
- Hit/Miss verdict (and crit-confirmed indicator, if applicable)
- On a hit: the damage roll (formula + dice result + total, already reflecting Apply Half Damage if checked), tagged "(Nonlethal)" when applicable, and "Applied: N damage" — damage is already applied by the time this card renders, there is no separate editable-total/Apply step
- **Undo** button (`data-action="undo-resolution"`), shown only when a hit actually applied damage, enabled only for the GM or the target's owner; reverses the damage **and** refunds the attacker's spent action economy (standard action + hand BAB, if any was spent — see §10.7) together in the same click; once clicked, shows "Undone — N damage reversed, action(s) refunded" and disables (one-shot, see §10.7)

```typescript
// src/dice/rollMessages.mts — sibling of buildAttackCard()
export async function buildResolutionCard(
  actor: ActorDnd35e,
  target: ActorDnd35e,
  attackCard: AttackCardFlags,
  dialogResult: RollDefenseDialogResult,
  outcome: { hit: boolean; criticalHit: boolean; effectiveAc: number },
  damageRoll: DamageRoll | null
): Promise<void> {
  let appliedAmount: number | null = null;
  if (outcome.hit && damageRoll) {
    appliedAmount = damageRoll.total;
    await target.takeDamage(appliedAmount, { damageType: attackCard.damageType, nonlethal: attackCard.nonLethal, source: actor });
  }

  const template = await getTemplate('resolution-card');
  const content = template({
    actorName: actor.name,
    targetName: target.name,
    weaponName: attackCard.weaponName,
    attackTotal: attackCard.attackTotal,
    dialogResult,
    outcome,
    damageRoll,
    appliedAmount,
  });

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor: target }),
    flags: {
      dnd35e: {
        resolutionCard: {
          actorId: actor.id,
          targetId: target.id,
          hit: outcome.hit,
          nonlethal: attackCard.nonLethal,
          appliedAmount,
          // Carried straight through from the attack card (§10.8) so Undo can refund the attacker's
          // spend without needing to re-look-up the original attack — null when the action was free
          // or the attack card's spend hadn't landed yet for some reason; either way, nothing to refund.
          actionEconomySpent: attackCard.actionEconomySpent,
          undone: false,
        },
      },
    },
  });
}
```

Template: `src/dice/templates/resolution-card.hbs`. The `renderChatMessageHTML` hook registers three delegated click handlers (alongside the Move Action Spent card's existing `undo-move-action` handler, §10.6): `data-action="apply-attack"` (reads `flags.dnd35e.attackCard`, calls `advanceActionChain()`, which resolves the acting action instance via `actionUuid` and calls its own `continue(stepId, ...)` — `'damage'` for every poc.10 weapon action, §10.7), `data-action="retarget"` (re-syncs unresolved rows to `game.user.targets`), and `data-action="undo-resolution"` (reads `flags.dnd35e.resolutionCard`, reverses `appliedAmount` via `target.takeDamage(-appliedAmount, ...)`, emits `undoDealDamage`, refunds the attacker's `actionEconomySpent` via `refundStandardAction()`/`refundHandBab()` when present, sets `undone = true`).

---

## §10.9 Ranged Attacks & Ammo

### Ammo item type


New `Ammo` physical item type (extends `PhysicalItem` directly, not `EquippableItem` — ammo isn't worn/wielded): stackable `quantity`, `ammoType` (e.g. `arrow`/`bolt`/`bullet`, matched against an action's `range.ammoType`), and `alwaysRecoverable: boolean` (default `false`) — set on ammo that doesn't follow the normal hit-destroys/miss-50% rule (blunt training bolts, a homebrew "returning" enchantment, etc.): every shot fired with it, hit or miss, is tracked as retrievable and comes back in full at recovery time, skipping the d100 roll described below.

### Container item-type filtering, Quiver, and currency toggle

Generalizes item-type restriction into a reusable Container capability rather than folding everything into a single flag: `ContainerSystemModel` gains three independent fields.

**`allowedItemTypes: string[] | null`** (nullable `SetField` of `StringField`, `choices: PHYSICAL_ITEM_TYPES`, `initial: null`) — what item *types* may be stowed:

- `null` (default) — unrestricted; any physical item type can be stowed. Unchanged behavior for every existing/ordinary Container (backpack, chest)
- `[]` — **None**: no items at all
- e.g. `['ammo']` — restricted allow-list: only items whose `type` is in the set may be stowed (a weapon rack would be `['weapon']`, an armor stand `['armor']`, once those item types exist)

`Container.canAddItemToContents(item)` — already the single gate `syncContainmentAe()` checks before moving an item in — gains the type check alongside its existing weight check: `this.system.allowedItemTypes === null || this.system.allowedItemTypes.includes(item.type)`.

**`isQuiver: boolean`** (default `false`) — restored as its own independent flag, not derived from `allowedItemTypes`: marks this container as ammo-quick-access-eligible for the Attack Roll Dialog's ammo picker (§10.9's "Ammo eligibility" below). A compendium **Quiver** item is just an ordinary `Container` with `isQuiver: true` — no new item type, no composition-chain change. The common (but not enforced) pairing is `isQuiver: true` alongside `allowedItemTypes: ['ammo']`, but the two fields are independent: a GM can flag any container as quiver-eligible regardless of its type filter, or restrict a container to ammo-only without flagging it as a quiver.

**`allowsCurrency: boolean`** (default `true`) — whether this container can hold coins at all, independent of `allowedItemTypes` (which only ever governs embedded *items*, never `containedCurrency`). Unchecking it disables the Inventory tab's `CoinageFormGroup` entirely — a container fully dedicated to a single item type (a quiver, a weapon rack) with no coin slot.

**Content warning**: when `allowedItemTypes` is `[]` (None) AND `allowsCurrency` is `false`, the container can't hold anything at all — a misconfiguration, not a valid "empty on purpose" state. `Container._prepareDerivedItemData()` pushes a `PreparationWarning` (§10.14 Story H's severity split — classified `warning`, not a blocking `alert`) in this case: "This container can't hold anything — item storage is set to None and coin storage is disabled."

**Container sheet** (`ContainerCapacity.vue`, alongside the existing `maxContentWeight`/`contentsAreWeightless` fields): a `MultiOptionToggle` "Contents" control (All / None / Specific Types) driving `allowedItemTypes` (`null` → All, `[]` → None, non-empty → Specific, which reveals a `MultiSelectFormGroup` checklist of `PHYSICAL_ITEM_TYPES`), plus two independent checkboxes: "Is Quiver" (`isQuiver`) and "Allow Currency" (`allowsCurrency`).

### Ammo eligibility & the item-contribution route

`Ammo` items contribute themselves into a new derived array, `system.attacks.ammoOptions`, on the carrying actor — via the same no-backing-document "item contribution" route `PhysicalItem`/`EquippableItem` already use for carried-weight/equipped-status contributions (`ItemDnd35e.getContributedActorChanges()`; conceptually the same "item announces something about itself to its holder" shape as `Container`'s containment-AE pattern, just without a persisted AE document). `Ammo.getContributedActorChanges()` pushes a `system.attacks.ammoOptions` entry (`{ itemUuid, name, ammoType, quantity }`) for itself whenever it's eligible:

- **Eligible**: `isCarried === true` AND (`containerUuid === null` — carried loose, not in any container) OR (the container at `containerUuid` has `system.isQuiver === true`).
- **Not eligible**: carried but nested inside a non-quiver container (a locked chest, an unrestricted backpack) — not quick-access enough to draw from mid-combat. Must be moved out (or into a Quiver) first.

### Ammo selection in the Attack Roll Dialog

When the acting action has a non-null `range.ammoType`, the Attack Roll Dialog (Story D) adds an Ammo select field listing every `system.attacks.ammoOptions` entry whose `ammoType` matches — a character carrying both silver and regular arrows sees both and picks one before rolling. Auto-selects the sole eligible entry with no picker shown when only one type is present; blocks the attack with a warning when none are eligible.

### Ammo consumption & range penalty

- Range increment penalty: `-2` per full increment beyond the first, using the existing `weaponDamage.rangeIncrement` field (unchanged from §10.5's reach-check sibling logic, just distance-based instead of a reach threshold).
- On a ranged/thrown action with a non-null `range.ammoType`: decrement 1 from the **selected** `Ammo` item's quantity per attack attempt (consumed on **both** hit and miss, per SRD). The attack card (§10.8) also stores which ammo was consumed (`{ itemUuid, name }`) so the resolution step below knows what to track.
- Thrown weapons that are also melee weapons (e.g. a dagger's "Throw" action, `range.ammoType: null`) consume the weapon item's own quantity instead of a separate `Ammo` item — throwing it away rather than pulling from a quiver, and skip the Ammo select field entirely (nothing to pick). Not part of the recovery tracking below — only true `Ammo` items are tracked.
- `noAmmoRequired` (existing `WeaponSystemModel` field) skips consumption and hides the Ammo select field entirely for weapons that don't track ammo.

### Ammo recovery (post-combat)

SRD allows a portion of expended ammunition to be recovered after a fight: ammunition that hits its target is destroyed and unrecoverable, while ammunition that misses lands somewhere retrievable — even odds (50%) of actually being found and reusable, checked per shot. poc.10 tracks this per-combatant, per-ammo-stack, resolved by a GM-triggered chat card rather than an automatic reset — a fight rarely leaves time to search the battlefield mid-combat.

**Tracking a miss**: `ActionDataModel#continue()` (§10.7), right after `evaluateDefense()` resolves `hit`, checks the attack card's stored `ammo` reference (set above, at the same point consumption already decremented the item's quantity). Tracking only ever applies to party members — `system.settings.isPartyMember === true` on the attacker's actor; an NPC's expended arrows aren't worth bookkeeping and never generate a recovery entry. For an eligible attacker, when `!hit || ammo.alwaysRecoverable`, it calls `recordRetrievableAmmo(combatant, ammo.itemUuid, ammo.name, ammo.alwaysRecoverable)` on the attacker's combatant. A hit's ordinary ammo is gone — nothing is recorded — but `alwaysRecoverable` ammo is recorded regardless of the hit/miss verdict. `combatantAmmoTracking.mts` (new, sibling to `combatantActionEconomy.mts`) stores the running tally as combatant flags — `flags.dnd35e.retrievableAmmo: Record<string, { name: string; count: number; alwaysRecoverable: boolean }>`, keyed by the `Ammo` item's UUID — surviving turn/round resets (unlike `actionEconomy`, this only clears when explicitly resolved by the recovery flow below).

**Triggering it**: rather than a Combat Tracker button the GM has to remember to click before the encounter disappears, recovery is surfaced entirely through chat, the same way every other GM-facing action in this phase is (Attack/Resolution/Move Action cards) — no Combat Tracker UI, no Spike 2 dependency. A `preDeleteCombat` hook (Foundry's standard pre-delete hook, fires whenever a Combat document is about to be deleted — whether via the tracker's End Combat control or a GM deleting it directly) checks every combatant for a non-empty `retrievableAmmo` tally — populated only for party members, per the tracking gate above — and, if any exist, posts an **Ammo Recovery** prompt card *before* the Combat (and its Combatants, and their flags) actually disappears. The card snapshots everything it needs directly into its own message flags (`flags.dnd35e.ammoRecoveryCard = { entries: [{ combatantName, itemUuid, name, count, alwaysRecoverable }], resolved: false }`) — once posted, it no longer depends on the Combat or Combatant documents existing at all, so the GM can click it whenever they get around to it, long after the encounter is gone.

`buildAmmoRecoveryCard(combat)` (`src/dice/rollMessages.mts`, sibling to `buildResolutionCard()`) builds that snapshot from the combat's combatants and posts the card with a **Recover Ammo** button (`data-action="recover-ammo"`, GM-only). Clicking it resolves the same message in place (mirroring the Attack card's per-row Pending → Hit/Miss update, not a second separate message): for each snapshotted entry, an `alwaysRecoverable` entry skips the roll entirely and recovers its full `count` outright; every other entry rolls `${count}d100` — one die per outstanding arrow, exactly the "50% chance per individual arrow" rule — counting results `<= 50` as recovered. Either way the recovered count is applied immediately (the `Ammo` item's `system.quantity` incremented via `fromUuid(itemUuid)`, still resolvable after the Combat is gone since `Ammo` items live on the actor, not the combat), and the card re-renders showing "N of M recovered" per entry (always `M` of `M` for `alwaysRecoverable` rows) plus `resolved: true`. An **Undo** button (`data-action="undo-ammo-recovery"`, GM-only) then appears in place of Recover Ammo, since this mutates persistent item quantities the same way the Resolution and Move Action cards do (§10.7's "Undo scope across combat chat cards" — now three, not two, Undo-eligible card types): reverses every applied quantity increment and sets a terminal `undone` flag, in one click.

Template: `src/dice/templates/ammo-recovery-card.hbs`.

---

## §10.10 Attacks of Opportunity

### provokes-driven detection

AoO is **not** "left a threatened square" — it's "took a `provokes: true` action while in/passing through a threatened square." `provokes` lives on movement actions (§10.6) and on `ActionDataModel` entries (§10.3) — ranged/thrown actions default `provokes: true` when the attacker is within an enemy's reach at the moment of the attack (checked via the same `isWithinReach()` helper from §10.5, evaluated from the reactor's side).

Two trigger points, both reusing existing infrastructure — no new hooks:
- **Movement** — folds into `_onUpdateMovement()` (§10.6): a `provokes: true` movement action completing while in/through a threatened square.
- **Ranged/thrown attacks while threatened** — folds into `useAction()`/`executeAction()` (§10.7): checked before the attack roll.

### Asymmetric visibility — client-authority model, no new socket infra

No `socketlib`/GM-relay mechanism exists in this codebase (only a broadcast-only redraw event). Reuses the same client-authority shape already proven by `_onUpdateMovement()`'s Prone toggle (logic runs on every client, Foundry's document-permission model gates who can actually act):

- The reacting combatant's **owner** (or GM for NPCs) evaluates full eligibility locally — their own `actionEconomy.actions.aoo`, reach, everything.
- If eligible, **only that owner's client** gets an interactive "Take an AoO? Which attack?" prompt.
- The **mover's own client** only ever sees a generic, non-specific warning ("you're leaving a threatened square") computed from public info (an enemy token's reach + position, never their AoO count).

The granted AoO attack executes via `actor.useAction(itemId, actionId, targetId, { free: true })` (§10.7's bypass) and spends 1 from `actionEconomy.actions.aoo` (refilled from `actor.system.aooCount` at turn start, §10.1).

### GM manual override

Explicitly deferred — no veto/force UI in poc.10; design for automation now, add escape hatches once real play surfaces what's actually needed. Worth flagging early as a likely follow-up: a GM overriding an auto-detected call ("no, that doesn't provoke" / "yes, take the AoO anyway") is a reasonable ask once real play surfaces a case the automation gets wrong — but that veto/force UI is its own small feature, easy to let snowball into more scope than this phase needs, so it stays a documented risk rather than a poc.10 deliverable.

### Threatened-square highlighting

On token selection (`controlToken` hook): highlight every square threatened by any enemy token in **orange**, visible to everyone. GM view additionally highlights in **red** any threatened square where the threatening creature's `actionEconomy.actions.aoo > 0` (i.e. could actually act on it right now). Gated by the existing `THREATENED_SHOW_SQUARES` GM setting; uses `SIZE_REACH` for the threat computation. Exact Foundry v14 grid-highlight API is the first task of **Story G** (§10.14) — fallback: custom canvas layer with simple colored square overlays.

### Flanking-bonus square highlighting (green)

Same `controlToken` hook, same highlight layer, a third color: **green** squares are those where moving the *selected* token would grant it the SRD flanking bonus (+2 on melee attack rolls) against an enemy, because an ally is already positioned on the directly-opposite side (or opposite corner, for the enemy's space) of that square. Computed per selected token, not globally:

1. For each enemy token adjacent to (threatening range of) any allied token other than the selected one, compute the enemy's "opposite side" square(s) relative to that ally's position.
2. Highlight those square(s) green if the selected token could occupy them (adjacency to the enemy, normal movement rules — no new pathing logic, just geometry).
3. If the selected token is *already* in a flanking position with an ally, highlight its own current square green too (visual confirmation flanking is already active), reusing the same opposite-corner check.

**The flanking bonus itself (+2 to-hit) is in scope for poc.10** — it's a straightforward `check.formula` situational modifier (§10.2's formula-based situational-modifier design), not a new mechanic: when `executeAction()` resolves the check formula, it evaluates `isFlanking(attacker, target)` (the same opposite-side/opposite-corner geometry the highlight uses) and folds `+2` into the roll when true. This reuses existing infrastructure rather than adding new scope — the highlight is a visualization of a check the attack roll is already going to make. Extended flanking abuse-prevention (e.g. Improved Uncanny Dodge negation) is out of scope, deferred alongside other flanking-sensitive feats/abilities.

Gated by the same `THREATENED_SHOW_SQUARES` setting as the orange/red highlight (no separate setting) — folded into Story G's render-API task, since it's the same overlay mechanism with a third color.

---

## §10.11 Sheet & Canvas (HUD) Triggers

### Token HUD attack-trigger row

A new bottom row of controls on the token, alongside Foundry's existing left/right HUD columns — not reusing the right column's Movement Action control, but following the same interaction pattern: a single button that expands into a list on click, rather than one HUD-row button per weapon. Two controls in this row:

- **Weapon Attacks** — expands to one entry per eligible weapon action from `system.attacks.actions` (§10.3/§10.4), plus the always-available generic "Throw" action (§10.4). Eligibility per entry: `item.system.isCarried && (item.system.isEquipped || action.requiresEquipped === false)` — not-carried items never contribute an entry. A dual-wielding character sees separate entries for the main-hand and off-hand actions. Entry enabled state: `canUseHandAttack(combatant, wieldModeToBabHand(detectWieldMode(actor, item)))` (§10.1/§10.3). Selecting an entry targets the current target (or prompts to pick one) and calls `actor.useAction(itemId, actionId, targetId)`.
- **Combat Maneuvers** — this phase, expands to a single entry: **Total Defense** (§10.7). Real maneuvers (trip/grapple/bull rush/etc.) aren't implemented until alpha.3 (§10.3's Files table, Scope boundaries); establishing the row's two-button layout now means alpha.3 only has to add entries to this list, not add a new HUD control.

### Sheet weapon-row trigger

```vue
<button v-if="weapon.system.isCarried" type="button" class="field-control-btn" @click="onAttack(weapon.id)">
  <i class="fas fa-sword" />
</button>
```

Unlike the HUD row, the sheet button shows for **every carried weapon action regardless of equip-slot state** — covers spare/off-hand weapons sitting in inventory, not just what's currently wielded. Still gated on `isCarried`: an item left behind gives no attack button anywhere.

### Character sheet: repurpose the Combat tab into an Actions tab

The Character sheet's existing `combatTab` (`CombatTab.vue`, id `combat`, label `dnd35e.ACTOR.tab.Combat`) is presently a stub: `AttackBonusSection.vue` shows hardcoded placeholder `+0`/`10` values for BAB, Melee/Ranged Attack, CMB, and CMD, and `WeaponsSection.vue` renders a static "No weapons equipped" table with a disabled add button — none of it is wired to real data.

This tab is repurposed into the Actions tab:
- Rename/relabel: `id: 'actions'`, `label`/`tooltip: 'dnd35e.ACTOR.tab.Actions'` (or similar), icon updated if `fa-shield-halved` no longer fits
- **Delete `AttackBonusSection.vue` entirely.** BAB/Melee/Ranged Attack were always a stub duplicate of what `CombatAttributes.vue` (Attributes tab, `system.bab.total`) already displays properly. CMB/CMD are a Pathfinder-only concept — 3.5e's SRD has no unified maneuver-bonus/defense stat; each combat maneuver (grapple, trip, bull rush, disarm) resolves as its own opposed roll built from BAB + Str/Dex mod + size modifiers, so there's no static value to host anywhere yet. When alpha.3 adds combat maneuvers, each maneuver check gets its own formula/roll at that point (likely surfaced on the Actions tab alongside weapon attacks, since a maneuver is itself a kind of action) — not a revived `AttackBonusSection.vue`.
- Build out `WeaponsSection.vue` for real: one row per carried weapon action (name, resolved attack/damage/crit/range/type from `ActionDataModel`), with the sheet attack-trigger button from this section wired to `actor.useAction()`



```typescript
async function onAttack(itemId: string): Promise<void> {
  const targetToken = game.user?.targets?.first() ?? null;
  if (!targetToken && game.combat?.started) {
    ui.notifications.warn(game.i18n.localize('DND35E.COMBAT.selectTargetFirst'));
    return;
  }
  const defaultAction = store.actor.items.get(itemId)?.system.actions?.[0];
  if (!defaultAction) return;
  await store.actor.useAction(itemId, defaultAction.id, targetToken?.actor?.id);
}
```

### Movement-action provokes badge

A caution icon badge on the movement-action HUD label when that action's `provokes` is `true` and `game.combat?.started`. Exact render point is the first task of **Story B** (§10.14) — fallback: DOM injection via a render hook, mirroring the tracker fallback.

---

## §10.12 Open Decisions

All open decisions from the initial spec have been resolved and folded into the relevant sections above:

1. GM manual AoO override UX — §10.10 "GM manual override"
2. `AttackBonusSection.vue` / CMB-CMD — §10.11 "Character sheet: repurpose the Combat tab into an Actions tab"
3. Off-hand/two-handed STR scaling + formula math — §10.3 "Wield mode & STR bonus scaling"
4. Undo semantics for the Resolution card and Move Action card — §10.6 "Move Action Spent chat card" and §10.7 "Undo (resolution card)" / "Undo scope across combat chat cards"
5. FormulaFamiliar preferred-alias support — §10.7 "FormulaFamiliar context aliasing"
6. `PLAYER_SELF_DEFENSE` default — §10.7 "GM-gated attack resolution"
7. Multi-target flanking / target capping — §10.3's `maxTargets` field and §10.7 "executeAction()" / "Retargeting"

---

## §10.13 Files to Create / Modify

### New files
| File | Description |
|------|-------------|
| `src/documents/combat/combatant/CombatantDnd35e.mts` | Custom Combatant class (no system model) |
| `src/documents/combat/combatant/combatantActionEconomy.mts` | Flags-based action economy module (§10.1), incl. `refundMoveAction()`/`refundStandardAction()`/`refundHandBab()` undo primitives and `markChargedThisTurn()` (§10.6, §10.7) |
| `src/documents/combat/combatant/combatantAmmoTracking.mts` | Flags-based `retrievableAmmo` tally module (§10.9): `recordRetrievableAmmo()`, `getRetrievableAmmo()`, `clearRetrievableAmmo()` |
| `src/documents/items/physical/weapon/data/ActionDataModel.mts` | `ActionDataModel` base + `MeleeWeaponAttack`/`RangedWeaponAttack`/`ThrownWeaponAttack` subtypes + `ActionChainLinkModel`, dispatched via `TypedSchemaField` (co-located with `Weapon`; weapon-only per §10.3); base class implements the public `executeAction()` interface method (§10.7) shared by all three subtypes this phase |
| `src/documents/items/physical/weapon/logic/weaponActionSync.mts` | Auto-create/auto-delete sync for `MeleeWeaponAttack`/`RangedWeaponAttack`/`ThrownWeaponAttack` on `weaponSubtype`/`properties` changes — sibling pattern to `masterworkAe.mts`'s `syncMasterworkAeState()` (§10.3) |
| `src/constants/weapons/weaponProperties.mts` | `WEAPON_PROPERTY_*` constants (`finesse`, `reach`, `threatensAdjacent`, `thrown`, `nonLethal`, `nonLethalNoPenalty`) + `WEAPON_PROPERTIES` choices array (§10.3) — alpha.3 extends this with the remaining 11 |
| `src/documents/items/physical/ammo/` | New `Ammo` item type (model, data, sheet); `getContributedActorChanges()` pushes `system.attacks.ammoOptions` entries
| `src/documents/combat/CombatDnd35e.mts` | Custom Combat class; `_onStartTurn()` override resets action economy on turn advance, `_onStartRound()` override auto-applies Flat-Footed on combat's first round (§10.1) |
| `src/documents/combat/CombatTrackerDnd35e.mts` | Custom `CombatTracker` (or template/hook injection, per Spike 2's verdict): action pips (§10.2) |
| `src/dice/templates/ammo-recovery-card.hbs` | Ammo Recovery chat card template (§10.9): unresolved (Recover Ammo button) and resolved (per-entry expended/recovered rows + Undo button) states of the same message |
| `src/canvas/token/hud/` | Token HUD bottom row: Weapon Attacks (expandable list of weapon actions + Throw) and Combat Maneuvers (single Total Defense entry this phase; alpha.3 adds real maneuvers) controls |
| `src/canvas/token/logic/threatenedSquares.mts` | Threatened-square (orange/red) + flanking-square (green) highlight computation, incl. `isFlanking()` geometry helper |
| `src/canvas/token/logic/highGround.mts` | `isOnHigherGround(attackerToken, targetToken)` — compares `TokenDocument#elevation` against `HIGH_GROUND_ELEVATION_SQUARES` (§10.7), converted via the same `convertToLocalizedDistance()` helper `isWithinReach()` uses |
| `src/dice/templates/attack-roll-card.hbs` | Attack chat card template |
| `src/dice/templates/resolution-card.hbs` | Resolution chat card template (§10.7/§10.8): final hit/miss verdict + applied Combat Status/Overrides summary + damage roll (auto-applied on a hit) + Undo button |
| `src/dice/templates/move-action-card.hbs` | Move Action Spent chat card template (§10.6): shows consumed action(s)/over-budget warning + Undo button |
| `src/dice/DamageRoll.mts` | New `DamageRoll` class (sibling of `D20Roll`; pushed back from Phase 7) |
| `src/dice/RollDefenseDialogConfig.mts` / `RollDefenseDialogApp.vue` | New defender-side dialog (sibling of `D20RollDialogConfig`/`D20RollDialogApp.vue`): Combat Status + Overrides checklists, Concealment formula field, Covered `MultiOptionToggle`, Situational Bonus formula field (§10.7), check-mode `MultiOptionToggle` (Normal/Touch/No Check) + Defend submit button |
| `src/documents/actors/creature/logic/combatConditionAEs.mts` | `applyChargedAE()`, `applyDefensiveFightingAE()`, `createShortDurationAE()` shared helper, plus the Total Defense special-action AE (§10.7) |

### Modified files
| File | Change |
|------|--------|
| `src/constants/sizes.mts` | Add `SIZE_REACH` constant |
| `src/canvas/token/logic/movementActionGating.mts` | Add `fiveFootStep`/`withdraw`/`charge` actions + `provokes` flag on all movement actions; `charge` gated by new `canSelectChargeMovementAction()` (combat-only) and straight-line-restricted the same way as `run` (`TokenDnd35e#_addDragWaypoint` refuses intermediate waypoints, §10.6) |
| `src/canvas/token/logic/movementBudget.mts` | Extend `ACTION_TO_SPEED_KEY`/`ACTION_SPEED_MULTIPLIER` with `charge: 'land'` / `charge: 2` (and `withdraw`'s matching entries, if not already present) — both double land speed, identical shape to `run`'s existing 4x entry (§10.6) |
| `src/documents/scene/tokenDocument/TokenDocumentDnd35e.mts` | Extend `_onUpdateMovement()` for action-economy consumption + AoO movement trigger |
| `src/dice/rollMessages.mts` | Add `buildAttackCard()` (multi-target, §10.8), `buildResolutionCard()` (auto-applies damage on a hit), `buildInitiativeCard()`, `buildMoveActionCard()`, `buildAmmoRecoveryCard()` (§10.9, posted from a `preDeleteCombat` hook), `advanceActionChain()` (§10.7) + the `renderChatMessageHTML` click handlers for `apply-attack`, `retarget`, `undo-resolution`, `undo-move-action`, `recover-ammo`, `undo-ammo-recovery` |
| `src/documents/actors/creature/Creature.mts` | Add `rollInitiative()` |
| `src/documents/actors/baseActor/ActorDnd35e.mts` | Add `useAction()` (calls the acting action's own `executeAction()` — never attack-specific logic directly) + `detectWieldMode()` + `getWieldModeStrTerm()` + `wieldModeToBabHand()` |
| `src/documents/items/physical/weapon/data/WeaponSystemModel.mts` | Add `actions`: `ArrayField(TypedSchemaField({melee, ranged, thrown, custom}))` holding all system-created and custom actions (§10.3), add `properties` `SetField` (§10.3); change `weaponDamage.critRange` from `StringField` to `NumberField` (integer, min 2, max 20, initial 20); add `weaponDamage.autoScaleDamage` `BooleanField` (initial `true`) (§10.4 "Threat range becomes a number" / "Weapon damage scaling by size") |
| `src/documents/items/physical/weapon/data/constants.mts` | Add `twoHandedRanged` to `WEAPON_SUBTYPES`/`WEAPON_SUBTYPE`/`WEAPON_SUBTYPE_LOCALIZED` — distinguishes weapons requiring both hands at range (longbow, heavy crossbow) from one-handed ranged weapons; drives the Melee⇄Ranged action auto-swap (§10.3) |
| `src/documents/items/physical/weapon/Weapon.mts` | Add `getContributedActorChanges()` override that live-merges weapon-shared fields (attack/damage formula, crit range, etc.) onto its own system-created `system.actions` entries via targeted per-action change keys (§10.4 — the entries themselves are seeded/synced separately by `weaponActionSync.mts`, not built inline here); add `_preCreate()` to default `designedForSize` to the parent actor's `system.size` when embedded directly on an Actor (§10.4) |
| `src/documents/items/physical/equippableItem/EquippableItem.mts` | Implement the existing `_buildEquippedChanges()` stub (§10.3) |
| `src/documents/items/physical/equippableItem/events/equipped.mts` | Add a poc.10 listener on `itemEquipped`/`itemUnequipped` that spends a move action (`spendMoveAction()`) whenever `game.combat?.started` (§10.3) |
| `src/documents/items/physical/weapon/sheet/` | New Actions tab component listing all actions (system-created and custom, all editable); a `systemCreated` badge marks auto-managed entries; "New Action" button appends a blank custom action pre-filled with FormulaFamiliar references into the weapon's live data, not copied literals (§10.3) |
| `src/constants/conditions.mts` / combat-start hook | Flat-footed auto-apply on combat start; new `SQUEEZING_CONDITION_ID`, `CHARGED_CONDITION_ID`, `DEFENSIVE_FIGHTING_CONDITION_ID`, `TOTAL_DEFENSE_CONDITION_ID` conditions (icon-only, same pattern as Prone) |
| `src/documents/actors/creature/sheet/tabs/CombatTab.vue` | Repurpose/relabel as the Actions tab |
| `src/documents/actors/creature/sheet/tabs/sections/combat/WeaponsSection.vue` | Build out for real: live weapon/action rows + attack-trigger button |
| `src/documents/actors/creature/sheet/tabs/sections/combat/AttackBonusSection.vue` | Delete entirely — CMB/CMD is a Pathfinder-only concept with no 3.5e SRD equivalent (each combat maneuver is its own opposed roll, not a unified stat); BAB/Melee/Ranged Attack already live in `CombatAttributes.vue` |
| `src/documents/actors/creature/sheet/tabs/index.mts` | Update `combatTab` id/label/tooltip for the Actions tab |
| `src/documents/actors/creature/data/CreatureSystemModel.mts` / `CreatureSystemData.mts` | Flatten `system.init` (drop `.total`); add `system.attacks.ammoOptions` and `system.attacks.actions` derived arrays (§10.3/§10.4) |
| `src/documents/items/physical/container/data/ContainerSystemModel.mts` | Add `allowedItemTypes: string[] \| null` (nullable `SetField`, `choices: PHYSICAL_ITEM_TYPES`, default `null`), `isQuiver: boolean` (default `false`), `allowsCurrency: boolean` (default `true`) fields (§10.9); `canAddItemToContents()` gains the type-allow check alongside its existing weight check; `_prepareDerivedItemData()` pushes a `PreparationWarning` when `allowedItemTypes` is `[]` and `allowsCurrency` is `false` |
| `src/documents/items/physical/container/sheet/components/ContainerCapacity.vue` | Add "Contents" `MultiOptionToggle` (All/None/Specific Types) + conditional `MultiSelectFormGroup` for `allowedItemTypes`, plus "Is Quiver" and "Allow Currency" checkboxes (§10.9) |
| `src/documents/items/physical/container/sheet/tabs/ContainerInventory.vue` | Hide `CoinageFormGroup` when `system.allowsCurrency` is `false` (§10.9) |
| `src/documents/actors/creature/sheet/tabs/sections/attributes/CombatAttributes.vue` | Update `system.init.total` → `system.init` field-path |
| `src/dice/D20RollDialogConfig.mts` / `D20RollDialogApp.vue` | Situational modifier becomes a formula input, calling `buildDocumentFamiliar(actor)` directly for FormulaFamiliar — same pattern as `FormulaSettingsGroup.vue` (§10.2); add optional `combatModifiers` checklist split into two sections — Attack Type (Charge/Defensive Fighting/Non-lethal) and Combat Status (Flanking/High Ground/Squeezing/Prone auto-detected, Proficient manual) — each toggle rendering a help-icon tooltip; add a separate `damageBonus` formula field, a Wield Mode `MultiOptionToggle` (Primary Hand/Off-Hand/Two-Handed, auto-selected by `detectWieldMode()`, overridable), and a Hand select (Main/Off, shown for every attack action, auto-detected and always overridable, §10.3), reused by attack rolls (§10.7) |
| `src/helpers/formulae/utils.mts` / `FormulaData.mts` | `buildDocumentDataMap()`/`_buildFamiliarFromDocumentMap()` gain an optional preferred-alias override for the `self` context (§10.7's FormulaFamiliar aliasing) |
| `src/helpers/formulae/FormulaResolver.functionGrammar.mts` | Add `$floor`/`$ceiling`/`$round`/`$absolute` pre-processing functions (§10.3) — resolve their argument and, when it's already a plain number, compute the result locally like `$fromFeet`/`$fromKg` do; only re-emit `$`-stripped Math-proxy syntax (`ceil`/`abs`/etc.) for Foundry's native Roll grammar to evaluate later when real dice-term syntax remains unresolved |
| `src/documents/items/physical/weapon/logic/weaponDamageScaling.mts` | New: `scaleDamageDie(dieFormula, size)` plain TS helper (§10.4) — transcribes D35E's `sizeRoll()` size→die step table (`module/actor/entity.js`); called directly by `Weapon.getContributedActorChanges()`, not routed through FormulaFamiliar |
| `src/dice/D20Roll.mts` | Change `isCriticalThreat` from a no-arg getter (hardcoded natural-20) to `isCriticalThreat(threshold: number = 20): boolean` (§10.4); update the one existing call site in `rollMessages.mts`'s save card (uses the default) |
| `src/settings/combat/constants.mts` / `registration.mts` | Add `PLAYER_SELF_DEFENSE` setting key, default `true` during development with a `// TODO: flip to false before release` comment on the registration |
| `src/documents/document/preparationWarnings.mts` | Add `severity: 'alert' \| 'warning'` discriminator + GM upgrade/downgrade support (§10.14 Story H) |
| `system.json.template` / `registration.mts` | Register `CombatDnd35e` (`CONFIG.Combat.documentClass`), `CombatantDnd35e`, `Ammo` item type |
| `src/main.mts` (or init) | Register `CombatDnd35e`, `CombatantDnd35e`, event types, tracker |

---

## §10.14 Stories & Completion Checklist

### Spike 1 — Concealment auto-detection spike ✅ Resolved — **No-go**
**User**: Developer (research spike — no end-user-visible deliverable of its own)  
**Delivers**: "A written go/no-go verdict on auto-detecting concealment from a target token's actual lighting/vision state vs. the attacker's senses (darkvision, low-light, blindsense/blindsight), feeding the Roll Defense Dialog's Concealment formula field"  
**Routing**: Lead dev  
**Blocking**: Blocked nothing structurally — Story E's Concealment field ships fully manual regardless of this spike's outcome.

**Verdict (no-go)**: Auto-detecting a Concealment *percentage* from live lighting/vision state is not feasible with a supported, stable Foundry v14 client API. The Concealment field stays 100% manual for poc.10 — a plain formula/literal 0–100 input, no pre-fill. Full automation is deferred to the post-release Regions-based phase (`docs/migration-plan/post-release/phase-03-sight-concealment.md`).

**Rationale** (verified against the bundled v14 `.d.mts` type defs, not assumed):
- The only public "is this visible" surface is `CanvasVisibility#testVisibility(point, { object })` (`types/foundry/client/canvas/groups/visibility.d.mts`) — a **binary** result evaluated against whichever token(s) the *current viewing client* controls/observes, not a specific attacker. A GM opening the Attack Roll Dialog on a player's behalf would test the GM's own (often unrestricted) vision, not the attacker's — a false negative for exactly the case that matters.
- `DetectionMode#testVisibility(visionSource, mode, config)` (`detection-mode.d.mts`) could in principle target a specific attacker's `PointVisionSource`, but it's still binary detected/not-detected per detection mode — no notion of a graduated 20%/50% miss chance — and its `_testLOS`/`_testRange`/`_testAngle`/`_canDetect` internals are `protected`, not a sanctioned integration point.
- There is no public per-point light-level query. `canvas.environment.darknessLevel`/`canvas.board`'s `darknessLevel` (`environment.d.mts`, `board.d.mts`) are **scene-wide scalars**, not per-square. Real per-pixel illumination only exists inside rendered lighting/vision textures (`CanvasIlluminationEffects`, `DarknessLevelContainer`, `AdaptiveIlluminationShader`) — reading these back means sampling a WebGL render texture and reconstructing bright/dim/dark banding by hand, duplicating Foundry's internal lighting pipeline with no supported API and high cross-version breakage risk.
- Foundry v14 core already ships the real fix for this, just not as a query API: `AdjustDarknessLevelRegionBehaviorType` (`types/foundry/client/data/region-behaviors/adjust-darkness-level.d.mts`) lets a GM paint a Region with an explicit darkness-level override — a *declarative, GM-authored* concealment zone, not something inferred from raw light-source geometry. This is exactly the mechanism `post-release/phase-03-sight-concealment.md` already plans to build on (gated on Phase 24's Area Effects & Auras) — confirming this spike's scope is a strict subset of that later phase, not a separate problem to solve here.
- Blindsight/scent/tremorsense are already deferred sense mappings (`tokenVision.mts`, `WISHLIST.md`) — even a best-effort visibility check would still need those to correctly rule out concealment for a blindsighted attacker, compounding the scope further.

**Revision (still no-go for poc.10, but narrower reasoning)**: re-examined with a narrower question — not "give me a light-level percentage," but "is a point within any active light source's bright/dim radius." That part turns out to be genuinely supported: `canvas.effects.lightSources` (a `Collection<string, PointLightSource<AmbientLight | Token>>`, confirmed against the bundled v14.365 client source) covers both scene-placed `AmbientLight`s and token-carried lights in one collection. Each source exposes `source.active` (already `false` when suppressed by an overlapping darkness effect — `PointLightSource` calls `#updateDarknessSuppression()` before building its shape, so magical Darkness auto-disables a torch with no extra work), a public wall-aware `source.testPoint(point: ElevatedPoint): boolean` (`BaseEffectSource.testPoint`), `source.radius` (`= max(data.dim, data.bright)` in pixels), and `source.ratio` (`= clamp(abs(data.bright) / data.radius, 0, 1)`, computed in `PointLightSource._configure()` — so `radius * ratio` is the bright-radius in pixels). Together these give an exact, wall- and darkness-suppression-aware bright/dim/dark determination for a point:
  ```js
  let level = 'dark';
  for (const source of canvas.effects.lightSources) {
    if (!source.active) continue;
    if (!source.testPoint(point)) continue; // outside shape or wall-blocked
    const dist = Math.hypot(point.x - source.x, point.y - source.y);
    const brightRadiusPx = source.radius * source.ratio;
    level = dist <= brightRadiusPx ? 'bright' : (level === 'bright' ? level : 'dim');
  }
  ```
  This still isn't the full no-go's original ask — it tells you the *objective* light level at a point, not a specific attacker's ability to see through it. Combining that with a viewer's `senses` (darkvision/low-light/blindsight — `tokenVision.mts`/`lowLightVision.mts`/`senses.mts`) into an actual auto-concealment value is real, uninvestigated scope of its own. **Decision: still ships 100% manual in poc.10** — this finding is captured for the post-release phase instead of expanding this spike's scope (see `post-release/WISHLIST.md`).

**Verify**: ✅ Recorded verdict with rationale exists above. Story E's Concealment field ships fully manual — no pre-fill task added, no partial/half-built detection ships.

---

### Spike 2 — Combat tracker extension API spike ✅ Resolved — **Subclass**
**User**: Developer (research spike — no end-user-visible deliverable of its own)  
**Delivers**: "A confirmed approach for injecting action pips into the combat tracker: subclass `CombatTracker`, a template partial, or the `renderCombatTracker` hook"  
**Routing**: Lead dev  
**Blocking**: Blocked Story A's pip-rendering task — now unblocked.

**Verdict (subclass, no DOM-injection fallback needed)**: Foundry v14's `CombatTracker` (`HandlebarsApplicationMixin`/ApplicationV2, verified against the bundled v14.365 client source) subclasses cleanly for this need — it doesn't fight the framework.

**Rationale**:
- `_prepareTurnContext(combat, combatant, index)` is a dedicated, overridable protected method returning a plain per-row context object (`{ id, name, hidden, initiative, isOwner, resource, active, canPing, img, css, effects, ... }`, confirmed against the bundled source) — a subclass calls `super._prepareTurnContext()` and merges `getActionEconomy(combatant)`'s pip/AoO data straight onto the returned object, no fighting the base implementation.
- `static PARTS` is a plain `{ header, tracker, footer }` map of `{ template, scrollable? }` entries — `tracker.template` points at `templates/sidebar/tabs/combat/tracker.hbs` by default. A subclass overrides `static PARTS` to point `tracker.template` at a system-owned copy of that file (core's actual per-row `<li class="combatant">` markup, confirmed against the bundled template) with pip markup added, reading the merged `turn.actionEconomy` — the same "override PARTS to swap a template" technique already documented for other `HandlebarsApplicationMixin` subclasses in this codebase's own patterns.
- `CONFIG.ui.combat: ConstructorOf<CombatTracker>` (confirmed in `types/foundry/client/config.d.mts`) is a real, documented registration point — exactly what §10.2 already planned to use.
- No `renderCombatTracker` DOM-injection needed anywhere in this flow.

**Verify**: ✅ Recorded approach exists in §10.2 (subclass `_prepareTurnContext()` + `static PARTS` template override). Story A proceeds with this approach directly — no fallback required.

---

### Spike 3 — AE short-duration expiry mechanism spike ✅ Resolved — **Native mechanism, no custom hook**
**User**: Developer (research spike — no end-user-visible deliverable of its own)  
**Delivers**: "A confirmed expiry mechanism for 'until the start of your next turn' AEs (Total Defense, Defensive Fighting, Charged): Foundry's native `duration.rounds`/`turns` fields, or explicit expiry from the turn-advance hook"  
**Routing**: Lead dev  
**Blocking**: Blocked Story E's `createShortDurationAE()` helper — now unblocked.

**Verdict (go — native, verified against the bundled v14.365 client source, not just `.d.mts`)**: Foundry v14's own AE duration schema already solves this exactly. `EffectDurationSchema` is `{ value, units, expiry, expired }` (real core v14 schema — the legacy `rounds`/`turns`/`seconds`/`startRound`/`startTurn` fields are migrated into `value`+`units` and a separate `start: { combat, combatant, initiative, round, turn, time }` object). Setting `duration: { value: 1, units: 'turns' }` is enough — the `expiry` field's schema default (`initial: d => typeof d?.duration?.value === 'number' ? 'turnStart' : null`) auto-selects `'turnStart'`.

**Rationale**:
- `start.combatant` is stamped automatically for any Actor-owned effect created while combat is active (`ActiveEffect#_preCreate` calls `static getEffectStart()`, which reads `combat.combatant.id`) — no extra plumbing to tie the AE to "its" combatant.
- `ActiveEffect#isExpiryEvent('turnStart', context)` resolves `effectCombatant` from `start.combatant` and checks `!!combat?.started && (combat.combatant === effectCombatant)` — this is genuinely combatant-specific, confirming the original open question (does native duration map onto a *single combatant's* next turn, not just any turn-advance) resolves **yes**.
- `Combat#startCombatantTurn()` (core) already calls `_onStartTurn(combatant, context)` then `ActiveEffect.registry.refresh('turnStart', {...context, combat: this})` on every turn advance — the registry refresh is automatic, not something `CombatDnd35e._onStartTurn()` needs to trigger itself.
- On match, `CONFIG.ActiveEffect.expiryAction` (core default: `'update'`) sets `duration.expired = true`, which core's own `isSuppressed` getter (`!!(this.system.isSuppressed ?? this.duration.expired)`) already treats as inactive. A `'delete'` mode also exists if dnd35e prefers expired short-duration conditions to be removed outright rather than linger flagged-but-present — **this is a separate design choice for Story E**, not resolved here, since `expiryAction` is a single global `CONFIG` value affecting every AE in the system, not just these three condition types. Also worth checking then: dnd35e's own `isSuppressed` override (noted in `docs/architecture/property-maps/PropertyMap-ActiveEffectSystem.md`) calls through to `super.isSuppressed` so expired-flag suppression still applies.

**Verify**: ✅ Recorded verdict with rationale exists above and in §10.7. Story E builds `createShortDurationAE()` around `duration: { value: 1, units: 'turns' }` with no custom expiry hook, and separately decides `expiryAction: 'update'` vs `'delete'` for these condition AEs.

---

### Story A — Combat tracker infrastructure, initiative, flat-footed
**User**: GM / Player  
**Delivers**: "Start combat → all combatants silently flat-footed (the condition's own status icon is the only indicator — no chat notice), ordered by a rolled initiative (dialog + chat card, situational bonus entered as a formula) triggered from the tracker's own built-in roll-initiative controls"  
**Routing**: Lead dev (`CombatantDnd35e`, `CombatDnd35e`, `rollInitiative()`) + Jr dev (flat-footed hook, Squeezing condition)  
**Depends on**: none — deliberately descoped from the tracker action-pip display so this story doesn't block on Story B. `CombatantDnd35e` ships without its `actionEconomy` convenience accessor for now (added in Story B once `combatantActionEconomy.mts` exists); `CombatDnd35e` ships with only `_onStartRound()` (Story B adds `_onStartTurn()` to the same file later — no conflict, just an additive method).

- [x] Flatten `system.init` schema from `{ total: number }` to a plain derived number field (drop `.total`); update `CombatAttributes.vue`'s field-path accordingly
- [x] Create `CombatantDnd35e` (no system model, no `actionEconomy` accessor yet — see §10.1)
- [x] Register `CONFIG.Combatant.documentClass = CombatantDnd35e`
- [x] Create `CombatDnd35e` with `_onStartRound()` override (§10.1): auto-apply the existing flat-footed condition (`FLAT_FOOTED_CONDITION_ID`) to all combatants when combat's first round starts, silently (no chat card — the condition's own token status icon is sufficient)
- [x] Register `CONFIG.Combat.documentClass = CombatDnd35e`
- [x] Upgrade `D20RollDialogConfig`/`D20RollDialogApp.vue`'s situational-modifier input to a formula field (Self-context-only FormulaFamiliar, via `FamiliarOverlayInput` + `FormulaData.resolveSource()`) — this is retroactive and also upgrades the existing `rollSave()` dialog
- [x] Implement `Creature.rollInitiative()` mirroring `rollSave()`'s dialog → `D20Roll` → chat-card pipeline; set via `combatant.update({ initiative })` — shipped as `rollInitiativeCheck()` (collision-avoidance naming, same convention as `allApplicableEffectsDnd35e`)
- [x] Add `buildInitiativeCard()` to `src/dice/rollMessages.mts`
- [x] Override `CombatDnd35e.rollInitiative(ids, options)` so the tracker's existing built-in per-row/roll-all dice-icon controls call `Creature.rollInitiative()` per combatant instead of the default formula-based roll
- [x] Add `SQUEEZING_CONDITION_ID` to `conditions.mts` (icon-only, `changes: []`, same convention as Shaken/Sickened/etc.) — Token-HUD-toggleable like every other icon-only condition; no movement/AC gating needed, it's read only by the Attack Roll Dialog's auto-detection (§10.7)

**Deferred within this story**: ~~a character-sheet trigger for rolling initiative — location TBD, to be decided once the rest of this story is in hand.~~ Not deferred — shipped as the rollable `Initiative.vue` field on the character sheet, wired to `rollInitiativeFromSheet`/`rollInitiativeCheck()`.

**Deferred to Story B**: combat tracker action-pip rendering (standard/move/minor pips + AoO badge, per Spike 2's confirmed subclass approach) — moved there since it reads `combatant.actionEconomy`/`getActionEconomy()`, which `combatantActionEconomy.mts` (Story B) provides. Agreed visual design for when Story B builds it: small icons (sword/boot/dot) for standard/move/minor, greyed when spent, plus a numeric badge for remaining AoOs.

**Verify**: Clicking the tracker's existing roll-initiative controls (per-row or roll-all) opens the dialog, accepts a formula situational modifier, and posts a chat card; combatants end up ordered by the result. Save roll dialog also accepts a formula modifier. Combat starts → all combatants silently flat-footed (status icon only, no chat message). Toggling Squeezing on a token via the Token HUD shows the icon and is queryable via `actor.statuses.has('squeezing')`.

---

### Story B — Combatant action economy + movement integration
**User**: Player / GM (during combat)  
**Delivers**: "Moving, taking a 5-foot step, withdrawing, or charging correctly consumes/restricts actions; BAB pools refill per hand at turn start; the combat tracker now shows each combatant's remaining standard/move/minor/AoO"  
**Routing**: Lead dev (flags module, movement integration, new movement actions, tracker pip rendering)

- [ ] Create `combatantActionEconomy.mts` (flags-based, plain functions — see §10.1 shape), incl. `refundMoveAction()`/`refundStandardAction()`/`refundHandBab()` undo primitives and `markChargedThisTurn()`
- [ ] Add the `actionEconomy` convenience accessor to `CombatantDnd35e` (Story A), delegating to `combatantActionEconomy.mts`
- [ ] Extend combat tracker rendering (per Spike 2's confirmed subclass approach): standard/move/minor pips (icons, greyed when spent) + numeric AoO badge per row, sourced from `combatant.actionEconomy`
- [ ] `CombatDnd35e._onStartTurn()` reset (§10.1): `resetActionEconomy()` — refill `bab.main`/`bab.off` from `actor.system.attributes.bab.total`, `actions.aoo` from `actor.system.aooCount`, reset `actions.standard`/`move`/`minor` to true, clear `used` flags
- [ ] Add `SIZE_REACH` constant to `src/constants/sizes.mts`
- [ ] Extend `TokenDocumentDnd35e._onUpdateMovement()`: spend move/standard action via `getMovementBudget()`/`isOverBudget()` (existing poc.9 machinery), no new hooks; add the `charge` branch (always spends move + standard, calls `markChargedThisTurn()` when the completed move ends within `isWithinReach()` of a hostile token, §10.6)
- [ ] Add `fiveFootStep`, `withdraw`, and `charge` custom movement actions to `movementActionGating.mts`, with `canSelectFiveFootStepMovementAction()`/`canSelectWithdrawMovementAction()`/`canSelectChargeMovementAction()` gating (combat-only); extend `movementBudget.mts`'s `ACTION_TO_SPEED_KEY`/`ACTION_SPEED_MULTIPLIER` so `charge` (and `withdraw`) double land speed
- [ ] Add `provokes: boolean` to every movement action config (`walk`/`run`/`charge`/`standUp` → `true`; `dropProne`/`fiveFootStep`/`withdraw` → `false`)
- [ ] Enforce `charge`'s straight-line-only constraint via `TokenDnd35e#_addDragWaypoint` refusing intermediate waypoints while `charge` is the active movement action (same technique as `run`, §10.6)
- [ ] Build `buildMoveActionCard()` + `move-action-card.hbs` template; post it from `_onUpdateMovement()` whenever a move/standard action is actually spent, or a warning-flagged card when `cost > budget * 2` (§10.6)
- [ ] Wire the `data-action="undo-move-action"` click handler (GM/owner-gated): refunds the spent action(s) via `refundMoveAction()`/`refundStandardAction()`, teleports the token back to the stored `priorPosition`, sets `undone: true`, re-renders the card
- [ ] Add the movement-action HUD caution badge for `provokes: true` actions (§10.10/Story G reads it too) — exact v14 render point: try a DOM injection via a render hook first (mirroring Spike 2's tracker fallback), only escalate to a dedicated spike if that proves unworkable

**Verify**: Move ≤ speed → move action consumed + Move Action card posted with an active Undo button; clicking Undo refills the move-action pip and the card shows "Undone". Move > speed ≤ 2× → move + standard consumed, card lists both, Undo refunds both. Move > 2× speed → warning banner on the card (no Undo, nothing was spent) alongside the existing toast. 5-foot step/Withdraw only selectable in combat; neither provokes. Charge only selectable in combat, provokes like a normal move, can't drag a bent path (only straight lines), and always spends move + standard regardless of distance. Charging into melee reach of a hostile token sets `used.chargedThisTurn`; charging without reaching anyone doesn't, and nothing warns either way. Turn start refills both hand BAB pools and AoO count. The provokes badge appears on `provokes: true` movement actions only during combat.

---

### Story C — ActionDataModel first cut (melee + TWF)
**User**: Developer / GM authoring weapons  
**Delivers**: "Weapon has default melee (and thrown, where applicable) actions, computed live from the weapon's own details rather than stored; each action independently controls whether it requires the weapon to be equipped"  
**Routing**: Lead dev (schema, TWF penalty calc, `getContributedActorChanges()`) + Jr dev (actions tab UI)

- [ ] Create `ActionChainLinkModel` schema
- [ ] Create `ActionDataModel` base schema: `check`, `damage`, `chain`, `activation`, `requiresEquipped`, `provokes`, `maxTargets` (initial 1), `range` (nullable, see Story F), `systemCreated` (boolean) — no `hand`/`defaultSlotId` fields (both derived live at execution time, §10.3)
- [ ] Declare the public `executeAction(context: UseActionContext, targetIds: string[]): Promise<ActionResult>` interface method on `ActionDataModel` itself (§10.7) — the one entry point `useAction()`/the execution engine ever calls; implemented once here since all three poc.10 subtypes share identical logic, but the hook alpha.3+ skill/spell action subtypes will override with their own resolution logic
- [ ] Create `MeleeWeaponAttack`, `RangedWeaponAttack`, `ThrownWeaponAttack` subtypes and wire `actions` on `WeaponSystemModel` as `ArrayField(TypedSchemaField({melee, ranged, thrown}))` (§10.3) — holds the three system-managed actions on the weapon
- [ ] Add `twoHandedRanged` to `WEAPON_SUBTYPES`/`WEAPON_SUBTYPE`/`WEAPON_SUBTYPE_LOCALIZED` (`constants.mts`) — drives the Melee⇄Ranged auto-swap below alongside the existing `ranged` value
- [ ] Attach FormulaFamiliar contexts to `check.formula`/`damage.formula`
- [ ] Implement `weaponActionSync.mts` (sibling of `masterworkAe.mts`'s `syncMasterworkAeState()`): auto-create/delete `MeleeWeaponAttack`↔`RangedWeaponAttack` on `weaponSubtype` ranged-group changes, and `ThrownWeaponAttack` on `WEAPON_PROPERTY_THROWN` toggling — deleting only entries still `systemCreated === true`; wire from an item-update hook, not `prepareDerivedData()`
- [ ] Implement `EquippableItem._buildEquippedChanges()` (currently a `// to do move actions to actor on equip` stub) and `Weapon.getContributedActorChanges()`: live-merge `weaponDamage.damageRoll`/`damageType`/`critRange`/`critMultiplier`/`attackFormula`/`damageFormula`/`rangeIncrement` onto each **system-created, still-unedited** stored action via targeted per-action change keys (`system.attacks.actions.<id>.damage.formula`, etc.) — melee's `check.formula` ability term is DEX when `properties.has(WEAPON_PROPERTY_FINESSE)`, else STR; ranged/thrown always use DEX for the check and always get the STR term on damage only when thrown
- [ ] Implement `getTwoWeaponFightingPenalty()`: -6/-10 baseline, -4/-8 on both hands when the **off-hand's** currently-equipped weapon has `weaponSubtype === LIGHT_WEAPON` (not the attacking hand's weapon)
- [ ] Add `$floor`/`$ceiling`/`$round`/`$absolute` to `FormulaResolver.functionGrammar.mts` (§10.3) — new `FunctionName` entries, single-arg; resolve the inner argument and compute the result locally (`Math.floor`/`Math.ceil`/`Math.round`/`Math.abs`) whenever it's already a plain number, falling back to re-emitting `$`-stripped Math-proxy syntax (`$ceiling` → `ceil`, `$absolute` → `abs`) only when real dice-term syntax remains for Foundry's native Roll grammar to evaluate later
- [ ] Create `src/constants/weapons/weaponProperties.mts` (`WEAPON_PROPERTY_*` constants + `WEAPON_PROPERTIES` array, §10.3) and add `properties` `SetField` to `WeaponSystemModel`; expose as a plain checkbox list on the weapon sheet
- [ ] Implement `detectWieldMode(actor, item)`, `getWieldModeStrTerm(wieldMode)`, and `wieldModeToBabHand(wieldMode)` (§10.3) — the contributed default action's `damage.formula` never bakes in a flat `#self.abilities.str.mod`, and the same wield-mode detection now also decides which BAB pool(s) an attack draws from (no stored `hand` field)
- [ ] Build the Actions tab on the weapon sheet: an editable list of the three system-managed actions (`systemCreated` shown as a small badge, not a separate read-only section), `FormGroupSection`-based fields per property; no custom-action authoring this phase
- [ ] Add the generic, always-available "Throw" HUD/Actions-tab action (§10.4): throws whatever's held in a free/freeable hand at a flat −4 attack penalty, 10-ft range increment, crit only on natural 20 (×2 damage) — used only when the thrown item has no real `ThrownWeaponAttack` entry of its own
- [ ] Add a Hand select (Main/Off) to the Attack Roll Dialog, shown for every attack action, defaulting to main hand unless the weapon is already equipped off-hand, always user-overridable; for `requiresEquipped: false` actions specifically, enforce that the selected hand is actually free to throw (§10.3); implement the new `itemEquipped`/`itemUnequipped` listener on `equipped.mts` that spends a move action via `spendMoveAction()` when equipping/unequipping mid-combat (gated on `game.combat?.started`) — a separate, always-on mechanic, never triggered by using a `requiresEquipped: false` action
- [ ] Populate `chain: [{ trigger: 'onSuccess', actionId: 'damage', ... }]` on every contributed action — read as a sentinel (`chain[0]` only, `actionId: 'damage'` means "this action's own `.damage` block") per §10.3's chain-resolution note, not a real cross-action lookup
- [ ] Change `weaponDamage.critRange` from `StringField` to `NumberField` (integer, min 2, max 20, initial 20); add `formatThreatRange()` display helper (§10.4 "Threat range becomes a number"); change `D20Roll.isCriticalThreat` from a no-arg getter to `isCriticalThreat(threshold: number = 20)`, updating its one existing save-card call site to rely on the default
- [ ] Add `weaponDamage.autoScaleDamage` `BooleanField` (initial `true`) to `WeaponSystemModel`; add `Weapon._preCreate()` to default `designedForSize` to the parent actor's `system.size` when embedded directly on an Actor and no size was explicitly provided (§10.4 "Weapon damage scaling by size")
- [ ] Implement `scaleDamageDie(dieFormula, size)` as a plain TS helper (`weaponDamageScaling.mts`, §10.4) — transcribe the size→die step table from D35E's `sizeRoll()` (`module/actor/entity.js`) rather than reproducing it from memory; call it directly from `Weapon.getContributedActorChanges()` to build `damage.formula` when `autoScaleDamage` is checked, splicing in the already-scaled die string as a plain literal rather than a formula function

**Verify**: Create a weapon → `system.actions` auto-seeds a `MeleeWeaponAttack` (or `RangedWeaponAttack`, per `weaponSubtype`); checking the `thrown` property adds a `ThrownWeaponAttack`; unchecking it removes that entry again as long as it hasn't been edited. `actor.system.attacks.actions` reflects these, correctly reading `weaponDamage` rather than a nonexistent top-level `system.damage`; toggling `finesse`/`damageType` takes effect on the very next attack with no stale-formula gap. Editing a system-created action's field flips its `systemCreated` badge off and the entry stops being overwritten or auto-deleted from then on. Switching a weapon's `weaponSubtype` between the ranged group and everything else swaps `MeleeWeaponAttack`↔`RangedWeaponAttack` (deleting the inapplicable one only if still system-created). FormulaFamiliar autocomplete includes `#self.abilities.str.mod` and the new `$floor`/`$ceiling`/`$round`/`$absolute` functions (size-based damage scaling is a plain TS helper, not a FormulaFamiliar function, so it isn't part of autocomplete). Actions tab lists each of the three system-managed actions as an editable row (custom-action authoring is deferred to alpha.3). Each contributed action's `chain[0]` resolves to its own `.damage` block on hit. `critRange` renders as `20`/`19 / 20`/`17-20` per `formatThreatRange()`'s convention. Dragging a compendium weapon onto a Large actor defaults `designedForSize` to `large`; with `autoScaleDamage` checked, the weapon's effective damage roll reflects the Large-scaled die, not the entered Medium baseline; unchecking it keeps the entered roll fixed regardless of size. Equipping/unequipping a weapon mid-combat spends a move action; the generic "Throw" action is always available and applies the −4/10ft/nat-20-crit ad hoc math to any held item lacking its own `ThrownWeaponAttack`.

---

### Story D — Attack trigger, execution engine & attack card
**User**: Player (during combat)  
**Delivers**: "Clicking a weapon action (Token HUD's Weapon Attacks list, or a weapon's attack button on the character sheet Actions tab) opens the Attack Roll Dialog — Flanking/Prone/Squeezing/High Ground auto-detected, Charge/Defensive Fighting/Non-lethal/Proficient manual toggles — rolls a d20, and posts an Attack card to chat with one row per target; a player can manually repeat attacks against their BAB pool (including from both hands while dual-wielding) until exhausted or they move. Hit/miss and damage are decided later, per target, by the defender (Story E)"  
**Routing**: Lead dev (execution engine, dialog, events) + Jr dev (HUD row, Actions tab rehome, chat card template)  
**Depends on**: Story B (action economy), Story C (ActionDataModel)

- [ ] Build new bottom-row Token HUD control with two entries, **Weapon Attacks** and **Combat Maneuvers**, each expanding a list on click (same interaction pattern as the existing Movement Action control, not a shared button); Weapon Attacks eligibility per entry `item.system.isCarried && (item.system.isEquipped || action.requiresEquipped === false)`, enabled state `canUseHandAttack(combatant, wieldModeToBabHand(detectWieldMode(actor, item)))`; Combat Maneuvers renders a single Total Defense entry this phase (wired by Story E) — alpha.3 adds real maneuvers to the same list, no new HUD control needed then
- [ ] Repurpose `CombatTab.vue`/`combatTab` into the Actions tab (id/label/tooltip rename); delete `AttackBonusSection.vue` entirely (CMB/CMD isn't a 3.5e concept — see §10.11)
- [ ] Build out `WeaponsSection.vue` for real: one row per carried weapon action with resolved attack/damage/crit/range/type, plus the carried-gated attack button (works regardless of equip state, unlike the HUD)
- [ ] Create `DamageRoll` (`src/dice/DamageRoll.mts`, sibling of `D20Roll`; pushed back from Phase 7)
- [ ] Register `preUseAction`, `postUseAction`, `dealDamage`, `undoDealDamage` in `wellKnownEvents`
- [ ] Define `UseActionContext` (incl. `hand`, `free`) and `ActionResult`
- [ ] Implement `actor.useAction()`: `preUseAction` cancellation, `canUseHandAttack()` gate (bypassed when `free: true`), spends standard action + 5 BAB from the acting hand; after a charge's mandatory attack resolves, calls `markMovedAfterAttack()` when `used.chargedThisTurn` is set (§10.1/§10.6, SRD's "single melee attack" restriction) rather than adding a second gating flag; wire both the HUD and sheet triggers to it
- [ ] Extend `D20RollDialogData`/`Result` with the optional `combatModifiers` checklist, split into Attack Type (Charge/Defensive Fighting/Non-lethal) and Combat Status (Flanking/High Ground/Squeezing/Prone/Proficient) sections, each toggle rendering a help-icon tooltip explaining its effect, plus a separate `damageBonus` formula field; wire `isFlanking()`/`isOnHigherGround()`/`actor.statuses.has('prone')`/`actor.statuses.has('squeezing')`/the combatant's `used.chargedThisTurn` flag auto-detection into `executeAction()`'s dialog call; Non-lethal's `checked` default comes from `item.system.properties.has(WEAPON_PROPERTY_NON_LETHAL)` (§10.3)
- [ ] Reserve an Ammo select field slot in the dialog, shown only when the acting action has a non-null `range.ammoType` — populated by Story F
- [ ] Add a Wield Mode `MultiOptionToggle` field (Primary Hand / Off-Hand / Two-Handed, §10.3) to the Attack Roll Dialog, pre-selected by `detectWieldMode(actor, item)` from the weapon's current `equippedSlotIds` but always user-overridable
- [ ] Implement `ActionDataModel#executeAction()` (`ActionDataModel.mts`, Story C's file) — the public interface method `useAction()` calls on the action itself: accepts `targetIds: string[]`, truncated to `this.maxTargets` (§10.3 — always 1 for poc.10's weapon actions) with a warning if the caller offered more; open the Attack Roll Dialog (auto-detected + manual combat modifiers, roll mode), resolve `check`/`damage` formulas via `FormulaData.resolve()` (never `getRollData()`), reach check per target (melee only, doubled when the weapon has the `reach` property but excluding the attacker's own un-doubled reach unless `threatensAdjacent` is also set — spiked chain and homebrew equivalents opt out of the reach-weapon adjacent-foe dead zone, §10.3), TWF penalty applied to the resolved formula, D20Roll for the attack total — **no hit/miss decision and no damage roll here**; snapshot the resolved (unrolled) damage formula + damage bonus term + crit multiplier per target
- [ ] Apply the Charge/Defensive Fighting self-AE (`applyChargedAE()`/`applyDefensiveFightingAE()`, Story E) immediately once the dialog confirms those toggles were checked
- [ ] Compute the non-lethal switch penalty (§10.3): −4 only when the dialog's final Non-lethal checked state differs from `item.system.properties.has(WEAPON_PROPERTY_NON_LETHAL)`, waived when `item.system.properties.has(WEAPON_PROPERTY_NON_LETHAL_NO_PENALTY)`; applied alongside `twfPenalty`, not folded into the toggle's own value
- [ ] Implement `getWieldModeStrTerm(wieldMode)` and append it to the resolved damage formula (full STR / `$floor(str/2)` / `$floor(str*1.5)` per the dialog's Wield Mode selection, §10.3) — for the ranged/thrown default action, only appended when `item.system.properties.has(WEAPON_PROPERTY_THROWN)` (true ranged weapons don't add STR to damage)
- [ ] Thread the Non-lethal toggle's checked state through to `result.nonLethal`, carried on the attack card's flags for Story E's eventual resolution/damage step to read
- [ ] Add `buildAttackCard()` to `src/dice/rollMessages.mts` (precompiled `.hbs?raw` + `Handlebars.compile()`, reusing `appendModifierBreakdown()`), storing `flags.dnd35e.attackCard` with one row per target
- [ ] Create `src/dice/templates/attack-roll-card.hbs` (per-target rows, Apply per row, Change Target(s) button)
- [ ] Register the `renderChatMessageHTML` hook's delegated `data-action="retarget"` click handler (GM-only): re-syncs unresolved attack-card rows to `game.user.targets`

**Verify**: Equip one weapon → the Weapon Attacks list has one entry. Equip two (dual-wield) → two entries, independently enabled per hand's action economy. Un-equip and un-carry a weapon → its entry disappears from the list; a `requiresEquipped: false` thrown weapon still has an entry while merely carried. Combat Maneuvers control expands to its one entry, Total Defense (verified in Story E) — no other maneuvers are functional this phase. Actions tab lists every carried weapon's action(s) with live data and a working attack button, regardless of equip state. Clicking either trigger opens the dialog with Flanking/Prone/Squeezing/High Ground pre-checked when actually true (unchecking any removes its modifier), Non-lethal pre-checked for a weapon with the `nonLethal` property and unchecked otherwise, Proficient a manual toggle (unchecked applies the −4 penalty), and posts an attack chat card matching the save-roll card's visual pattern — roll breakdown, one row per target, no hit/miss verdict yet. Manual repeat attack (BAB remaining, hasn't moved) succeeds without re-spending the standard action. Attacking from the off-hand applies the correct TWF penalty (light-weapon-aware) and half-STR damage bonus. Checking Charge or Defensive Fighting immediately applies the matching short-duration self-AE (visible as a status icon on the attacker). Charging into melee reach and then attacking pre-checks Charge automatically and blocks any further BAB-funded attack this turn, even though BAB may remain unspent — the same reach-based attack that follows a normal walk is unaffected. Flipping Non-lethal away from a weapon's natural default applies a −4 attack penalty (waived for a `nonLethalNoPenalty` weapon), carried through to the eventual resolution. A reach-weapon's melee attack succeeds against a target 10 ft away; a non-reach weapon's does not. A thrown dagger's damage includes the wield-mode STR term; a bow's ranged attack does not. A Damage Bonus entered in the dialog is stored, not yet folded into any roll. Moving after an attack blocks further BAB-funded attacks this turn. Change Target(s) re-syncs unresolved rows to the GM's current canvas selection without disturbing already-resolved rows.

---

### Story E — Roll Defense Dialog & attack resolution
**User**: GM (primarily) / Player (if `PLAYER_SELF_DEFENSE` is enabled)  
**Delivers**: "Clicking Apply on an attack card's target row opens that target's own defense dialog — Concealment, Cover, Total Defense, Charged, Defensive Fighting, Flat-Footed all auto-detected where possible — and resolves to a hit/miss verdict via a Resolution card that auto-applies damage on a hit, with an Undo available afterward"  
**Routing**: Lead dev (dialog + resolution engine, AE helpers) + Jr dev (MultiOptionToggle wiring, settings registration)  
**Depends on**: Story B (Total Defense spends a standard action), Story D (attack card + snapshot to resolve); optionally consumes Spike 3's verdict for the AE-duration shape (falls back to explicit turn-hook expiry otherwise)

- [ ] Create `RollDefenseDialogConfig.mts`/`RollDefenseDialogApp.vue` (sibling of `D20RollDialogConfig`/`D20RollDialogApp.vue`): Combat Status checklist (Concealment formula, Charged, Covered `MultiOptionToggle`, Flat-Footed, Total Defense, Defensive Fighting), Overrides checklist (Apply Half Damage, Ignore Critical Hit), Situational Bonus formula field, check-mode `MultiOptionToggle` (Normal/Touch/No Check), Defend submit button
- [ ] Add `CHARGED_CONDITION_ID`, `DEFENSIVE_FIGHTING_CONDITION_ID`, `TOTAL_DEFENSE_CONDITION_ID` to `conditions.mts` (icon-only, same pattern as Prone/Squeezing)
- [ ] Add `system.defense.criticalImmune` as a new derived boolean field on `CreatureSystemData` (defaulted `false`, same family as `defense.denyDexToAC`), read for the Ignore Critical Hit auto-detect; a Racial Trait AE targets it directly (`OVERRIDE` mode, value `true`)
- [ ] Create `combatConditionAEs.mts`: `createShortDurationAE()` shared helper + `applyChargedAE()`/`applyDefensiveFightingAE()`, using Spike 3's confirmed duration mechanism (or its fallback)
- [ ] Implement the Total Defense special action, populating Story D's Combat Maneuvers HUD entry: spends the standard action, applies the Total Defense AE via the same shared helper
- [ ] Create `src/dice/actionChainSteps.mts`: `ACTION_CHAIN_ID_SEPARATOR` + `buildActionChainId()` (§10.7's "Action Chain"); add `continue(stepId, message, targetId)` to `ActionDataModel` (`ActionDataModel.mts`, Story C's file) handling the `'damage'` sentinel (§10.4) for every poc.10 weapon action
- [ ] Implement `advanceActionChain()`: the generic `data-action="apply-attack"` handler — splits `attackCard.actionUuid` back into an actor UUID + action id, resolves the actor via `fromUuid()` and the action via `actor.system.attacks.actions.find()` (same collection `useAction()` already searches, §10.7), then calls `action.continue(attackCard.stepId, message, targetId)` — no step registry
- [ ] Implement `ActionDataModel#continue()`'s `'damage'` case: opens the Roll Defense Dialog for the clicked target, folds its result together with the attack card's stored `attackTotal`/`isCriticalThreat` into a final hit/miss + crit-confirm (`evaluateDefense()`), rolls damage (only if hit, applying Apply Half Damage if checked), and posts the Resolution card — which itself auto-applies that damage to the target's HP as part of being created
- [ ] Implement the Concealment miss-chance roll (d% vs. the resolved Concealment formula value) inside `evaluateDefense()`
- [ ] Gate `continue()`'s `'damage'` case's Roll Defense Dialog to the GM, or the target's owner when `PLAYER_SELF_DEFENSE` is enabled — `advanceActionChain()` itself is already generic/ungated (above); this permission check lives in the action's own `continue()`, not the dispatcher, since a future step could have a different rule
- [ ] Add `buildResolutionCard()` to `src/dice/rollMessages.mts`, storing `flags.dnd35e.resolutionCard` (`hit`/`appliedAmount`/`actionEconomySpent`/`undone`) and calling `target.takeDamage()` as part of posting the card when it was a hit
- [ ] Create `src/dice/templates/resolution-card.hbs` (defended-AC/roll-mode/toggle summary, damage roll + "Applied: N damage" on a hit, Undo button)
- [ ] Wire the `data-action="undo-resolution"` click handler (reads `flags.dnd35e.resolutionCard`, reverses `appliedAmount` via `target.takeDamage(-appliedAmount, ...)`, emits `undoDealDamage`, refunds the attacker's `actionEconomySpent` via `refundStandardAction()`/`refundHandBab()` when non-null, sets `undone = true`)
- [ ] Add `PLAYER_SELF_DEFENSE` to `src/settings/combat/constants.mts` + register it, default `true` during development (`// TODO: flip to false before release`)
- [ ] Implement `buildDocumentDataMap()`/`FormulaData._buildFamiliarFromDocumentMap()`'s preferred-alias override for the `self` context; wire `attacker`/`target`/`defender` context names into both dialogs' Situational Bonus fields
- [x] Consume Spike 1's concealment-spike verdict — **no-go**: the Concealment field stays 100% manual (no pre-fill task added)

**Verify**: Clicking Apply on an attack card's target row opens the Roll Defense Dialog pre-checked for whatever's actually true of that target (Flat-Footed, Charged, Total Defense, Defensive Fighting) — unchecking any removes its effect from resolution. Setting a Concealment value triggers a miss-chance roll that can override an otherwise-successful hit. Selecting Covered vs. Improved Cover are mutually exclusive. Ignore Critical Hit auto-checks for an actor with `system.defense.criticalImmune === true`. Clicking Defend posts a Resolution card with the correct hit/miss verdict; on a hit, the target's HP has already dropped by the rolled (and possibly halved) amount with no separate Apply step, and an Undo button reverses both the damage and the attacker's spent action economy together. A miss's Resolution card shows no damage and no Undo button (the attacker's spent action, if any, simply isn't refundable for a miss). Charging or fighting defensively via the Attack Roll Dialog visibly applies a short-duration self-AE that a *different* attacker's Roll Defense Dialog later auto-detects.

---

### Story F — Ranged attacks & ammo
**User**: Player (during combat)  
**Delivers**: "Ranged/thrown attacks apply range-increment penalties and consume ammo (or the thrown weapon itself); a character carrying multiple eligible ammo types picks which one to consume before rolling; missed ammo is tracked per-combatant and a GM can recover it with a single post-combat roll"  
**Routing**: Lead dev (Ammo item type + item-contribution/`ammoOptions` wiring) + Jr dev (range penalty math, Ammo select field UI)  
**Depends on**: Story C (ActionDataModel's `range`/`ammoType`), Story D (Attack Roll Dialog, for the reserved Ammo select field slot)

- [ ] Create new `Ammo` item type (extends `PhysicalItem`; `quantity`, `ammoType`, `alwaysRecoverable: boolean` default `false`)
- [ ] Add `allowedItemTypes: string[] | null` (nullable `SetField`, `choices: PHYSICAL_ITEM_TYPES`, default `null`), `isQuiver: boolean` (default `false`), and `allowsCurrency: boolean` (default `true`) fields to `ContainerSystemModel`; extend `canAddItemToContents()` with the type-allow check; add the Contents `MultiOptionToggle` + `MultiSelectFormGroup` + Is Quiver/Allow Currency checkboxes to `ContainerCapacity.vue`; hide `CoinageFormGroup` in `ContainerInventory.vue` when `allowsCurrency` is `false` — no new Quiver item type, a compendium Quiver is just a `Container` preset with `isQuiver: true` (commonly paired with `allowedItemTypes: ['ammo']`)
- [ ] Push a `PreparationWarning` (default `alert` until Story H's severity split lands, then reclassified `warning`) when a container's `allowedItemTypes` is `[]` and `allowsCurrency` is `false` — flags a container configured to hold nothing at all
- [ ] Implement `Ammo.getContributedActorChanges()`: push a `system.attacks.ammoOptions` entry (`{ itemUuid, name, ammoType, quantity }`) when the ammo is carried loose or carried inside a container whose `isQuiver` is `true`
- [ ] Add `system.attacks.ammoOptions` derived array field to `CreatureSystemData`
- [ ] Populate the Ammo select field reserved in Story D's dialog: lists `ammoOptions` entries matching the acting action's `range.ammoType`, auto-selecting the sole entry when only one exists
- [ ] Implement range-increment penalty (`-2` per increment beyond the first, from existing `rangeIncrement`)
- [ ] Implement ammo consumption: decrement the **selected** `Ammo` item's quantity per attack (hit or miss); thrown weapons with `range.ammoType: null` consume their own quantity instead and skip the select field
- [ ] Respect existing `noAmmoRequired` flag (skip consumption + hide the select field)
- [ ] Register `Ammo` in `system.json.template`/`registration.mts`
- [ ] Implement `combatantAmmoTracking.mts`: `recordRetrievableAmmo()`/`getRetrievableAmmo()`/`clearRetrievableAmmo()` combatant-flags helpers (§10.9)
- [ ] Wire `ActionDataModel#continue()` to call `recordRetrievableAmmo()` for ammo-consuming attacks on a miss, or always when the ammo is `alwaysRecoverable` — gated to party-member attackers only (`system.settings.isPartyMember === true`)
- [ ] Register a `preDeleteCombat` hook that posts the Ammo Recovery prompt card (snapshotting every combatant's non-empty `retrievableAmmo` tally into the message's own flags) before the Combat document disappears
- [ ] Implement `buildAmmoRecoveryCard()`: per-entry `${count}d100` roll (≤50 recovered) — skipped entirely for `alwaysRecoverable` entries, which recover in full — applies recovered quantities to the `Ammo` items, resolves the same message in place with an Undo button

**Verify**: Firing a bow with two eligible arrow stacks (e.g. regular + silver) shows an Ammo select field; picking one consumes only that stack. A single eligible stack skips the picker entirely. Ammo sitting in a locked chest (non-quiver container) doesn't appear as an option; the same ammo moved into a Quiver-flagged container (`isQuiver: true`), or carried loose, does. Attempting to drag a non-ammo item into a container whose Contents toggle is set to a type list not including that item is rejected; setting a container's Contents toggle to None rejects every item. Unchecking a container's Allow Currency hides its coin field; a container with Contents set to None and Allow Currency unchecked shows a content warning. Range penalty scales correctly with distance. Throwing a dagger consumes the dagger itself with no Ammo picker shown. Missing with 10 arrows and hitting with 10 more, then ending the combat encounter, auto-posts an Ammo Recovery card showing 10 expended for that combatant; clicking Recover Ammo rolls and shows roughly half recovered (varies by roll) — the recovered count is added back to the arrow stack's quantity, and clicking Undo reverses it. Ammo flagged `alwaysRecoverable` shows on the card even for hits, and Recover Ammo returns its full count with no roll. An NPC combatant's expended ammo is never tracked and never appears on the card.

---

### Story H — PreparationWarning alerts/warnings split
**User**: GM
**Delivers**: "Incomplete system-created actions (e.g. a freshly auto-created `ThrownWeaponAttack` still missing required fields) surface as a non-blocking warning on the sheet's warnings tab, distinct from the existing banner-generating alert; a GM can upgrade/downgrade an item's severity between the two"
**Routing**: Lead dev
**Depends on**: none structurally — deliberately scheduled last since it's a self-contained severity-tier upgrade to the existing `PreparationWarning` system, not a blocker for any other Story C-G work. Story C's auto-created actions surface with today's single-tier warning behavior until this story lands.

- [ ] Add a `severity: 'alert' | 'warning'` discriminator to `PreparationWarning` (`src/documents/document/preparationWarnings.mts`) — `alert` preserves today's banner-generating behavior; `warning` appears on the warnings tab only, no banner
- [ ] Add GM-only upgrade/downgrade controls on the warnings tab to flip a given warning's severity
- [ ] Classify the new "system-created action still has default/incomplete fields" diagnostic (§10.3/§10.4) as `warning` by default
- [ ] Classify the Container "can't hold anything" diagnostic (§10.9, `allowedItemTypes: []` + `allowsCurrency: false`) as `warning` by default
- [ ] Audit existing `PreparationWarning` call sites — no severity was previously declared, so confirm the default-`alert` fallback preserves current banner behavior everywhere

**Verify**: A freshly auto-created `ThrownWeaponAttack` (from checking the `thrown` property) shows up on the sheet's warnings tab without triggering the top-level banner. A GM can upgrade it to an alert (banner appears) or downgrade an existing alert to a warning (banner disappears, entry stays on the tab).

---

### Story G — Attacks of Opportunity
**User**: Player / GM (during combat)  
**Delivers**: "Provoking actions (moving through a threatened square, standing up, ranged attacks while threatened) prompt the reacting player for an AoO; the mover only sees a generic warning; threatened squares highlight on token selection, and squares that would grant a flanking bonus highlight in green"  
**Routing**: Lead dev (detection + asymmetric prompt flow) + Jr dev (threatened-square + flanking-square highlight rendering)  
**Depends on**: Story B (movement provokes), Story D (ranged-while-threatened provokes)

- [ ] Add `provokes` checks into `_onUpdateMovement()` (movement actions) and `useAction()`/`executeAction()` (ranged-while-threatened)
- [ ] Implement the client-authority detection model: reacting owner (or GM) evaluates eligibility locally and gets an interactive "Take an AoO? Which attack?" prompt; mover's client sees only a generic threatened-square warning
- [ ] Wire the granted AoO attack through `actor.useAction(itemId, actionId, targetId, { free: true })`, spending 1 from `actionEconomy.actions.aoo`
- [ ] First task: confirm the Foundry v14 grid-highlight render API (grid highlight layer vs. custom PIXI overlay) — fallback: a custom canvas layer with simple colored square overlays if the native API proves unworkable
- [ ] Implement threatened-square highlighting on `controlToken`: orange for all threatened squares (everyone), red overlay for GM-only where the threatening creature also has `actions.aoo > 0`, gated by the existing `THREATENED_SHOW_SQUARES` setting
- [ ] Implement `isFlanking()` geometry helper (opposite-side/opposite-corner check) and fold a `+2` situational modifier into `executeAction()`'s check formula when true
- [ ] Implement flanking-square highlighting (green) reusing the same overlay/hook as the threatened-square highlight

**Verify**: Walking out of a threatened square prompts the threatening creature's owner (not the mover) for an AoO; the mover sees only a generic warning. Standing up while threatened provokes; 5-foot step and Withdraw do not. Firing a bow while in melee reach provokes. Selecting a token highlights threatened squares orange for everyone, red (with AoO availability) for the GM only, and green for squares that would grant flanking against an enemy. An attack made while actually flanking gets the +2 bonus in the resolved roll.

---

### Parallelization

```
Spike 1 (concealment spike — independent, informs Story E's scope only)
Spike 2 (tracker-API spike — independent, informs Story A's approach only)
Spike 3 (AE-duration spike — independent, informs Story E's helper only)

Story B (action economy + movement)  ──┬──► Story A (tracker/initiative/flat-footed)
Story C (ActionDataModel + TWF)      ──┤
                                        ├──► Story D (attack trigger, execution, attack card) ──► Story E (Roll Defense + resolution)
                                        │            │
                                        │            └──► Story F (ranged + ammo)
                                        └──────────────────────────────────────────────────────────────────► Story G (AoO)

Story H (PreparationWarning alerts/warnings split — independent, scheduled last, no blocking relationships)
```

Spikes 1, 2, and 3 (already resolved above) were all fully independent research tasks — each only informed one downstream story's scope and never blocked outright. Stories B and C can start simultaneously (no shared dependency). Story A only needs B's action-economy shape, not the full movement integration (and optionally Spike 2's tracker-API verdict). Story D is the first vertical slice through the attack flow — trigger UI, execution engine, and the attack card all together, since none of the three has an independently-verifiable user story on its own. Story F (ranged/ammo) and Story G (AoO) both build on Story D once it lands. Story E (Roll Defense + resolution) follows Story D directly, and optionally consumes Spike 3's verdict for the AE-duration shape and Spike 1's verdict for the Concealment pre-fill. Story G additionally needs Story B for movement-provokes. Story H stands entirely apart from the dependency chain above — it's a self-contained severity-tier upgrade to the existing warnings system, deliberately scheduled last since nothing else in this phase requires it (Story C's auto-created actions just use today's single-tier warning behavior until it lands).
