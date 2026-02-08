/**
 * A colorization shader which keeps brightness contrary to "normal tinting"
 */
import BaseSamplerShader from './base-sampler.mjs';
export default class ColorizeBrightnessShader extends BaseSamplerShader {
  /** @override */
  static override classPluginName: null;
  /** @inheritdoc */
  static defaultUniforms: {
        tintAlpha: number[];
        tintLinear: number[];
        sampler: null;
        screenDimensions: number[];
        grey: boolean;
        intensity: number;
    };
}
