# SilverSmith Progress — POC Phase 10 (Basic Combat)

## Completed Sections
- [x] Spike 1 — Concealment auto-detection spike — resolved **no-go** (revisited: light-source-radius detection *is* feasible, logged to wishlist, still no code this phase)
- [x] Spike 2 — Combat tracker extension API spike — resolved **subclass** (no DOM-injection fallback needed)
- [x] Spike 3 — AE short-duration expiry mechanism spike — resolved **native mechanism, no custom hook**

**Renumbering note**: with all three spikes resolved, the remaining stories (formerly D–K) were relettered A–H in `phase-10-basic-combat.md` (D→A, E→B, F→C, G→D, H→E, I→F, J→G, K→H). The retired spike letters A/B/C were renamed to Spike 1/2/3 to free them up. All cross-references, the Parallelization diagram, and its prose were updated accordingly.

## Current Section
- None in progress — awaiting direction on next story (A, B, C; all independent foundations)

## Decisions Made
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

