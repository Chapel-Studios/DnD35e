import type {
  ImperialUnitOfMeasure,
  MetricUnitOfMeasure,
  UnitOfMeasureOption,
} from './unitOfMeasure.mjs';
import {
  imperialUnitOfMeasure,
  metricUnitOfMeasure,
  registerUnitOfMeasure,
  UNIT_OF_MEASURE_OPTIONS,
} from './unitOfMeasure.mjs';

const registerRootSettings = (): void => {
  registerUnitOfMeasure();
};

export {
  imperialUnitOfMeasure,
  metricUnitOfMeasure,
  registerRootSettings,
  // registerUnitOfMeasure,
  UNIT_OF_MEASURE_OPTIONS,
};

export type {
  ImperialUnitOfMeasure,
  MetricUnitOfMeasure,
  UnitOfMeasureOption,
};
