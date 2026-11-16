import type { ItemSystemData } from '@items/baseItem/index.mjs';
import type { PhysicalItemSystemData } from '@items/physical/physicalItem/data/index.mjs';

interface AmmoSystemSource {
  ammoType: string; // not strongly typed to allow for a folksonomy
  isAlwaysRecoverable: boolean;
}

type AmmoSystemData = AmmoSystemSource
  & ItemSystemData
  & PhysicalItemSystemData;

export type {
  AmmoSystemData,
  AmmoSystemSource,
};
