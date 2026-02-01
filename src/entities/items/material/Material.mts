import { MaterialSheet, MaterialSystemData, MaterialSystemSource } from "./index.mjs";
import { ItemDnd35e, ItemSourceDnd35e } from "@items/baseItem/index.mjs";
import { applyIdentifiablePrototype, IdentifiableItem, IdentifiableItemLike, IdentifiableItemSourceProps, identifiableOverrides } from "@items/components/Identifiable/index.mjs";

const materialItemType = 'material'; 
type MaterialItemType = typeof materialItemType;

type MaterialSource = Omit<ItemSourceDnd35e, "system">
  & Omit<IdentifiableItemSourceProps, "system">
  & { system: MaterialSystemSource; };

class Material extends ItemDnd35e<MaterialItemType> {
  // declare type: MaterialItemType;
  // declare system: MaterialSystemData;
  //declare readonly _source: MaterialSource;
  // sheet = ty MaterialSheet;

  override prepareBaseData(): void {
    super.prepareBaseData();
  }

  override get displayName(): string {
    // Identifiable runtime getters are applied in prepareBaseData
    return identifiableOverrides.displayName(this as unknown as IdentifiableItemLike);
  }

  // override _createFreshSystemData() {
  //   return {
  //     ...super._createFreshSystemData(),
  //     bonusHardness: 0,
  //     bonusHpPerInch: 0,
  //     isAdamantineEquivalent: false,
  //     isAlchemicalSilverEquivalent: false,
  //     isColdIronEquivalent: false,
  //     priceDifference: 0,
  //     magicEquivalent: 0,
  //   };
  // }
}

applyIdentifiablePrototype(Material);

type MaterialType = Material & IdentifiableItem;

interface Material extends ItemDnd35e<MaterialItemType>, IdentifiableItem {
  type: MaterialItemType;
  system: MaterialSystemData;
}

export {
  Material,
  materialItemType,
};

export type {
  MaterialItemType,
  MaterialType,
  MaterialSource,
 };
