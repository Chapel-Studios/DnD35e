import { ActiveEffectSource } from '@common/documents/active-effect.mjs';
import {
  applyIdentifiablePrototype,
  IdentifiableItem,
  IdentifiableItemLike,
  IdentifiableItemSourceProps,
  identifiableOverrides,
} from '@ec/Identifiable/index.mjs';
import { ItemEffect } from '@itemEffects/index.mjs';
import { MaterialSystemData, MaterialSystemSource } from '@itemEffects/material/index.mjs';

const materialItemType = 'material';
type MaterialItemType = typeof materialItemType;

type MaterialSource = ActiveEffectSource<MaterialItemType, MaterialSystemSource>
  & Omit<IdentifiableItemSourceProps, 'system'>;

class Material extends ItemEffect {
  declare type: MaterialItemType;
  declare system: MaterialSystemData;
  // declare _sheet: ItemSheetDnd35e<ItemDnd35e<MaterialItemType>> | null;
  // declare get sheet(): ItemSheetDnd35e<ItemDnd35e<'material'>> | null;
  // declare readonly _source: MaterialSource;
  // sheet = ty MaterialSheet;

  override prepareBaseData (): void {
    super.prepareBaseData();
  }

  override get displayName (): string {
    return identifiableOverrides.displayName(this as unknown as IdentifiableItemLike);
  }
}

applyIdentifiablePrototype(Material);

type MaterialType = Omit<IdentifiableItem, 'system'> & Material;

export {
  Material,
  materialItemType,
};

export type {
  MaterialItemType,
  MaterialSource,
  MaterialType,
};
