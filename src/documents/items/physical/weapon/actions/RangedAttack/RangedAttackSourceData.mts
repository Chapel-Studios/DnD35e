import type { WeaponAttackSourceData } from '../WeaponAttack/WeaponAttackSourceData.mjs';
import type { RangedWeaponProperty } from './constants.mjs';

interface RangedAttackSourceData extends Omit<WeaponAttackSourceData, 'properties'> {
  rangeIncrement: number;
  isAmmoRequired: boolean;
  properties: Set<RangedWeaponProperty>;
}

export type { RangedAttackSourceData };
