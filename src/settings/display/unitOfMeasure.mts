/**
 * Unit-of-measure constants and types.
 *
 * The actual `units` world setting is registered by `display/registration.mts`
 * via `DISPLAY_WORLD_KEYS.UNITS`. This module only exports the constant values,
 * option sets, and types consumed by the settings store and other display
 * helpers.
 */

const imperialUnitOfMeasure = 'imperial';
type ImperialUnitOfMeasure = typeof imperialUnitOfMeasure;

const metricUnitOfMeasure = 'metric';
type MetricUnitOfMeasure = typeof metricUnitOfMeasure;

const UNIT_OF_MEASURE_OPTIONS = new Set([
  imperialUnitOfMeasure,
  metricUnitOfMeasure,
] as const);
type UnitOfMeasureOption = SetElement<typeof UNIT_OF_MEASURE_OPTIONS>;

export {
  imperialUnitOfMeasure,
  metricUnitOfMeasure,
  UNIT_OF_MEASURE_OPTIONS,
};

export type {
  ImperialUnitOfMeasure,
  MetricUnitOfMeasure,
  UnitOfMeasureOption,
};
