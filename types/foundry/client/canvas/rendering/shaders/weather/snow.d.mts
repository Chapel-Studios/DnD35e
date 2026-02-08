/**
 * Snow shader effect.
 */
import AbstractWeatherShader from './base-weather.mjs';
export default class SnowShader extends AbstractWeatherShader {
  /** @inheritdoc */
  static defaultUniforms: {
        direction: number;
    };

  /** @inheritdoc */
  static fragmentShader: string;
}
