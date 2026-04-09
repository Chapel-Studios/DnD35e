import { SYSTEM_ID } from '@settings/shared.mjs';

const registerUnitOfMeasure = (): void => {
  /**
   * System of Units
   */
  game.settings.register(SYSTEM_ID, UNIT_SETTINGS_KEY, {
    name: 'DND35E.Settings.MeasurementUnitsN',
    hint: 'DND35E.Settings.MeasurementUnitsL',
    scope: 'world',
    config: true,
    default: imperialUnitOfMeasure,
    type: String,
    choices: {
      [imperialUnitOfMeasure]: 'Imperial (feet, lbs)',
      [metricUnitOfMeasure]: 'Metric (meters, kg)',
    },
    // onChange: () => {
    //   [...game.actors.contents, ...Object.values(game.actors.tokens)].filter(o => {
    //     return o.data.type === "character";
    //   }).forEach(o => {
    //     if (o.sheet != null && o.sheet._state > 0) o.sheet.render();
    //   });
    // },
  });
};

const UNIT_SETTINGS_KEY = 'units';

const imperialUnitOfMeasure = 'imperial';
type ImperialUnitOfMeasure = typeof imperialUnitOfMeasure;

const metricUnitOfMeasure = 'metric';
type MetricUnitOfMeasure = typeof metricUnitOfMeasure;

const UNIT_OF_MEASURE_OPTIONS = new Set([
  imperialUnitOfMeasure,
  metricUnitOfMeasure,
] as const);
type UnitOfMeasureOption = SetElement<typeof UNIT_OF_MEASURE_OPTIONS>;

const WEIGHT_OPTIONS = {
  [imperialUnitOfMeasure]: {
    label: 'Pounds (lbs)',
    short: 'lbs',
  },
  [metricUnitOfMeasure]: {
    label: 'Kilograms (kg)',
    short: 'kg',
  },
};

export {
  imperialUnitOfMeasure,
  metricUnitOfMeasure,
  registerUnitOfMeasure,
  UNIT_OF_MEASURE_OPTIONS,
  UNIT_SETTINGS_KEY,
  WEIGHT_OPTIONS,
};

export type {
  ImperialUnitOfMeasure,
  MetricUnitOfMeasure,
  UnitOfMeasureOption,
};
