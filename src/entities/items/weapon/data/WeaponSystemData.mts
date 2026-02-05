import { ItemSystemData } from "@items/baseItem/index.mjs";
import { WeaponBaseType, WeaponSubtype } from "./index.mjs";
import { EquippableItemSystemData } from "@items/components/Equippable/index.mjs";

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
  & EquippableItemSystemData;

export type {
  WeaponDamage,
  WeaponSystemSource,
  WeaponSystemData,
};
