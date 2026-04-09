import type { Dnd35eFieldData } from '@helpers/fields/index.mjs';
import { ItemSystemData } from '@items/baseItem/index.mjs';
import { EquippableItemSystemData } from '@items/components/Equippable/index.mjs';

import { WeaponBaseType, WeaponSubtype, WeaponType } from './index.mjs';

type WeaponDamage = {
  damageRoll: Dnd35eFieldData<string>;
  damageType: Dnd35eFieldData<string>;
  critRange: Dnd35eFieldData<string>;
  critMultiplier: Dnd35eFieldData<number>;
  rangeIncrement: Dnd35eFieldData<number>;
  attackFormula: string;
  damageFormula: string;
};

interface WeaponSystemSource {
  isMasterwork: boolean;
  weaponType: Dnd35eFieldData<WeaponType>;
  weaponSubtype: Dnd35eFieldData<WeaponSubtype>;
  weaponBaseType: Dnd35eFieldData<WeaponBaseType>;
  weaponDamage: WeaponDamage;
  attackNotes: string;
  damageNotes: string;
}

type WeaponSystemData = WeaponSystemSource
  & ItemSystemData
  & EquippableItemSystemData;

export type {
  WeaponDamage,
  WeaponSystemData,
  WeaponSystemSource,
};
