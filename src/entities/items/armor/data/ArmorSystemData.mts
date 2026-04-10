import type { Dnd35eFieldData } from '@helpers/fields/index.mjs';
import { ItemSystemData } from '@items/baseItem/index.mjs';
import { EquippableItemSystemData } from '@items/components/Equippable/index.mjs';

import { ArmorBaseType, ArmorSubtype, ArmorType } from './index.mjs';

//armor damage is listed with weapons, so this might go away
type armorDamage = {
  damageRoll: Dnd35eFieldData<string>;
  damageType: Dnd35eFieldData<string>;
  critRange: Dnd35eFieldData<string>;
  critMultiplier: Dnd35eFieldData<number>;
  rangeIncrement: Dnd35eFieldData<number>;
  attackFormula: string;
  damageFormula: string;
};

interface ArmorSystemSource {
  isMasterwork: boolean;
  armorType: Dnd35eFieldData<ArmorType>;
  armorSubtype: Dnd35eFieldData<ArmorSubtype>;
  armorBaseType: Dnd35eFieldData<ArmorBaseType>;
  //armorDamage: armorDamage;
  //attackNotes: string;
  //damageNotes: string;
}

type ArmorSystemData = ArmorSystemSource
  & ItemSystemData
  & EquippableItemSystemData;

export type {
  armorDamage,
  ArmorSystemData,
  ArmorSystemSource,
};
