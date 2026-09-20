# SilverSmith Progress — POC Phase 10 (Basic Combat)

## Completed Sections
- [x] Spike 1 — Concealment auto-detection spike — resolved **no-go** (revisited: light-source-radius detection *is* feasible, logged to wishlist, still no code this phase)
- [x] Spike 2 — Combat tracker extension API spike — resolved **subclass** (no DOM-injection fallback needed)
- [x] Spike 3 — AE short-duration expiry mechanism spike — resolved **native mechanism, no custom hook**
- [x] Story A — Combat tracker infrastructure, initiative, flat-footed — all checklist items checked off in `phase-10-basic-combat.md`
- [x] Story B — Combatant action economy + movement integration — all 12 checklist items checked off in `phase-10-basic-combat.md`; verified via a full codebase audit (11/12 were already implemented but unchecked, only the HUD provokes badge needed new code)
- [x] Story C — ActionDataModel first cut (melee + TWF) — all checklist items checked off in `phase-10-basic-combat.md` and verified directly against the codebase (`ActionDataModel.mts`, `WeaponAttackDataModel.mts`, `MeleeAttackDataModel.mts`/`RangedAttackDataModel.mts`, `combatantActionEconomy.mts`, `detectWieldMode()`/`getWieldModeStrTerm()`/`wieldModeToBabHand()` on `ActorDnd35e`). This section's stale "NOT STARTED" note (previously here) was corrected once Story D began — always re-verify against the phase doc + codebase, not just this file.

**Renumbering note**: with all three spikes resolved, the remaining stories (formerly D–K) were relettered A–H in `phase-10-basic-combat.md` (D→A, E→B, F→C, G→D, H→E, I→F, J→G, K→H). The retired spike letters A/B/C were renamed to Spike 1/2/3 to free them up. All cross-references, the Parallelization diagram, and its prose were updated accordingly.

## Current Section
- [x] Story D.1 — Engine primitives (`DamageRoll`, `preUseAction`/`postUseAction`/`dealDamage`/`undoDealDamage` events) — complete, committed.
- [x] Story D.2 — Attack Roll Dialog extension (`combatModifiers`, `damageBonus`, Wield Mode toggle, reserved Ammo slot) — complete, committed. `isFlanking()`/`isOnHigherGround()` auto-detection wiring deferred to D.3 (Flanking specifically stays manual-only, deferred to Story G — see decision below).
- [ ] Story D.3 — `executeAction()`/`useAction()`/attack card — NEXT UP.

**Story D breakdown** (agreed with user before starting): D.1 engine primitives → D.2 dialog extension → D.3 `executeAction()`/`useAction()`/attack card → D.4 Token HUD control + Actions tab UI (HUD render approach to be spiked at the start of D.4).

## Decisions Made
- **Story A/B descoping (Phase 0 for Story A)**: tracker action-pip rendering moved entirely from
  Story A to Story B in `phase-10-basic-combat.md` — it depends on `combatantActionEconomy.mts`
  (Story B's module), and rebuilding the same `CombatTracker` subclass/template twice wasn't worth
  it. Story A now ships `CombatantDnd35e` without its `actionEconomy` accessor (added in Story B)
  and `CombatDnd35e` with only `_onStartRound()` (Story B adds `_onStartTurn()` later, same file).
  Agreed pip visual design (for Story B): icons (sword/boot/dot) for standard/move/minor, greyed
  when spent, + numeric AoO badge.
- Roll Initiative wiring: override `CombatDnd35e.rollInitiative(ids, options)` so the tracker's
  existing built-in per-row/roll-all dice buttons transparently drive `Creature.rollInitiative()`
  instead of formula-based rolling. A character-sheet trigger is also wanted but location is
  deferred — user will decide placement once the rest of Story A is done.
- Flat-footed auto-apply on combat start (`CombatDnd35e._onStartRound()`) is silent — no chat
  card; the condition's own token status icon is sufficient indicator.
- Spike 1 verdict: no supported Foundry v14 client API exposes per-point light level or an
  attacker-specific concealment percentage. `CanvasVisibility#testVisibility` is a binary check
  tied to the *viewing client's* vision, not the attacker's. `canvas.environment.darknessLevel`
  is scene-wide, not per-square. Real fix is Foundry's native `AdjustDarknessLevelRegionBehaviorType`
  (Regions), which is what `post-release/phase-03-sight-concealment.md` (gated on Phase 24) already
  targets. Concealment field ships 100% manual in poc.10 — no partial detection. Also logged as a
  post-release wishlist item.
- Spike 1 revisit: narrower question ("is point within a light source's bright/dim radius", not
  "give me a percentage") IS feasible. `canvas.effects.lightSources` (covers both AmbientLight and
  token-carried lights) + `source.active` (already false when darkness-suppressed) +
  `source.testPoint()` (wall-aware) + `source.radius`/`source.ratio` (bright-radius = radius * ratio)
  give an exact bright/dim/dark determination for a point. Still doesn't account for per-observer
  senses (darkvision/low-light/blindsight) — that combination is separate, un-spiked scope. Decision:
  still ships 100% manual in poc.10 (Option B) — verdict/rationale in Spike 1 block gained a
  "Revision" note, and the wishlist entry now carries the exact algorithm for whoever picks this up
  post-release, rather than expanding this spike's scope now.
- Spike 2 verdict: `CombatTracker` (HandlebarsApplicationMixin/ApplicationV2, verified against
  bundled v14.365 client source) subclasses cleanly. Override `_prepareTurnContext()` to merge
  action-economy pip data onto the per-row context; override `static PARTS` to point `tracker.template`
  at a system-owned copy of `templates/sidebar/tabs/combat/tracker.hbs` with pip markup added.
  `CONFIG.ui.combat` is a real, documented registration point. No `renderCombatTracker` DOM-injection
  fallback needed.
- Spike 3 verdict: Foundry v14 core's real AE duration schema is `{ value, units, expiry, expired }`
  (legacy `rounds`/`turns`/`seconds`/`startRound`/`startTurn` migrated into this + a separate
  `start: { combat, combatant, initiative, round, turn, time }`). Setting
  `duration: { value: 1, units: 'turns' }` while combat is active is enough — `expiry` schema default
  auto-selects `'turnStart'`; `start.combatant` auto-stamps via `_preCreate`/`getEffectStart()`;
  `ActiveEffect#isExpiryEvent('turnStart', ctx)` checks `combat.combatant === effectCombatant` —
  genuinely combatant-specific, not just any turn-advance. `Combat#startCombatantTurn()` already
  calls `ActiveEffect.registry.refresh('turnStart', ...)` natively — no hook into
  `CombatDnd35e._onStartTurn()` needed for expiry itself. `CONFIG.ActiveEffect.expiryAction`
  (default `'update'`, sets `duration.expired=true`, suppressed via core's `isSuppressed` getter) vs
  `'delete'` (removes the AE outright) is a separate global-setting decision deferred to Story E
  (formerly Story H, prior to the renumbering — Roll Defense Dialog & attack resolution),
  since it affects every AE system-wide, not just these three condition types.

- **Story B closeout**: checklist audit found 11/12 items already implemented in code with zero
  doc/memory record — going forward, verify phase-doc/memory staleness directly against the
  codebase (e.g. via a search subagent) rather than trusting unchecked boxes as "not started".
  Also fixed an unrelated convention violation found along the way: `_combat-tracker.scss` (a
  standalone global partial styling `CombatTrackerRow.vue`'s action-economy pips) was moved into
  a scoped `<style>` block in the component itself and the partial + its `core.scss` `@use` were
  deleted, matching the rest of the codebase's Vue-scoped-styling convention.
- **Movement-action provokes badge** (last open Story B item): implemented as a second decoration
  step in the existing `renderTokenHUD` hook in `movementActionHudDecoration.mts`
  (`decorateMovementActionProvokes()`), sitting alongside the pre-existing affordability greying
  (`decorateMovementActionChoices()`) rather than a new hook registration. Reads
  `CONFIG.Token.movement.actions[action]?.provokes` (cast to `Dnd35eMovementActionConfig`, the
  system's own extension interface in `movementActionGating.mts`) and only badges when
  `game.combat?.started` is true. Badge is a JS-injected `<i class="fa-solid
  fa-triangle-exclamation dnd35e-movement-action-provokes-badge">` appended to the anchor (native
  Foundry HUD DOM confirmed via `token-hud.hbs`: `<a class="palette-list-entry ..."
  data-action="movementAction" data-movement-action="{id}"><span>{icon}{label}</span></a>` — no
  existing badge slot, so DOM injection was required, matching the doc's own "try DOM injection
  first" fallback plan). Styling added to `_token-hud.scss` (global partial — correct location
  since this decorates native, non-Vue HUD DOM), not a Vue `<style>` block. New localization key
  `dnd35e.TOKEN.MOVEMENT.Provokes` added to `src/lang/en/tokens.json`.

- **Story D.1**: New events (`preUseAction`/`postUseAction`/`dealDamage`/`undoDealDamage`) registered
  under `src/documents/actors/baseActor/events/` (not Creature-specific) since `useAction()` lives on
  `ActorDnd35e` per the doc's §10.7. Followed the existing per-event-file convention
  (`PhysicalItemLifeCycle`/`CreatureLifeCycle`): one file per event exporting a string const + payload
  interface, aggregated into `ActionLifeCycle`, registered via `registerActionEvents()` called at
  module load (bottom of `ActorDnd35e.mts`), matching `Creature.mts`'s `registerCreatureEvents()`
  pattern. `DamageRoll` (`src/dice/DamageRoll.mts`) does critical multiplication via Foundry's
  built-in `Roll#alter(critMultiplier, 0, { multiplyNumeric: true })` in the constructor — matches
  SRD's "roll the dice N times, add static bonuses N times" crit rule.
- **Deliberately deferred out of D.1**: `UseActionContext`'s `hand`/`free` fields and `ActionResult`'s
  hit/damage-snapshot shape — these depend on what `executeAction()`/`useAction()` actually produce,
  so they're being defined in D.3 alongside that logic instead of guessed at now.
- **isFlanking()/Story G ordering conflict (resolved by user)**: the doc's `executeAction()` sample
  calls `isFlanking()`, but its real implementation (`src/canvas/token/logic/threatenedSquares.mts`)
  is a Story G deliverable, and Story G's own header states it depends on Story D — a circular
  ordering. User chose: ship Flanking as a manual-only toggle in Story D (`autoDetected: false`,
  unchecked by default), with real geometry auto-detection deferred entirely to Story G. The phase
  doc's Story D checklist was split accordingly (see `phase-10-basic-combat.md`); the doc's own
  Verify-script line about Flanking pre-checking correctly won't be satisfiable until Story G lands
  — expected, not a regression.
- **Story D.2**: Extended `D20RollDialogData`/`D20RollDialogResult` (`D20RollDialogConfig.mts`) with
  `CombatModifierToggle`/`AmmoOption` types and the new optional fields (`combatModifiers`,
  `damageBonus`, `wieldMode`, `hand`, `ammoOptions`, `ammo`), all exported from the `src/dice`
  barrel for D.3's `executeAction()` to consume. `D20RollDialogApp.vue` renders each new field only
  when its data is present (so save/initiative rolls are unaffected): Attack Type/Combat Status
  toggle groups with `fa-circle-question` tooltips, a second independent `FamiliarOverlayInput`
  formula-editor instance for `damageBonus` (resolves to a formula **string** via
  `FormulaData.resolveSource(..., { expectedType: 'string' })` — dice notation preserved, unlike
  `situationalModifier` which resolves to a plain number), a `MultiOptionToggle` for Wield Mode, a
  native `<select>` for Hand, and a reserved (currently-always-empty) Ammo `<select>` for Story F.
  New lang keys added to `combat.json` (`COMBAT.CombatModifiers`, `COMBAT.WieldMode`, `COMBAT.Hand`,
  `COMBAT.Ammo`) and `dice.json` (`ROLL.DamageBonus`).

## Deferred Items
- Automated concealment detection (lighting/vision/senses-based) → post-release Phase 3
  (`docs/migration-plan/post-release/phase-03-sight-concealment.md`, gated on Phase 24) — also in
  `post-release/WISHLIST.md` under Weapons & Combat, now including the concrete
  `canvas.effects.lightSources`/`testPoint()`/`radius`/`ratio` algorithm for bright/dim/dark-at-a-point
- `CONFIG.ActiveEffect.expiryAction` ('update' vs 'delete') choice for short-duration combat
  condition AEs → Story E, when `createShortDurationAE()` is actually built

## Knowledge Cached
- None yet — consider delegating to @kb-curator once more of Phase 10 lands (Foundry v14 vision/
  lighting API surface: `CanvasVisibility`, `DetectionMode`, darkness-level scalars vs. Region
  darkness-level behavior vs. `canvas.effects.lightSources`/`testPoint()`/`radius`/`ratio` point-level
  detection; CombatTracker's `_prepareTurnContext()`/`static PARTS` subclass pattern; AE v14 duration
  schema refactor (`value`/`units`/`expiry`/`expired` + `start{combat,combatant,...}`) and
  `ActiveEffect.registry`/`isExpiryEvent()`/`expiryAction` — useful for any future AE-duration work).

