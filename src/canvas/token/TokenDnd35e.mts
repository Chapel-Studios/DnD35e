import { scaleLightRadius } from '@canvas/vision/logic/lowLightVision.mjs';
import { getActiveLowLightMultiplier, isSharedVisionSource } from '@canvas/vision/sharedVisionPool.mjs';
import type TokenLayer from '@client/canvas/layers/tokens.mjs';
import type { LightSourceData } from '@client/canvas/sources/base-light-source.mjs';
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
   * token's active movement action is `run` (see WISHLIST.md / poc/phase-09-basic-tokens.md).
   */
  protected override _addDragWaypoint(point: Point, options?: { snap?: boolean }): void {
    if (this.document.movementAction === RUN_MOVEMENT_ACTION) {
      ui.notifications.warn(game.i18n.localize('dnd35e.TOKEN.MOVEMENT.RunNoWaypoints'));
      return;
    }
    super._addDragWaypoint(point, options);
  }

  /**
   * Scales this token's own emitted light (e.g. a held torch) for the benefit of an
   * observing token with low-light vision — RAW "see twice as far" (see `WISHLIST.md`/
   * poc/phase-09-basic-tokens.md "Vision System"). Modeled on D35E's `LLVMixin`
   * (`module/canvas/low-light-vision.js`), which overrides the same method.
   */
  protected override _getLightSourceData(): LightSourceData {
    return scaleLightRadius(super._getLightSourceData(), getActiveLowLightMultiplier());
  }

  /**
   * Extends Foundry's stock vision-source rule (controlled token(s) always win; otherwise, an
   * observed token with sight only contributes while nothing else is controlled) with dnd35e's
   * shared-vision scope/mode (D35E `VisionPermissionSheet` parity - see poc/phase-09-basic-tokens.md "Vision System"
   * and the `sharedVisionScope`/`sharedVisionMode` settings). Note: overriding the public
   * `observer` getter has no effect on vision-source selection - Foundry doesn't consult it for
   * that purpose - `_isVisionSource()` is the actual hook.
   */
  protected override _isVisionSource(): boolean {
    return isSharedVisionSource(this);
  }
}

export { TokenDnd35e };
