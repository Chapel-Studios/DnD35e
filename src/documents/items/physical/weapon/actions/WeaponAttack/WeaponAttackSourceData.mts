import type { DamageType } from '@constants/attacks/damageTypes.mjs';
import type { FormulaData, FormulaDataSource } from '@helpers/formulae/index.mjs';
import type { ActionData, ActionSourceData } from '@items/baseItem/actions/ActionSourceData.mjs';

import type { AllWeaponProperties } from './constants.mjs';

type WeaponAttackSourceData = ActionSourceData & {
  requiresEquipped: boolean;
  attackFormula: FormulaDataSource;
  damageFormula: FormulaDataSource;
  damageTypes: DamageType[];
  critRange: number;
  critMultiplier: number;
  properties: AllWeaponProperties[];
};

interface WeaponAttackData extends Omit<WeaponAttackSourceData, 'name' | 'attackFormula' | 'damageFormula' | 'properties' | 'damageTypes'>, ActionData {
  attackFormula: FormulaData;
  damageFormula: FormulaData;
  properties: Set<AllWeaponProperties>;
  damageTypes: Set<DamageType>;
}

export type { WeaponAttackData, WeaponAttackSourceData };
