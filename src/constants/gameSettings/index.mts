import { UnitOfMeasure } from './UnitOfMeasure.mjs';

type GameSettings = {
  unitOfMeasure: UnitOfMeasure;
};

const defaultGameSettings = {
  unitOfMeasure: UnitOfMeasure.IMPERIAL,
};

export {
  defaultGameSettings,
};

export type {
  GameSettings,
};
