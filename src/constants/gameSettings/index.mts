import { UnitOfMeasure } from './UnitOfMeasure.mjs';

export type GameSettings = {
  unitOfMeasure: UnitOfMeasure;
};

export const defaultGameSettings = {
  unitOfMeasure: UnitOfMeasure.IMPERIAL,
};
