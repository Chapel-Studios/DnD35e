enum UnitOfMeasure {
  METRIC = 'metric',
  IMPERIAL = 'imperial',
}

const isImperial = (unit: UnitOfMeasure): unit is UnitOfMeasure.IMPERIAL => {
  return unit === UnitOfMeasure.IMPERIAL;
};

const isMetric = (unit: UnitOfMeasure): unit is UnitOfMeasure.METRIC => {
  return unit === UnitOfMeasure.METRIC;
};

export {
  isImperial,
  isMetric,
  UnitOfMeasure,
};
