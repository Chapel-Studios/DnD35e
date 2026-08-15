import { DISPLAY_WORLD_KEYS } from '@settings/display/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import type { ActorDnd35e } from '../ActorDnd35e.mjs';

/** Per-actor opt-out flag (`flags.dnd35e.disableTokenSync`) — see D35E's `system.noVisionOverride` precedent. */
const DISABLE_TOKEN_SYNC_FLAG = 'disableTokenSync';

/**
 * Whether automatic prototype token sync (size + vision, from `system.size`/`system.senses`)
 * should be skipped for this actor — either globally (`DISABLE_TOKEN_AUTO_SYNC` world setting) or
 * for this actor specifically (`flags.dnd35e.disableTokenSync`). When true, whatever is currently
 * on the prototype token is left completely untouched.
 */
const isTokenSyncDisabled = (actor: ActorDnd35e): boolean => {
  if (game.settings.get(SYSTEM_ID, DISPLAY_WORLD_KEYS.DISABLE_TOKEN_AUTO_SYNC)) return true;
  return Boolean(actor.getFlag(SYSTEM_ID, DISABLE_TOKEN_SYNC_FLAG));
};

export { DISABLE_TOKEN_SYNC_FLAG, isTokenSyncDisabled };
