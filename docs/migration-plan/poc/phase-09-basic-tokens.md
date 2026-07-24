# POC Phase 9: Basic Tokens

**Status**: 📝 Planned

> **Milestone**: POC  
> **Dependencies**: poc.6  
> **Goal**: A token can be created on a scene, moved, and correctly reflects its actor. Token has the right document and canvas classes, actor linkage, size derived from `system.size`, and HP bar by default. Minimal proof before poc.10 (Basic Combat) depends on tokens.

---

## Overview

Phase 6 creates `ActorDnd35e` and the character schema. Phase 9 wires it to the Foundry canvas so actors appear as tokens on the table. Expected to be a thin phase — Foundry handles most token mechanics out of the box.

**Existing scaffolding (already in `src/`):**
- `TokenDnd35e` canvas class at `src/canvas/token/TokenDnd35e.mts` — stub extending `fc.placeables.Token`. Typed, not yet registered.
- `TokenDocumentDnd35e` at `src/documents/scene/tokenDocument/TokenDocumentDnd35e.mts` — **type alias only**, not a real class. Phase 9 converts it.
- `SIZES` constant at `src/constants/sizes.mts` — all 9 size categories defined.

**What Phase 9 adds:**
1. `SIZE_TOKEN_DIMENSIONS` size → grid square mapping in `sizes.mts`
2. `TokenDocumentDnd35e` becomes a real class with `_preCreate()` for size derivation
3. `ActorDnd35e._preCreate()` sets prototype token defaults (size, vision, disposition, HP bar)
4. Register `CONFIG.Token.documentClass`, `CONFIG.Token.objectClass`, `CONFIG.Actor.documentClass`
5. All five movement speeds (land/swim/climb/burrow/fly) visible on character sheet
6. `TokenDnd35e._getAnimationMovementSpeed()` wired to actor land speed
7. Ruler / movement budget display (explore at phase start, fallback to poc.10)

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

`ActorDnd35e._preCreate()` sets sensible prototype token defaults for new Character actors so they don't need manual configuration after creation.

Includes basic vision (`sight.enabled: true`) so placed tokens can see the scene. No darkvision or other senses yet — Phase 6 has no senses schema; that defers to Phase 23 when race and NPC types land.

```typescript
// ActorDnd35e — add _preCreate override
override async _preCreate(
  data: PreCreate<foundry.documents.ActorSource>,
  options: object,
  user: foundry.documents.User
): Promise<boolean | void> {
  const result = await super._preCreate(data, options, user);
  if (result === false) return result;

  if (this.type === 'character') {
    this.updateSource({
      'prototypeToken.actorLink': true,
      'prototypeToken.disposition': CONST.TOKEN_DISPOSITIONS.FRIENDLY,
      'prototypeToken.displayBars': CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
      'prototypeToken.displayName': CONST.TOKEN_DISPLAY_MODES.OWNER,
      'prototypeToken.bar1': { attribute: 'hp' },
      'prototypeToken.sight': { enabled: true, visionMode: 'basic' },
    });
  }
  return result;
}
```

---

## 9.4 Registration

```typescript
// In registerActors() init hook (or a dedicated canvas registration function):
CONFIG.Token.objectClass   = TokenDnd35e;
CONFIG.Token.documentClass = TokenDocumentDnd35e;
CONFIG.Actor.documentClass = ActorProxyDnd35e;  // may already be in Phase 6
```

> **Note on `CONFIG.Actor.documentClass`**: The current `registerActors()` in Phase 6 only wires FormulaFamiliar schemas — it does not register `ActorProxyDnd35e`. Confirm at implementation time whether Phase 6 adds this or Phase 9 does.

---

## 9.5 Movement Speed

### Schema dependency

Phase 6 §5.1 plans `speed: { land, climb, swim, burrow, fly }` on `ActorSystemModelBase`, each a single persisted number field (no `.base`/`.total` split). Poc.9 depends on Phase 6 delivering those fields.

Phase 6 Story 2 shows "speed" on the sheet but vaguely. If Phase 6 only displays land speed, poc.9 adds a dedicated Speed section showing all five modes (land, swim, climb, burrow, fly), with non-zero modes displayed and zero-value modes grayed out or hidden.

### Animation speed (visual)

`Token._getAnimationMovementSpeed()` controls how fast the token slides across the canvas in grid squares per second (Foundry default: 6). **This is purely visual** — it is NOT the D&D movement budget. Override in `TokenDnd35e` so the slide speed matches the character's land speed:

```typescript
// TokenDnd35e — override canvas animation speed
protected override _getAnimationMovementSpeed(): number {
  const landSpeed = this.document.actor?.system?.speed?.land;
  if (landSpeed && landSpeed > 0) {
    // 5ft per grid square — 30ft = 6 squares/sec (matches Foundry default)
    return landSpeed / 5;
  }
  return (CONFIG.Token as Record<string, unknown> & { movement?: { defaultSpeed?: number } })
    .movement?.defaultSpeed ?? 6;
}
```

### Ruler / movement budget display (open decision)

**What we want**: while dragging a token, the ruler label shows "25 / 30 ft" (distance used vs. budget) and the path line or waypoint marker changes color when the budget is exceeded.

**Extension points found in type definitions**:
- `TokenRuler._getWaypointLabelContext(waypoint, state)` — injects data into the Handlebars label template
- `TokenRuler._getWaypointStyle(waypoint)` — controls marker radius/color per waypoint
- `TokenRuler._getSegmentStyle(waypoint)` — controls path line color per segment
- `TokenPlannedMovement.unreachableWaypoints` — Foundry tracks waypoints beyond the movement budget if cost functions are configured

**Open decision at phase start**: Explore whether subclassing `TokenRuler` is required, or if a simpler hook point exists (e.g. `Token#_refreshRuler` or a movement action config). Determine whether wiring `CONFIG.Token.movement` action costs is needed before the ruler can show budget-aware colors.

**Fallback**: if full budget display is complex, poc.9 ships the animation speed wiring only. The ruler budget display defers to poc.10 (Basic Combat), where per-action movement tracking is needed anyway. Decide at phase start.

---

## Phase Delivery Plan

Two sequential stories.

```
Story 1 → Story 2
```

### Story 1 — Token placement, sizing, actor linkage, and vision

**User**: GM  
**Delivers**: Character actor dragged to scene appears as a correctly-sized, actor-linked token with HP bar and basic vision enabled.  
**Depends on**: Phase 6 (CharacterSystemModel, ActorDnd35e in place).

**Commits:**
1. **`SIZE_TOKEN_DIMENSIONS` + real `TokenDocumentDnd35e` class** — add size mapping to `sizes.mts`; convert `TokenDocumentDnd35e` from type alias to real class with `_preCreate()`. *(Unit tests: all 9 size categories map correctly; Medium → 1, Large → 2, Huge → 3)*
2. **Actor prototype token defaults** — `ActorDnd35e._preCreate()` for character `actorLink`, `disposition`, `displayBars`, `displayName`, `bar1`, `sight`. *(Unit tests: new Character actor prototypeToken has `actorLink: true`, `bar1.attribute: 'hp'`, `sight.enabled: true`)*
3. **Registration** — wire `CONFIG.Token.objectClass`, `CONFIG.Token.documentClass`, `CONFIG.Actor.documentClass` in init hook. *(Unit test: CONFIG values are correct class references after init)*

**E2E acceptance**: Create Character actor (Medium, HP 20) → drag to scene → 1×1 token placed → HP bar shows 20/20 → move token → position persists after page reload.

---

### Story 2 — Movement speed

**User**: GM / Player  
**Delivers**: All five actor movement speeds visible on character sheet; moving a token on canvas animates at the correct speed; ruler shows distance traveled.  
**Depends on**: Story 1 + Phase 6 Story 2 (speed schema fields exist).

**Commits:**
1. **Speed sheet UI** — if Phase 6 Story 2 only shows land speed, add all five modes (land, swim, climb, burrow, fly) to the sheet with zero-value modes grayed. *(Skip if Phase 6 already covers all five.)*
2. **Animation speed wiring** — override `TokenDnd35e._getAnimationMovementSpeed()` to derive from `actor.system.speed.land` (single persisted field, no `.total` split; effective/AE-adjusted value is read via `getViewAwareFieldValue` or the live post-prepare value). *(Unit test: Large token with 30ft land speed returns 6 from `_getAnimationMovementSpeed()`)*
3. **Ruler budget display** — *explore at phase start*. Implement `_getWaypointLabelContext()` / `_getWaypointStyle()` / `_getSegmentStyle()` overrides (or simpler hook if found). If ruler subclassing proves too complex for poc.9, defer to poc.10 and document the finding.

**E2E acceptance**: Character with 30ft speed drags token across canvas → ruler shows distance in feet → token animation speed visually matches 6 squares/second (30ft ÷ 5ft).

---

## Completion Checklist

### ❌ Not Started

**Size mapping:**
- [ ] Add `SIZE_TOKEN_DIMENSIONS: Record<Size, number>` to `src/constants/sizes.mts`
- [ ] Export `SIZE_TOKEN_DIMENSIONS` from `sizes.mts`

**TokenDocumentDnd35e:**
- [ ] Convert `TokenDocumentDnd35e` from type alias to real class extending `TokenDocument`
- [ ] Override `_preCreate()` to derive `width`/`height` from `actor.system.size`
- [ ] Update `src/documents/scene/tokenDocument/index.mts` to export the class (not just the type)

**Actor prototype token defaults:**
- [ ] Override `ActorDnd35e._preCreate()` to set prototype token defaults for `character` type
- [ ] Defaults: `actorLink: true`, `disposition: FRIENDLY`, `displayBars: OWNER_HOVER`, `displayName: OWNER`, `bar1.attribute: 'hp'`
- [ ] Vision defaults: `sight.enabled: true`, `sight.visionMode: 'basic'`

**Registration:**
- [ ] Register `CONFIG.Token.objectClass = TokenDnd35e` in init hook
- [ ] Register `CONFIG.Token.documentClass = TokenDocumentDnd35e` in init hook
- [ ] Register `CONFIG.Actor.documentClass = ActorProxyDnd35e` in init hook (confirm not already in Phase 6)

**Movement speed:**
- [ ] Verify Phase 6 Story 2 delivers `speed.{land,climb,swim,burrow,fly}` fields (each a single persisted number, no `.total` split)
- [ ] If Phase 6 only shows land speed on sheet, add all five modes to Speed section (zero-value modes grayed)
- [ ] Override `TokenDnd35e._getAnimationMovementSpeed()` → `actor.system.speed.land / 5`
- [ ] Explore ruler budget display extension points at phase start; implement or defer to poc.10

**Tests:**
- [ ] Unit: `SIZE_TOKEN_DIMENSIONS` covers all 9 size categories
- [ ] Unit: Medium → 1, Large → 2, Huge → 3, Colossal → 6
- [ ] Unit: new Character actor `prototypeToken.actorLink` is `true`
- [ ] Unit: new Character actor `prototypeToken.bar1.attribute` is `'hp'`
- [ ] Unit: new Character actor `prototypeToken.sight.enabled` is `true`
- [ ] Unit: `TokenDocumentDnd35e._preCreate()` sets 2×2 for a Large actor
- [ ] Unit: `CONFIG.Token.objectClass` is `TokenDnd35e` after init hook runs
- [ ] Unit: `_getAnimationMovementSpeed()` returns 6 for a 30ft land speed actor
- [ ] E2E: drag Character actor to scene → 1×1 token with HP bar appears
- [ ] E2E: move token → position persists after reload
- [ ] E2E: drag token across canvas → ruler shows distance in feet

---

## Files to Create/Modify

| Action | Path |
|--------|------|
| Modify | `src/constants/sizes.mts` — add `SIZE_TOKEN_DIMENSIONS` |
| Modify | `src/documents/scene/tokenDocument/TokenDocumentDnd35e.mts` — convert to real class, add `_preCreate()` |
| Modify | `src/documents/scene/tokenDocument/index.mts` — export class (not just type) |
| Modify | `src/documents/actors/baseActor/ActorDnd35e.mts` — add `_preCreate()` for prototype token defaults |
| Modify | `src/documents/actors/registration.mts` — add `CONFIG.Token.*` and `CONFIG.Actor.documentClass` registration |
| Modify | `src/canvas/token/TokenDnd35e.mts` — add `_getAnimationMovementSpeed()` override |
| Modify (maybe) | `src/canvas/token/TokenRulerDnd35e.mts` (new file) — ruler subclass for budget display (explore at phase start) |
