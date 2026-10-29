import type { WeaponAttackData, WeaponAttackSourceData } from '../WeaponAttack/WeaponAttackSourceData.mjs';
import type { MeleeWeaponProperty } from './constants.mjs';

type MeleeAttackSourceData = Omit<WeaponAttackSourceData, 'properties'> & {
  reachLength: number;
  properties: MeleeWeaponProperty[];
};

interface MeleeAttackData extends Omit<WeaponAttackData, 'properties'> {
  reachLength: number;
  properties: Set<MeleeWeaponProperty>;
}

export type { MeleeAttackData, MeleeAttackSourceData };
