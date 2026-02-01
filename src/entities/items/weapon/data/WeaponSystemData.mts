import { ItemSystemData } from "@items/baseItem/index.mjs";
import { WeaponBaseType, WeaponSubtype } from "./index.mjs";
import { PhysicalItemSystemData } from "@items/components/Physical/index.mjs";
import { HasMaterialsSystemData } from "@items/components/HasMaterial/index.mjs";

type WeaponDamage = {
  damageRoll: string;
  damageType: string;
  critRange: string;
  critMultiplier: number;
  rangeIncrement: number;
  attackFormula: string;
  damageFormula: string;
};

interface WeaponSystemSource {
  isMasterwork: boolean;
  weaponType: string;
  weaponSubtype: WeaponSubtype;
  weaponBaseType: WeaponBaseType;
  weaponDamage: WeaponDamage;
  attackNotes: string;
  damageNotes: string;
};

type WeaponSystemData = WeaponSystemSource
  & ItemSystemData
  & PhysicalItemSystemData
  & HasMaterialsSystemData
  //& EquippableItem;

export type {
  WeaponDamage,
  WeaponSystemSource,
  WeaponSystemData,
};
