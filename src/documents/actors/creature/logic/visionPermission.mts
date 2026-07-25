/**
 * Per-actor "shared vision" permission (D35E `VisionPermissionSheet` / `flags.D35E.visionPermission`
 * parity). Lets a GM grant non-owning users vision through a specific actor's token(s) - e.g. a
 * bonded familiar or a charmed NPC - without granting full ownership.
 *
 * Storage: `flags.dnd35e.visionPermission` = `{ default: 'yes' | 'no', users: { [userId]: level } }`.
 * A per-user `level` of `'default'` falls back to the actor's own `default`.
 */

import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { TokenDnd35e } from '@canvas/token/TokenDnd35e.mjs';
import { DISPLAY_WORLD_KEYS } from '@settings/display/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

const VISION_PERMISSION_FLAG = 'visionPermission';

type VisionPermissionLevel = 'default' | 'yes' | 'no';

interface VisionPermissionSource {
  default?: 'yes' | 'no';
  users?: Record<string, VisionPermissionLevel>;
}

/**
 * Whether `actor` has explicitly shared its vision with `user` via the `visionPermission` flag.
 * Does not consider ownership/GM status - callers should check those separately (Foundry's
 * default `Token#observer` already covers actor-permission-based observation).
 */
const hasSharedVisionPermission = (actor: ActorDnd35e, user: foundry.documents.BaseUser): boolean => {
  const permission = actor.getFlag(SYSTEM_ID, VISION_PERMISSION_FLAG) as VisionPermissionSource | undefined;
  if (!permission) return false;

  const userLevel = permission.users?.[user.id] ?? 'default';
  if (userLevel === 'yes') return true;
  if (userLevel === 'no') return false;
  return permission.default === 'yes';
};

/**
 * Resolves whether `token` should count as an additional vision source for the current game user
 * due to shared vision permission. Honors the `sharedVisionMode` world setting:
 * - `withoutSelection` (default): shared vision always applies (D35E's actual behavior).
 * - `withSelection`: shared vision only applies while the token is currently controlled/selected
 *   (e.g. by the GM), letting a GM "hand over" a token's eyes only while actively piloting it.
 */
const hasSharedTokenVision = (token: TokenDnd35e): boolean => {
  const actor = token.actor as ActorDnd35e | null;
  if (!actor) return false;
  if (!hasSharedVisionPermission(actor, game.user)) return false;

  const mode = game.settings.get(SYSTEM_ID, DISPLAY_WORLD_KEYS.SHARED_VISION_MODE);
  if (mode === 'withSelection') return token.controlled;
  return true;
};

/**
 * Broadcasts a canvas vision refresh to all connected clients (and refreshes locally) after a
 * `visionPermission` flag change, since Foundry's core perception pipeline doesn't watch actor
 * flags for changes. Mirrors D35E's `redrawCanvas` socket event.
 */
const broadcastVisionRefresh = (): void => {
  game.socket?.emit(`system.${SYSTEM_ID}`, { eventType: 'redrawCanvas' });
  canvas?.perception?.update({ refreshVision: true, refreshOcclusion: true });
};

export { broadcastVisionRefresh, hasSharedTokenVision, VISION_PERMISSION_FLAG };
export type { VisionPermissionLevel, VisionPermissionSource };
