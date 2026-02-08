/**
 * Shader for the Region highlight.
 * @internal
 * @ignore
 */
import RegionShader from './base.mjs';
export default class HighlightRegionShader extends RegionShader {
  /** @inheritDoc */
  static defaultUniforms: {
        resolution: number;
        hatchEnabled: boolean;
        hatchThickness: number;
        canvasDimensions: number[];
        sceneDimensions: number[];
        screenDimensions: number[];
        tintAlpha: number[];
    };
}
