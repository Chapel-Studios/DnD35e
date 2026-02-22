import { ActiveEffectSource } from '@common/documents/active-effect.mjs';
import {
  applyIdentifiablePrototype,
  IdentifiableDocument,
  IdentifiableDocumentLike,
  IdentifiableDocumentSourceProps,
  identifiableOverrides,
} from '@ec/Identifiable/index.mjs';
import { DnD35eActiveEffect, DnD35eActiveEffectFlags } from '@effects/BaseActiveEffect/index.mjs';
import { MaterialSystemData, MaterialSystemSource } from '@effects/material/index.mjs';

const materialItemType = 'material';
type MaterialItemType = typeof materialItemType;

type MaterialSource = ActiveEffectSource<MaterialItemType, MaterialSystemSource>
  & Omit<IdentifiableDocumentSourceProps, 'system'>;

type MaterialEffectFlags = any;

class Material extends DnD35eActiveEffect {
  declare type: MaterialItemType;
  declare system: MaterialSystemData;
  declare flags: DnD35eActiveEffectFlags<MaterialEffectFlags>;
  // declare _sheet: ItemSheetDnd35e<ItemDnd35e<MaterialItemType>> | null;
  // declare get sheet(): ItemSheetDnd35e<ItemDnd35e<'material'>> | null;
  // declare readonly _source: MaterialSource;
  // sheet = ty MaterialSheet;

  override get transfer (): boolean {
    return false;
  }

  override get isTemporary () {
    return false;
  }

  override prepareBaseData (): void {
    super.prepareBaseData();
  }

  override get displayName (): string {
    return identifiableOverrides.displayName(this as unknown as IdentifiableDocumentLike);
  }
}

applyIdentifiablePrototype(Material);

type MaterialType = Omit<IdentifiableDocument, 'system'> & Material;

export {
  Material,
  materialItemType,
};

export type {
  MaterialEffectFlags,
  MaterialItemType,
  MaterialSource,
  MaterialType,
};
