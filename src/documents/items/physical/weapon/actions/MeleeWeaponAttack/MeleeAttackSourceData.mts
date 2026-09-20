import type { WeaponAttackSourceData } from '../WeaponAttack/WeaponAttackSourceData.mjs';
import type { MeleeWeaponProperty } from './constants.mjs';

interface MeleeAttackSourceData extends Omit<WeaponAttackSourceData, 'properties'> {
  reachLength: number;
  properties: Set<MeleeWeaponProperty>;
}

export type { MeleeAttackSourceData };
