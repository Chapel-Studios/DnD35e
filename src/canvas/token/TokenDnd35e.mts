import type TokenLayer from '@client/canvas/layers/tokens.mjs';
import type { Point } from '@common/_types.mjs';
import type { TokenDocumentDnd35e } from '@scene/tokenDocument/TokenDocumentDnd35e.mjs';

import { RUN_MOVEMENT_ACTION } from './logic/movementActionGating.mjs';

declare const ui: typeof foundry.ui;

class TokenDnd35e<TDocument extends TokenDocumentDnd35e = TokenDocumentDnd35e>
  extends foundry.canvas.placeables.Token<TDocument>
{
  declare readonly layer: TokenLayer<this>;

  /**
   * SRD running only permits a single straight-line move — refuse to add the
   * intermediate checkpoint waypoints normally added via ctrl+click while the
   * token's active movement action is `run` (see WISHLIST.md / phase-09-basic-tokens.md).
   */
  protected override _addDragWaypoint(point: Point, options?: { snap?: boolean }): void {
    if (this.document.movementAction === RUN_MOVEMENT_ACTION) {
      ui.notifications.warn(game.i18n.localize('dnd35e.TOKEN.MOVEMENT.RunNoWaypoints'));
      return;
    }
    super._addDragWaypoint(point, options);
  }
}

export { TokenDnd35e };
