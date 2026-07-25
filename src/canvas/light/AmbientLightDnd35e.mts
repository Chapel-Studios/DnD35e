import { scaleLightRadius } from '@canvas/vision/logic/lowLightVision.mjs';
import { getActiveLowLightMultiplier } from '@canvas/vision/sharedVisionPool.mjs';
import type { LightSourceData } from '@client/canvas/sources/base-light-source.mjs';

/**
 * dnd35e's `AmbientLight` placeable subclass. Scales a scene light's rendered dim/bright
 * radii for the benefit of an observing token with low-light vision — RAW "see twice as
 * far" (see `WISHLIST.md`/phase-09-basic-tokens.md "Vision System"). Modeled on D35E's
 * `LLVMixin` (`module/canvas/low-light-vision.js`), which overrides the same method.
 */
class AmbientLightDnd35e extends foundry.canvas.placeables.AmbientLight {
  protected override _getLightSourceData(): LightSourceData {
    return scaleLightRadius(super._getLightSourceData(), getActiveLowLightMultiplier());
  }
}

export { AmbientLightDnd35e };
