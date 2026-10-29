import type { WeaponAttackData, WeaponAttackSourceData } from '../WeaponAttack/WeaponAttackSourceData.mjs';
import type { RangedWeaponProperty } from './constants.mjs';

type RangedAttackSourceData = Omit<WeaponAttackSourceData, 'properties'> & {
  rangeIncrement: number;
  isAmmoRequired: boolean;
  properties: RangedWeaponProperty[];
};

interface RangedAttackData extends Omit<WeaponAttackData, 'properties'> {
  rangeIncrement: number;
  isAmmoRequired: boolean;
  properties: Set<RangedWeaponProperty>;
}

export type { RangedAttackData, RangedAttackSourceData };
