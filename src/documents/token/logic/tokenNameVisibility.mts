/**
 * tokenNameVisibility — resolves whether the current user should see an actor's real
 * token name (poc.10 Story D follow-up), for surfaces that render statically per-viewer
 * (attack roll chat card, roll dialogs) rather than reading a live canvas hover state.
 *
 * @module
 */
import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import type { TokenDocumentDnd35e } from '@documents/scene/tokenDocument/TokenDocumentDnd35e.mjs';

/**
 * GMs always see the real name. Otherwise this mirrors Foundry's own token-nameplate
 * display modes (`CONST.TOKEN_DISPLAY_MODES`), simplified for a non-hoverable UI surface:
 * `HOVER` means "visible to any user who hovers the token", which this treats as visible
 * outright (matching "or see it on hover" — there's no live hover state to gate on here);
 * `OWNER_HOVER`/`OWNER`/`CONTROL` all require actual ownership, since a non-owner can never
 * see the name via those modes regardless of hovering.
 *
 * `token` — the specific placed token this name check is for (e.g. the one whose HUD
 * launched an attack), if known. Preferred over `actor.token`/`actor.prototypeToken`
 * since a linked actor with multiple placed tokens has no single "the" token instance to
 * read a display mode from; falls back to the old actor-only resolution when omitted.
 */
function canUserSeeActorName(actor: ACTORS_DND35E | null | undefined, user: User, token?: TokenDocumentDnd35e | null): boolean {
  if (!actor) return false;
  if (user.isGM) return true;

  const displayMode = (token ?? actor.token ?? actor.prototypeToken)?.displayName;
  const DISPLAY_MODES = CONST.TOKEN_DISPLAY_MODES;
  if (displayMode === DISPLAY_MODES.ALWAYS || displayMode === DISPLAY_MODES.HOVER) return true;
  if (
    displayMode === DISPLAY_MODES.OWNER_HOVER
    || displayMode === DISPLAY_MODES.OWNER
    || displayMode === DISPLAY_MODES.CONTROL
  ) return actor.testUserPermission(user, 'OWNER');
  if (displayMode === DISPLAY_MODES.NONE || displayMode === undefined) return false;

  return false;
}

export { canUserSeeActorName };
