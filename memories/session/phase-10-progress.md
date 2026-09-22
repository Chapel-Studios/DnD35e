# SilverSmith Progress — POC Phase 10 (Basic Combat)

## Completed Sections
- [x] Spike 1 — Concealment auto-detection spike — resolved **no-go** (revisited: light-source-radius detection *is* feasible, logged to wishlist, still no code this phase)
- [x] Spike 2 — Combat tracker extension API spike — resolved **subclass** (no DOM-injection fallback needed)
- [x] Spike 3 — AE short-duration expiry mechanism spike — resolved **native mechanism, no custom hook**
- [x] Story A — Combat tracker infrastructure, initiative, flat-footed — all checklist items checked off in `phase-10-basic-combat.md`
- [x] Story B — Combatant action economy + movement integration — all 12 checklist items checked off in `phase-10-basic-combat.md`; verified via a full codebase audit (11/12 were already implemented but unchecked, only the HUD provokes badge needed new code)
- [x] Story C — ActionDataModel first cut (melee + TWF) — all checklist items checked off in `phase-10-basic-combat.md` and verified directly against the codebase (`ActionDataModel.mts`, `WeaponAttackDataModel.mts`, `MeleeAttackDataModel.mts`/`RangedAttackDataModel.mts`, `combatantActionEconomy.mts`, `detectWieldMode()`/`getWieldModeStrTerm()`/`wieldModeToBabHand()` on `ActorDnd35e`). This section's stale "NOT STARTED" note (previously here) was corrected once Story D began — always re-verify against the phase doc + codebase, not just this file.
- [x] Story D — Attack trigger, execution engine & attack card (D.1 engine primitives → D.2 dialog extension → D.3 `executeAction()`/`useAction()`/attack card → D.4 Token HUD control + Actions tab UI) — all checklist items checked off in `phase-10-basic-combat.md`; D.4 user-tested and approved in Foundry, all four sub-parts committed. See the detailed D.1–D.4 breakdown below.

**Renumbering note**: with all three spikes resolved, the remaining stories (formerly D–K) were relettered A–H in `phase-10-basic-combat.md` (D→A, E→B, F→C, G→D, H→E, I→F, J→G, K→H). The retired spike letters A/B/C were renamed to Spike 1/2/3 to free them up. All cross-references, the Parallelization diagram, and its prose were updated accordingly.

## Current Section
Story D is fully complete. **Story E (Roll Defense Dialog & attack resolution) has not been started** — do not begin it without explicit user go-ahead.

## Story D Detail (D.1–D.4 breakdown)
- [x] Story D.1 — Engine primitives (`DamageRoll`, `preUseAction`/`postUseAction`/`dealDamage`/`undoDealDamage` events) — complete, committed.
- [x] Story D.2 — Attack Roll Dialog extension (`combatModifiers`, `damageBonus`, Wield Mode toggle, reserved Ammo slot) — complete, committed. `isFlanking()`/`isOnHigherGround()` auto-detection wiring deferred to D.3 (Flanking specifically stays manual-only, deferred to Story G — see decision below).
- [x] Story D.3 — `executeAction()`/`useAction()`/attack card — complete (see prior session notes; `Creature.useAction()` shipped).
- [x] Story D.4 — Token HUD control + Actions tab UI — **user-tested and approved in Foundry**: Actions tab rename (`CombatTab`→Actions, `AttackBonusSection.vue` deleted), `WeaponsSection.vue` real data + attack button, and the Token HUD Vue-takeover (`TokenHudDnd35e.mts`/`TokenHudApp.vue`/`tokenHudActions.mts`/`tokenHudTypes.mts`, registered via `CONFIG.Token.hudClass`). Phase doc checklist items checked off; committed. **Story D is now fully complete** (all checklist items in `phase-10-basic-combat.md` checked off) — next up is Story E (Roll Defense Dialog & attack resolution), not yet started.

**Story D breakdown** (agreed with user before starting): D.1 engine primitives → D.2 dialog extension → D.3 `executeAction()`/`useAction()`/attack card → D.4 Token HUD control + Actions tab UI (HUD render approach to be spiked at the start of D.4).

**D.4 architecture decision**: user explicitly confirmed ("let's go vue take over on the hud....") a full Vue takeover of `TokenHUD` rather than a lighter Handlebars-subclass decoration — mirrors `CombatTrackerDnd35e`'s established pattern exactly (`useVueAppBaseMixin(foundry.applications.hud.TokenHUD)`, `reactive()` context object mutated in `_replaceHTML`, registered via `CONFIG.Token.hudClass`). Every native control's markup (classes, `data-action`/`data-palette`/`data-status-id`/`data-movement-action`/`data-level-id` attributes, input `name`s) is byte-faithfully reproduced in `TokenHudApp.vue` so `BasePlaceableHUD`'s/`TokenHUD`'s inherited click-handling and `movementActionHudDecoration.mts`'s `renderTokenHUD` hook (grey-out + provokes badge) keep working unmodified — confirmed via reading core's `token-hud.mjs`/`placeable-hud.mjs`/`token-hud.hbs` in full, and via checking `#token-hud .col`'s CSS (all descendant selectors, `height: calc(100% + 100px)` — meaning the new bottom row is deliberately its own `.dnd35e-hud-actions` div, NOT a 4th `.col`, to avoid inheriting that flanking-column sizing rule).

Two new `data-action`s added to `TokenHudDnd35e`'s `DEFAULT_OPTIONS.actions` (merged via `foundry.utils.mergeObject(super.DEFAULT_OPTIONS, ...)`, same pattern as `D20RollDialogConfig.mts`): `attackAction` (Weapon Attacks palette entry — calls `Creature.useAction()`, same target-required guard as `WeaponsSection.vue`'s `onAttack()`) and `combatManeuver` (Combat Maneuvers palette entry — Total Defense is UI-shell-only this story per Story E's ownership of the actual mechanic; click shows a "not yet implemented" `ui.notifications.info`). Disabled entries (can't afford the attack right now) are marked via `data-enabled="false"` read by the click handler itself, rather than a separate DOM capture-listener (simpler than `movementActionHudDecoration.mts`'s approach since we fully control the markup and don't need to layer onto pre-existing native entries).

**Type-system gaps found and patched** (ambient `.d.mts` under-specification, same class of issue as the CombatDnd35e `_onStartRound` context-param gap from Story A): `CONFIG.Token` doesn't declare `hudClass` at all (backfilled via `src/global.mts`'s `ConfigDnd35e` interface: `Token: ThisConfig['Token'] & { hudClass: typeof TokenHUD }`, not by editing the generated ambient `.d.mts` directly); `PlaceableHUDContext` is only `{ _id: string; id: string }` (near-empty ambient stub) — `TokenHudContext` includes those two fields purely to satisfy the override's structural return-type contract.

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
- **Total Defense's actual mechanic** (spend standard action + apply the `+4 AC` self-AE tagged
  `TOTAL_DEFENSE_CONDITION_ID`) → Story E, per the phase doc's own `combatConditionAEs.mts` note.
  D.4's Combat Maneuvers HUD entry is a UI shell only — clicking it currently shows a "not yet
  implemented" notice.
- **⚠️ Needs triage with user**: `attackFormula.resolvedValue` currently has no BAB or ability-modifier
  term baked in anywhere in the attack pipeline (`_executeCheck()` only appends `flatPenalty`/
  `situationalModifier`) — confirmed by direct code reading, contradicting the phase doc's early-draft
  pseudocode (`1d20 + #self.attributes.bab.total + ...`) which is stale/superseded. Both the sheet's
  `WeaponsSection.vue` and the new Token HUD Weapon Attacks palette surface this same incomplete
  math. Not fixed this session (out of scope for the HUD/Actions-tab work) — flag to user: bug to
  fix now, or intentionally deferred to a specific not-yet-identified checklist item?

## Knowledge Cached
- None yet — consider delegating to @kb-curator once more of Phase 10 lands (Foundry v14 vision/
  lighting API surface: `CanvasVisibility`, `DetectionMode`, darkness-level scalars vs. Region
  darkness-level behavior vs. `canvas.effects.lightSources`/`testPoint()`/`radius`/`ratio` point-level
  detection; CombatTracker's `_prepareTurnContext()`/`static PARTS` subclass pattern; AE v14 duration
  schema refactor (`value`/`units`/`expiry`/`expired` + `start{combat,combatant,...}`) and
  `ActiveEffect.registry`/`isExpiryEvent()`/`expiryAction` — useful for any future AE-duration work).

