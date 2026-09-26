/**
 * getActorToken — resolves the canvas Token placeable that actually represents a given
 * Actor, unlinked-token-aware.
 *
 * @module
 */
import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';

import type { TokenDnd35e } from '../TokenDnd35e.mjs';

/**
 * `actor.token` (Foundry's own "which TokenDocument does this synthetic Actor belong to"
 * getter) identifies the exact token for an unlinked actor unambiguously — matching by
 * `t.actor?.id` alone is wrong there, since multiple unlinked tokens on the same scene can
 * share the same prototype actor id while holding distinct per-token data. Linked actors
 * have no such per-token identity, so an id-based placeables search is the best available
 * fallback (and matches this codebase's prior behavior for that case).
 */
function getActorToken(actor: ACTORS_DND35E): TokenDnd35e | undefined {
  const ownToken = actor.token?.object as TokenDnd35e | undefined;
  if (ownToken) return ownToken;
  return canvas.tokens?.placeables.find(t => t.actor?.id === actor.id) as TokenDnd35e | undefined;
}

export { getActorToken };
