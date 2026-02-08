/**
 * Rain shader effect.
 */
import AbstractWeatherShader from './base-weather.mjs';
export default class RainShader extends AbstractWeatherShader {
  /** @inheritdoc */
  static defaultUniforms: {
        opacity: number;
        intensity: number;
        strength: number;
        rotation: number;
        resolution: number[];
    };

  /** @inheritdoc */
  static fragmentShader: string;
}
