# POC Phase 9: Basic Tokens

**Status**: 🔶 In Progress (Story 1, 2 & 4 complete; Story 3 nearly complete — E2E verification outstanding)

> **Milestone**: POC  
> **Dependencies**: poc.6  
> **Goal**: A token can be created on a scene, moved, and correctly reflects its actor. Token has the right document and canvas classes, actor linkage, size derived from `system.size`, and HP bar by default. Movement budget is visualized on the ruler, and D&D senses (darkvision, low-light vision, tremorsense) are automatically wired to Foundry canvas vision — no manual GM configuration needed. Polished proof before poc.10 (Basic Combat) depends on tokens.

---

## Overview

Phase 6 creates `ActorDnd35e` and the character schema. Phase 9 wires it to the Foundry canvas so actors appear as tokens on the table, with polished movement and vision behavior — not just a thin placement proof. Foundry handles the placement mechanics out of the box; the added value is the ruler budget display and the senses-to-vision pipeline, both of which are new for this system.

**Existing scaffolding (already in `src/`):**
- `TokenDnd35e` canvas class at `src/canvas/token/TokenDnd35e.mts` — stub extending `fc.placeables.Token`. Typed, not yet registered.
- `TokenDocumentDnd35e` at `src/documents/scene/tokenDocument/TokenDocumentDnd35e.mts` — **type alias only**, not a real class. Phase 9 converts it.
- `SIZES` constant at `src/constants/sizes.mts` — all 9 size categories defined.

**What Phase 9 adds:**
1. `SIZE_TOKEN_DIMENSIONS` size → grid square mapping in `sizes.mts`
2. `TokenDocumentDnd35e` becomes a real class with `_preCreate()` for size derivation
3. `Creature._preCreate()` sets prototype token defaults (disposition, HP bar, basic vision) — lives on `Creature`, not `ActorDnd35e`, since senses/size-adjacent creature data lives there and it type-safely covers all creature actor types (character, future NPC)
4. Register `CONFIG.Token.documentClass`, `CONFIG.Token.objectClass` (`CONFIG.Actor.documentClass` already registered by Phase 6)
5. `TokenRulerDnd35e` subclass for movement budget display (distance / speed, path color changes when budget exceeded)
6. Full vision system: map D&D senses (darkvision, low-light, tremorsense) to Foundry visionMode/detectionModes
7. Wire senses to tokens: `Creature._preCreate()` applies default vision; update hooks sync changes

---

## 9.1 Size Category → Token Dimensions

D&D 3.5e size categories map to Foundry grid squares (width = height, token is always square):

| Size | Grid squares |
|------|-------------|
| Fine | 0.5 |
| Diminutive | 0.5 |
| Tiny | 1 |
| Small | 1 |
| Medium | 1 (default) |
| Large | 2 (2×2) |
| Huge | 3 (3×3) |
| Gargantuan | 4 (4×4) |
| Colossal | 6 (6×6) |

```typescript
// src/constants/sizes.mts — add alongside existing SIZES constant
const SIZE_TOKEN_DIMENSIONS: Record<Size, number> = {
  fine: 0.5,
  diminutive: 0.5,
  tiny: 1,
  small: 1,
  medium: 1,
  large: 2,
  huge: 3,
  gargantuan: 4,
  colossal: 6,
} as const;
```

---

## 9.2 TokenDocumentDnd35e (Real Class)

Convert from a type alias to a real class. `_preCreate()` reads actor size and sets token dimensions.

```typescript
// src/documents/scene/tokenDocument/TokenDocumentDnd35e.mts
import TokenDocument from '@client/documents/token.mjs';
import { SIZE_TOKEN_DIMENSIONS } from '@constants/sizes.mjs';
import type { SceneDnd35e } from '../SceneDnd35e.mjs';

class TokenDocumentDnd35e<TParent extends SceneDnd35e | null = SceneDnd35e | null>
  extends TokenDocument<TParent> {

  override async _preCreate(
    data: PreCreate<foundry.documents.TokenSource>,
    options: object,
    user: foundry.documents.User
  ): Promise<boolean | void> {
    const result = await super._preCreate(data, options, user);
    if (result === false) return result;

    const size = (this.actor as ActorDnd35e | null)?.system?.size;
    if (size && size in SIZE_TOKEN_DIMENSIONS) {
      const dim = SIZE_TOKEN_DIMENSIONS[size as Size];
      this.updateSource({ width: dim, height: dim });
    }
    return result;
  }
}

export { TokenDocumentDnd35e };
```

---

## 9.3 Actor Prototype Token Defaults

`Creature._preCreate()` sets sensible prototype token defaults for new creature-type actors (currently Character; automatically covers future NPC types too) so they don't need manual configuration after creation. Placed on `Creature` rather than `ActorDnd35e` because it's the shared base for all creature actor types and keeps this type-safe without a `this.type === 'character'` string check.

Includes basic vision (`sight.enabled: true`) so placed tokens can see the scene. No darkvision or other senses yet — that's Story 3.

The default values themselves are extracted into a pure helper, `buildPrototypeTokenDefaults()`, so they can be unit tested without needing the full Document class chain:

```typescript
// src/documents/actors/creature/logic/buildPrototypeTokenDefaults.mts
const buildPrototypeTokenDefaults = (): PrototypeTokenDefaults => ({
  actorLink: true,
  disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
  displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
  displayName: CONST.TOKEN_DISPLAY_MODES.OWNER,
  bar1: { attribute: 'hp' },
  sight: { enabled: true, visionMode: 'basic' },
});

// Creature.mts
protected override async _preCreate(
  data: this['_source'],
  options: DatabaseCreateCallbackOptions,
  user: foundry.documents.BaseUser
): Promise<boolean | void> {
  const result = await super._preCreate(data, options, user);
  if (result === false) return false;

  this.updateSource({ prototypeToken: buildPrototypeTokenDefaults() });
}
```

---

## 9.4 Registration

```typescript
// In registerActors() init hook (or a dedicated canvas registration function):
CONFIG.Token.objectClass   = TokenDnd35e;
CONFIG.Token.documentClass = TokenDocumentDnd35e;
CONFIG.Actor.documentClass = ActorProxyDnd35e;  // already completed in Phase 6
```

---

## 9.5 Movement Speed, Ruler, and Vision

### Schema dependency

Phase 6 §5.1 plans `speed: { land, climb, swim, burrow, fly }` on `ActorSystemModelBase`, each a single persisted number field.

> **Animation speed skipped**: `Token._getAnimationMovementSpeed()` (visual slide speed across canvas) is NOT wired to actor land speed in poc.9. Other Foundry systems don't typically do this, and Foundry's default (6 squares/sec) is acceptable — the effort isn't justified for POC. Revisit later if desired.

### Vision System: Senses to Canvas Vision

**What we want**: Actor senses (darkvision, low-light, tremorsense) automatically wire to token vision modes and detection modes. GMs create a dwarf with darkvision 60ft, place it on the canvas, and the token can immediately see in darkness without manual Foundry UI config.

**D&D 3.5e Senses → Foundry Mapping**:

| D&D Sense | visionMode | detectionMode | How it works |
|-----------|-----------|---|---|
| Darkvision | `'darkvision'` | `'basicSight'` (range) | See in grayscale, distance limited |
| Low-light vision | `'lightAmplification'` | `'basicSight'` (range) | Enhanced dim-light vision |
| Tremorsense | (none — keep `'basic'`) | `'feelTremor'` (range) | Detect via vibrations, works in darkness |

**Exclusivity rule**: Only one visionMode can be active. If actor has multiple senses, priority is: darkvision > low-light > basic.

DetectionModes stack — actor can have tremorsense + seeInvisibility all active at once.

**Implementation**:
- Helper `_buildTokenVisionFromSenses(senses[])` — maps D&D sense array to Foundry `sight` and `detectionModes[]` objects
- `Creature._preCreate()` — wire default vision (if no senses, use `sight.visionMode: 'basic'`)
- Update hook on actor senses changes → sync token vision live

**Scope for POC**: Implement darkvision + low-light + tremorsense. Defer blindsight/scent (would need custom DetectionMode subclasses) to Alpha vision phase.

### Ruler / Movement Budget Display

**What we want**: while dragging a token, the ruler label shows "25 / 30 ft" (distance used vs. budget) and the path line or waypoint marker changes color when the budget is exceeded.

**Implementation**:
- Subclass `TokenRuler` as `TokenRulerDnd35e`
- Override `_getWaypointLabelContext()` — inject `{ distance, budget }` for label template
- Override `_getWaypointStyle()` — color waypoint red if beyond budget
- Override `_getSegmentStyle()` — color path line red if segment goes beyond budget

**Spike at phase start**: Confirm `TokenPlannedMovement` exposes movement cost API and verify no hard requirement on combat mechanics. If API is insufficient, defer to poc.10 and document the blocker.

### Movement Action Gating (`CONFIG.Token.movement.actions`)

Foundry v13+'s Movement Action system (Token HUD "select movement action" button) ships 9 generic actions (`walk`, `fly`, `swim`, `burrow`, `crawl`, `climb`, `jump`, `blink`, `displace`), each `canSelect(token) => true` by default — every token can select every action regardless of whether the actor can actually do it.

**What we want**: only show movement actions the actor's `system.speed` actually supports, and never show actions we haven't implemented rules for yet.

**Gating rules for poc.9**:
- `walk` — always selectable (default, untouched).
- `fly`, `swim`, `burrow`, `climb` — `canSelect` gated on `(actor?.system?.speed?.<action> ?? 0) > 0` via `SPEED_GATED_ACTIONS`/`canSelectSpeedGatedMovementAction()`. Wired in the actor init hook (`registration.mts`), same place as the other `CONFIG.Token` registration. **`climb` was moved into this speed-gated set rather than disabled** — a creature with a persisted climb speed (spider climb, natural climbers) can already select it; a creature without one still can't. Full Climb-*skill*-based climbing (DC check per move, half speed without a climb speed, fall risk on failure) is still deferred — revisit once the skill-check system exists (tracked in `WISHLIST.md`).
- `run` — **new dnd35e-specific action, not one of Foundry's built-in defaults**: SRD running (move up to 4x land speed, straight line only). Gated the same way as `fly`/`swim`/`burrow`/`climb` — `canSelect` on `system.speed.land > 0` (same `SPEED_GATED_ACTIONS` map, mapped to the `land` speed key with a 4x multiplier for animation/budget purposes). The straight-line SRD constraint is enforced separately, by `TokenDnd35e#_addDragWaypoint` refusing intermediate waypoints while `run` is the active action. Config built by `buildRunMovementActionConfig()`, registered in `registerActors()` alongside the other `CONFIG.Token.movement.actions` entries. Addition beyond original spec.
- `crawl` — **disabled outright**: `canSelect: () => false`. 3.5e ties crawling to being prone, which doesn't exist yet as a condition. Revisit once the condition system lands (tracked in `WISHLIST.md`).
- `jump` — **disabled outright**: `canSelect: () => false`. 3.5e's Jump is a skill check for a single leap distance, not a sustained drag-across-the-canvas movement mode — Foundry's generic `jump` action (flat 2x cost multiplier) doesn't represent that. Revisit once the skill-check system exists (tracked in `WISHLIST.md`).
- `blink`, `displace` — **disabled outright**: `canSelect: () => false`. Both represent spell/effect-granted teleportation (Dimension Door, Teleport, Blink) — not a default movement mode any actor should always have available. Revisit once spell-granted movement/teleport effects exist (tracked in `WISHLIST.md`).

---

## Phase Delivery Plan

Three sequential stories with some parallelization.

```
Story 1
  ↓
Story 2 (parallel: spike TokenRuler)
Story 3 (spike: vision architecture)
  ↓
Implementation: Vision wiring to tokens
```

### Story 1 — Token placement, sizing, actor linkage, and vision

**User**: GM  
**Delivers**: Character actor dragged to scene appears as a correctly-sized, actor-linked token with HP bar and basic vision enabled.  
**Depends on**: Phase 6 (CharacterSystemModel, ActorDnd35e in place).

**Commits:**
1. **`SIZE_TOKEN_DIMENSIONS` + real `TokenDocumentDnd35e` class** — add size mapping to `sizes.mts`; convert `TokenDocumentDnd35e` from type alias to real class with `_preCreate()`. Size field itself lives on base `ActorSystemModel` (not `CreatureSystemModel`) so every actor type gets token sizing for free. *(Unit tests: all 9 size categories map correctly; Medium → 1, Large → 2, Huge → 3 — done in `tokenDocument.model.test.mts`)*
2. **Actor prototype token defaults** — `Creature._preCreate()` (not `ActorDnd35e`) calling pure helper `buildPrototypeTokenDefaults()` for `actorLink`, `disposition`, `displayBars`, `displayName`, `bar1`, `sight`. *(Unit tests: `actorLink: true`, `bar1.attribute: 'hp'`, `sight.enabled: true` — done in `buildPrototypeTokenDefaults.test.mts`)*
3. **Registration** — wire `CONFIG.Token.objectClass`, `CONFIG.Token.documentClass` in init hook (`CONFIG.Actor.documentClass = ActorProxyDnd35e` already registered by Phase 6's `registerActors()`). Confirmed via dev testing; no dedicated unit test (one-line CONFIG wiring, would require new CONFIG/Hooks mocks for no logic coverage).

**E2E acceptance**: Create Character actor (Large, HP 20) → drag to scene → 2×2 token placed → HP bar shows 20/20 → move token → position persists after page reload.

---

### Story 2 — Movement Budget Display (Ruler)

**User**: GM / Player  
**Delivers**: While dragging a token, ruler labels show distance traveled and remaining movement budget; path turns red when budget exceeded.  
**Depends on**: Story 1 (tokens placed and movable).

**Spike (parallel)**:
1. **TokenRuler API investigation** — Confirm `TokenPlannedMovement` exposes waypoint cost/distance API; verify no hard blocker on combat mechanics before ruler can function.
2. **TokenRuler registration mechanism (unconfirmed)** — Our bundled type definitions expose `CONFIG.Canvas.rulerClass: typeof Ruler`, which is the generic canvas measuring Ruler, **not** the per-token `TokenRuler` used while dragging a token (`Token#ruler: BaseTokenRuler`). No `CONFIG.Token.rulerClass` hook exists in the type defs. Determine at spike time whether Token exposes a static `rulerClass` property to override (subclass responsibility, similar to how `TokenDnd35e` overrides other protected methods), or another extension point. If no clean hook exists, document the finding and consider deferring Story 2 to poc.10.

**Commits** (if spike succeeds):
1. **`TokenRulerDnd35e` subclass** — extend `TokenRuler`, override `_getWaypointLabelContext()`, `_getWaypointStyle()`, `_getSegmentStyle()` to inject distance budget labels and path coloring. *(Unit test: waypoint beyond 30ft budget returns red color)*
2. **Movement budget calculation** — read `actor.system.speed.land` (single persisted field) as the token's movement budget. *(Unit test: 30ft speed actor returns 30 from budget getter)*
3. **Path coloring logic** — cumulative distance per segment; flag segment red if total distance exceeds budget. *(Unit test: 40ft drag on 30ft actor marks last 10ft red)*
4. **Movement action gating** — wire `CONFIG.Token.movement.actions.{fly,swim,burrow,climb}.canSelect` to the matching `system.speed.*` field; explicitly disable `crawl`, `jump`, `blink`, `displace` (`canSelect: () => false`) until their prerequisite systems (prone condition, skill checks, spell-granted teleport) exist. See "Movement Action Gating" in §9.5. *(Unit tests: gate function returns true/false per speed value; crawl/jump/blink/displace gates always return false)*

**E2E acceptance**: Drag token 40ft (actor has 30ft speed) → first 30ft normal color, last 10ft red → label shows "40 / 30 ft". Token HUD movement-action menu does not offer crawl, jump, blink, or displace (offers climb only if the actor has a climb speed).

---

### Story 3 — Vision System (Darkvision, Low-light, Tremorsense)

**User**: GM / Player  
**Delivers**: Actor with darkvision/low-light/tremorsense automatically appears on canvas with those senses active. Token can see in darkness, detect via tremors, etc. No manual Foundry UI config needed.
**Depends on**: Story 1 (tokens placed) + Phase 6 (senses schema exists on CreatureSystemModel.bio.senses).

**Spike (sequential after Story 1)**:
1. **D&D sense → Foundry architecture** — verify visionMode is exclusive, detectionModes are stackable arrays; confirm Foundry has pre-built darkvision, lightAmplification, feelTremor; determine if custom DetectionMode is required for scent/blindsight (defer if yes).
2. **Sense priority logic** — if actor has darkvision + low-light, which visionMode wins? Answer: darkvision (strictly better). Define precedence: darkvision > low-light > basic.

**Commits**:
1. **`buildTokenVisionFromSenses()` helper** (`src/canvas/token/logic/tokenVision.mts`, matching the Story 2 convention of colocating token-canvas pure logic) — pure function mapping `system.bio.senses[]` array to Foundry `sight` and `detectionModes[]` objects. *(Unit test: darkvision 60ft → `{visionMode: 'darkvision', range: 60}`; tremorsense 120ft → `{id: 'feelTremor', range: 120}`; both → visionMode darkvision + both detectionModes)*
2. **Wire to `Creature._preCreate()`** — apply default vision (build from senses array or fall back to basic if none), merged into `buildPrototypeTokenDefaults()`.
3. **Unit tests** — sense mapping for all 3 types, priority resolution (multiple visionModes), no regression on basic vision.
4. **E2E tests** — create dwarf with darkvision, place on dark scene, token can see.

> **No live-sync hook**: a placed token's `sight`/`detectionModes` are copied once from `prototypeToken` at creation and never re-derived from the actor afterward — this matches standard Foundry behavior (editing an actor doesn't retroactively update already-placed tokens; the GM re-drags/recreates the token, or edits it directly, to pick up changes). poc.9 accepts this rather than building a bespoke `updateActor` → `updateEmbeddedDocuments('Token', ...)` sync hook. Tracked in `WISHLIST.md` if this proves painful in practice.

**E2E acceptance**: Dwarf (darkvision 60ft) dragged to dark scene → token sight cone renders in grayscale, sees 60ft in darkness.

---

### Story 4 — Item Effects Tab Consolidation (Materials/Secrets merged, per-category rows)

**User**: GM / Player
**Delivers**: A single unified Effects table on item sheets (no more separate Materials/Secrets sub-lists), with a GM-only "Secret" category and a reusable per-category row-rendering pattern for future categories (e.g. armor/inventory).
**Depends on**: Phase 1/2 item + AE foundation (unrelated to this phase's token/vision work; tracked here per author's request).

**Commits:**
1. **4.A — Merge Materials/Secrets into the main effects table** — refactor `ItemEffects.vue` onto `CategorizedListTable`; add a per-category row-component registry (`resolveEffectRowComponent`) defaulting to the generic `EffectRow`, with a dedicated `SecretEffectRow`; fold Secret creation into the single generic "Create Effect" dialog (GM-only type option via `createEffect(additionalTypes)`); materials become GM/`isHidden`-filtered rows like any other effect, secrets stay GM-only via `updateGmOnlyEffectTypes`; delete `MaterialsList.vue`/`SecretsList.vue`/`EffectCategory.vue`.
2. **4.B — Condition config data** — condition config data + `CONFIG.statusEffects` registration so conditions surface as a category in the same table.
3. **4.C — Actor Effects tab** — rename Actor's Buffs tab to Effects, add condition grid, delete dead `ActorEffectsTab.vue`.

**E2E acceptance**: GM opens an item with a material and a secret effect → both appear as rows in one table, secret row only visible to GM → GM creates a new effect via "Create Effect", sees "Secret" as a type option (player does not) → GM clicks "Reveal All Secrets" → secret effects disable.

---

## Completion Checklist

### 🔶 In Progress

**Size mapping:**
- [x] Add `SIZE_TOKEN_DIMENSIONS: Record<Size, number>` to `src/constants/sizes.mts`
- [x] Export `SIZE_TOKEN_DIMENSIONS` from `sizes.mts`
- [x] `size` field moved from `CreatureSystemModel`/`CreatureSystemData` to base `ActorSystemModel`/`ActorSystemData` (all actor types have a size, not just creatures)

**TokenDocumentDnd35e:**
- [x] Convert `TokenDocumentDnd35e` from type alias to real class extending `TokenDocument`
- [x] Override `_preCreate()` to derive `width`/`height` from `actor.system.size`
- [x] Update `src/documents/scene/tokenDocument/index.mts` to export the class (not just the type)

**Actor prototype token defaults:**
- [x] Override `Creature._preCreate()` to set prototype token defaults (covers all creature actor types, not gated by `type === 'character'`)
- [x] Defaults: `actorLink: true`, `disposition: FRIENDLY`, `displayBars: OWNER_HOVER`, `displayName: OWNER`, `bar1.attribute: 'hp'` — extracted into pure `buildPrototypeTokenDefaults()` helper for testability
- [x] Vision defaults: `sight.enabled: true`, `sight.visionMode: 'basic'`

**Registration:**
- [x] Register `CONFIG.Token.objectClass = TokenDnd35e` in init hook
- [x] Register `CONFIG.Token.documentClass = TokenDocumentDnd35e` in init hook
- [x] Confirm `CONFIG.Actor.documentClass = ActorProxyDnd35e` is already registered by Phase 6's `registerActors()` (verified in code — no action needed)

**Story 1 unit tests:**
- [x] `tests/unit/models/tokenDocument.model.test.mts` — all 9 size categories map correctly
- [x] `tests/unit/models/buildPrototypeTokenDefaults.test.mts` — actorLink, disposition, display modes, HP bar, basic vision

**Story 1 status: done, dev-tested in Foundry, unit tests passing.**

### ✅ Story 2 Complete

**Movement budget display (Story 2):**
- [x] Create `src/canvas/token/TokenRulerDnd35e.mts` subclass extending `TokenRuler`
- [x] Override `_getWaypointLabelContext()` to inject the movement budget total into the waypoint label template
- [x] Override `_getWaypointStyle()` to color waypoint red once over budget
- [x] Override `_getSegmentStyle()` to color segment line red once cumulative distance exceeds budget
- [x] Add `getMovementBudget()`/`isOverBudget()` helpers (`src/canvas/token/logic/movementBudget.mts`) reading actor speed as the movement budget
- [x] Wire `CONFIG.Token.movement.actions.{climb,fly,swim,burrow}.canSelect` to the matching `system.speed.*` field (> 0) via `SPEED_GATED_ACTIONS`/`canSelectSpeedGatedMovementAction()` in `movementActionGating.mts` — `climb` was moved into this speed-gated set rather than disabled outright (a creature with a natural climb speed can already select it; see the Deferred Exploration note in phase-02 §8.8 for the future Climb-skill-check extension covering creatures without one)
- [x] Disable `crawl`, `jump`, `blink`, `displace` movement actions (`canSelect: () => false`) until their prerequisite systems (prone condition, spell-granted teleport) exist (see WISHLIST.md)
- [x] Spike resolved: `CONFIG.Token.movement.actions[action].canSelect` (`TokenMovementActionConfig`) is the correct per-action gating extension point — a custom `TokenRuler` override is only needed for the budget/color visualization, not gating
- [x] Spike resolved: `CONFIG.Token.rulerClass` is the correct extension point for `TokenRulerDnd35e` (confirmed in `types/foundry/client/config.d.mts`; registered in `registerActors()`)
- [x] **Addition beyond original spec**: dnd35e-specific `run` movement action (4x land speed, straight-line-only via `TokenDnd35e#_addDragWaypoint`) registered via `buildRunMovementActionConfig()` and gated the same way as the other speed-based actions — see `RUN_MOVEMENT_ACTION`/`RUN_SPEED_MULTIPLIER` in `movementActionGating.mts`

**Story 2 unit tests:**
- [x] `tests/unit/models/movementBudget.test.mts` — budget resolution per action, over-budget marking
- [x] `tests/unit/models/movementActionGating.test.mts` — speed-gated `canSelect` resolution, disabled actions always return false

**Story 2 status: done, dev-tested in Foundry (ruler display, run action, movement gating all confirmed live). E2E coverage deliberately deferred — see Tests section below.**

### ❌ Not Started

**Vision system (Story 3):**
- [x] **Addition beyond original spec**: `CreatureSenses.vue`/`DistanceValueUnitInput.vue` — low-light vision rows no longer prompt for a distance (Foundry's `lightAmplification` visionMode has no fixed-range component, unlike `darkvision`; RAW low-light only doubles existing light radius)
- [x] Create `src/canvas/token/logic/tokenVision.mts` with `buildTokenVisionFromSenses(senses[])` helper
- [x] Mapping: darkvision → visionMode `'darkvision'` + `sight.range` + detectionMode `'basicSight'`
- [x] Mapping: low-light → no `sight.visionMode`/`sight.range` contribution (plain `'basic'` sight; RAW distance-doubling handled separately by the light-source radius multiplier, not the vision-mode shader — see note below)
- [x] Mapping: tremorsense → visionMode unchanged + detectionMode `'feelTremor'`
- [x] Priority logic: if actor has multiple visionModes, darkvision > low-light > basic
- [x] Unit tests: all 3 sense mappings work; priority resolution; basic vision fallback (`tests/unit/models/tokenVision.test.mts`)
- [x] Update `Creature._preCreate()` (via `buildPrototypeTokenDefaults(senses)`) to call `buildTokenVisionFromSenses()`
- [ ] E2E tests: dwarf with darkvision placed on dark scene sees correctly
- [ ] **Wishlisted, not built**: live sync hook so senses changes propagate to already-placed tokens — matches standard Foundry behavior of tokens not auto-updating from actor edits (see `WISHLIST.md`)

**Type-def fix discovered while researching Story 3**: `types/foundry/common/documents/token.d.mts` declared `detectionModes` as an `ArrayField<{id, enabled, range}>`, but real Foundry v14.359 core (`common/documents/token.mjs`) defines it as a `TypedObjectField<{enabled, range}>` — a keyed record (e.g. `{ basicSight: { range: 60 } }`), not an array, and there is no `id` sub-field (the object key is the id). Fixed the bundled stub to match reality.

**Design correction after low-light radius multiplier landed**: `buildTokenVisionFromSenses()` originally mapped low-light vision to `sight.visionMode: 'lightAmplification'`. Once the radius-doubling `_getLightSourceData()` override (below) was added, this became double-counting — `lightAmplification` is a per-token brightness re-shade (dim→bright, bright→brightest), stacked on top of a light source whose radius is *already* doubled, producing an area that's both wider and brighter (neither RAW nor the intended design). Corrected: low-light vision now maps to plain `'basic'` sight; the radius multiplier alone delivers RAW's "see twice as far."

**Low-light radius multiplier (D35E parity, added beyond original spec)**: Foundry's stock `lightAmplification` visionMode has no distance/radius component at all — it's a pure categorical re-shade (dim→bright, bright→brightest), confirmed by reading `client/config.mjs` and `client/canvas/perception/vision-mode.mjs` (the `lighting.multipliers` schema field exists but is never consumed anywhere in core). This does not deliver RAW's literal "see twice as far in dim light." D35E achieves the literal doubling via a `_getLightSourceData()` override on both `Token` and `AmbientLight` placeables that multiplies the returned `dim`/`bright` radii (`module/canvas/low-light-vision.js`, default multiplier 2 from `module/actor/entity.js`). Reproduced this for dnd35e:
- [x] `src/canvas/vision/logic/lowLightVision.mts` — pure: `getLowLightMultiplier(senses)`, `scaleLightRadius(data, multiplier)`
- [x] `src/canvas/vision/sharedVisionPool.mts` — impure: queries `canvas.tokens.placeables` + `game.user` permissions, delegates to the shared-vision-source resolver (see "Shared Vision Scope" below) for `getActiveLowLightMultiplier()`
- [x] `src/canvas/light/AmbientLightDnd35e.mts` — new `AmbientLight` placeable subclass, overrides `_getLightSourceData()`
- [x] `TokenDnd35e#_getLightSourceData()` override (token's own emitted light, e.g. a held torch)
- [x] Registered `CONFIG.AmbientLight.objectClass = AmbientLightDnd35e` in `registration.mts`
- [x] Unit tests: `tests/unit/models/lowLightVision.test.mts` (multiplier lookup, radius scaling)
- [x] E2E: `tests/e2e/low-light-vision.spec.ts` — selecting a low-light token doubles its radius; switching selection shrinks it back down

**Shared Vision Scope (added beyond original spec, replaces an earlier `visionPermission` per-user grant grid)**: dnd35e also needed a way for a token's vision (and its low-light boost) to pool with other tokens the user isn't currently controlling — e.g. a party's passive vision when nothing's selected. An initial per-user `flags.dnd35e.visionPermission` grant grid (D35E `VisionPermissionSheet` port) was built, then redesigned after review. Investigating Foundry's own `Token#_isVisionSource()` (`client/canvas/placeables/token.mjs`) revealed it *already* implements "controlled token(s) always win; otherwise, an OBSERVER-permitted token with sight contributes only while nothing else is controlled" natively — and that overriding the public `observer` getter (the original approach) has **no effect on vision-source selection at all**, since nothing in core consults it for that purpose. The redesign extends `_isVisionSource()` directly instead:
- [x] `src/canvas/vision/logic/sharedVisionScope.mts` — pure: `resolveEffectiveVisionScope(actorScope, worldScope)`, `resolveSharedVisionSource(context)` (extends Foundry's own controlled/observer-fallback rule with scope + selection-mode)
- [x] `src/canvas/vision/sharedVisionPool.mts` — impure: `isSharedVisionSource(token)`, `getActiveLowLightMultiplier()`, `reinitializeSharedVision()`, `broadcastVisionRefresh()`
- [x] World setting `sharedVisionScope` (`none`/`owned`/`partyMembers`, default `owned`) — who the shared-vision pool draws from
- [x] World setting `sharedVisionMode` reworked (`passiveWhenUnselected` default / `alwaysShared`) — whether the pool applies alongside a selection or only when nothing's selected
- [x] Per-actor override flag `flags.dnd35e.sharedVisionScope` (`default`/`none`/`owned`/`partyMembers`) — lets an individual actor (e.g. a future companion) opt out of automatic sharing even under `owned` scope, until a future ability/class feature explicitly grants it
- [x] `TokenDnd35e#_isVisionSource()` override (replaces the removed `observer` getter override)
- [x] `SettingsTab.vue` — actor-level `sharedVisionScope` select replaces the old per-user grant grid
- [x] Unit tests: `tests/unit/models/sharedVisionScope.test.mts`
- [ ] E2E/manual verification: GM sets `sharedVisionScope: partyMembers`, grants OBSERVER permission across party actors, confirms deselecting all tokens pools party vision; a `sharedVisionScope: none`-flagged actor never pools even when owned

**Tests:**
- [x] Unit: `SIZE_TOKEN_DIMENSIONS` covers all 9 size categories
- [x] Unit: Medium → 1, Large → 2, Huge → 3, Colossal → 6
- [x] Unit: new Character actor `prototypeToken.actorLink` is `true`
- [x] Unit: new Character actor `prototypeToken.bar1.attribute` is `'hp'`
- [x] Unit: new Character actor `prototypeToken.sight.enabled` is `true`
- [x] Unit: `TokenDocumentDnd35e._preCreate()` sets 2×2 for a Large actor
- [x] Unit: `CONFIG.Token.objectClass` is `TokenDnd35e` after init hook runs
- [x] Unit: `buildTokenVisionFromSenses([{type: 'darkvision', distance: 60}])` → `{sight: {visionMode: 'darkvision', range: 60}, detectionModes: {basicSight: {range: 60}}}` (shape corrected to match Foundry's real keyed-object `detectionModes` schema, not an array)
- [x] Unit: priority logic: actor with [darkvision 60, lowLight 90] → visionMode `'darkvision'` (not low-light)
- [x] Unit: tremorsense 120ft → detectionMode `'feelTremor'` stacks with darkvision visionMode
- [x] Unit: low-light radius multiplier lookup (`getLowLightMultiplier`) and radius scaling (`scaleLightRadius`)
- [x] Unit: shared-vision-scope resolution (`resolveEffectiveVisionScope`, `resolveSharedVisionSource`)
- [ ] E2E: drag Character actor to scene → 1×1 token with HP bar appears
- [ ] E2E: move token → position persists after reload
- [ ] **Deferred to poc.10 (Basic Combat)**: E2E: drag token across canvas → ruler waypoints show distance labels
- [ ] **Deferred to poc.10 (Basic Combat)**: E2E: drag 40ft on 30ft-speed actor → path turns red after 30ft
- [ ] E2E: dwarf (darkvision 60) on dark scene → token sight works, sees in grayscale

> **Note**: Movement/ruler e2e coverage is deferred until poc.10 (Basic Combat) lands. Combat introduces reactions, opportunity attacks, and other interactions that will materially change how movement e2e scenarios need to be set up — better to write that coverage once against the real combat-aware drag/measure flow than twice.

**Story 4 (Effects tab):**
- [x] 4.A — `ItemEffects.vue` refactored onto `CategorizedListTable` + shared `EffectRow.vue`
- [x] 4.A — Materials merged into the main table (no longer a separate hidden-type/list); still GM/`isHidden`-filtered per-row
- [x] 4.A — Secrets merged into the main table as a GM-only category (`updateGmOnlyEffectTypes`)
- [x] 4.A — Per-category row-component registry (`effectRowRegistry.mts`) with `SecretEffectRow` as the first non-default entry
- [x] 4.A — Secret creation folded into the generic "Create Effect" dialog (`additionalCreatableTypes`, GM-only); bespoke `createSecret` action removed
- [x] 4.A — `MaterialsList.vue`, `SecretsList.vue`, `EffectCategory.vue` deleted; barrel exports cleaned up
- [x] 4.B — Condition config data + `CONFIG.statusEffects` registration (`buildConditionStatusEffects()` in `src/constants/conditions.mts`, registered in `src/documents/actors/registration.mts`)
- [x] 4.C — Actor Effects tab (rename Buffs→Effects, condition grid, delete dead `BuffsTab.vue`/`BuffListSection.vue`)
- [x] 4.C — Condition-grid collapse toggle + section-level visibility/editability overrides (GM-only, pseudo field-path `system.conditions`); inactive conditions hidden from restricted viewers, active conditions always shown; section auto-hides when no conditions are visible
- [x] 4.C — DRY unification: extracted shared `EffectsListSection.vue` (+ `EffectRowData` type, `buildOwnedEffectRow()` helper) consumed by both `ActorEffectsTab.vue` and `ItemEffects.vue`, eliminating drift between the actor/item effects tables
- [x] 4.C — Unit tests: `formatChangeTypeSymbol`, `SystemEffectRow.vue`, `EffectRow.vue` `readOnly` prop, `useActorSheetStore` conditions/transferredEffects/selfContributedEffect getters

---

## Files to Create/Modify

| Action | Path |
|--------|------|
| Modify | `src/constants/sizes.mts` — add `SIZE_TOKEN_DIMENSIONS` |
| Modify | `src/documents/scene/tokenDocument/TokenDocumentDnd35e.mts` — convert to real class, add `_preCreate()` |
| Modify | `src/documents/scene/tokenDocument/index.mts` — export class (not just type) |
| Modify | `src/documents/actors/creature/Creature.mts` — `_preCreate()` for prototype token defaults (actorLink, disposition, HP bar, vision) |
| Modify | `src/documents/actors/creature/logic/buildPrototypeTokenDefaults.mts` — merge in `buildTokenVisionFromSenses()` output |
| Modify | `src/documents/actors/registration.mts` — `CONFIG.Token.objectClass`/`documentClass`/`rulerClass`/`CONFIG.AmbientLight.objectClass` registration, movement action gating |
| Create | `src/canvas/token/TokenRulerDnd35e.mts` — ruler subclass for movement budget display |
| Create | `src/canvas/token/logic/tokenVision.mts` — `buildTokenVisionFromSenses()` helper and vision priority logic |
| Modify | `src/canvas/token/TokenDnd35e.mts` — `_getLightSourceData()` override for low-light radius scaling |
| Create | `src/canvas/light/AmbientLightDnd35e.mts` — `AmbientLight` placeable subclass, `_getLightSourceData()` override |
| Create | `src/canvas/vision/logic/lowLightVision.mts` — pure multiplier resolution + radius scaling |
| Create | `src/canvas/vision/activeLowLightMultiplier.mts` — canvas-querying accessor shared by both placeables |
| Modify | `types/foundry/common/documents/token.d.mts` — fixed `detectionModes` field type (`TypedObjectField`, not `ArrayField`) |
