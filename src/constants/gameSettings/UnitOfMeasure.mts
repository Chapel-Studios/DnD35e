export enum UnitOfMeasure {
  METRIC = 'metric',
  IMPERIAL = 'imperial',
};

export const isImperial = (unit: UnitOfMeasure): unit is UnitOfMeasure.IMPERIAL => {
  return unit === UnitOfMeasure.IMPERIAL;
};

export const isMetric = (unit: UnitOfMeasure): unit is UnitOfMeasure.METRIC => {
  return unit === UnitOfMeasure.METRIC;
};
