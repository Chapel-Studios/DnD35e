import type { DamageType } from '@constants/attacks/damageTypes.mjs';
import type { FormulaDataSource } from '@helpers/formulae/index.mjs';
import type { ActionSourceData } from '@items/baseItem/actions/ActionSourceData.mjs';

import type { AllWeaponProperties } from './constants.mjs';

interface WeaponAttackSourceData extends ActionSourceData {
  requiresEquipped: boolean;
  attackFormula: FormulaDataSource;
  damageFormula: FormulaDataSource;
  damageType: DamageType;
  critRange: number;
  critMultiplier: number;
  properties: Set<AllWeaponProperties>;
}

export type { WeaponAttackSourceData };
