/**
 * snapTokenToPosition — repositions a token via Foundry's `movement` operation using
 * `action: 'displace'` (cost-free, unmeasured, no wall-blocking, no ruler/animation) instead
 * of a plain field update. A plain `{x, y, elevation}` update still runs through the movement
 * pipeline and gets mistaken for a fresh, chargeable move by
 * `TokenDocumentDnd35e#_onUpdateMovement()` — this is the same snap-back trick that module
 * already used inline for the Drop Prone/Stand Up toggle; both call sites now share it.
 *
 * @module
 */
import type { TokenMovementWaypoint } from '@client/documents/_types.mjs';

interface SnapPosition {
  x: number;
  y: number;
  elevation: number;
}

async function snapTokenToPosition(token: TokenDocument, position: SnapPosition, extraData: Record<string, unknown> = {}): Promise<void> {
  const tokenId = token.id;
  if (!tokenId) return;
  const waypoint: Partial<TokenMovementWaypoint> = { ...position, action: 'displace' };
  await token.update({ ...extraData }, { movement: { [tokenId]: { waypoints: [waypoint] } }, diff: false, animate: false } as never);
}

export { snapTokenToPosition };
export type { SnapPosition };
