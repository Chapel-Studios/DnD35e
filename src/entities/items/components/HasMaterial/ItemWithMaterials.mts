import { ItemDnd35e, ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import { HasMaterialsSystemData, HasMaterialsSystemSource } from '@items/components/HasMaterial/index.mjs';
import { ItemType } from '@items/index.mjs';

type ItemWithMaterialsSourceProps = {
  system: HasMaterialsSystemSource;
}

type ItemWithMaterialsSource<TItemType extends ItemType = ItemType> =
  Omit<ItemSourceDnd35e<TItemType>, 'system'>
    & ItemWithMaterialsSourceProps;

interface ItemWithMaterials {
  system: HasMaterialsSystemData;

  get unidentifiedDisplayName(): string;
  get identifiedDisplayName(): string;
}

type ItemWithMaterialsLike =
  ItemDnd35e<ItemType> &
  ItemWithMaterials;

const applyHasMaterialsPrototype = <T extends typeof ItemDnd35e<ItemType>> (_item: T) => {
  // if ((item as any).__isIdentifiedApplied) return;

  // Object.defineProperties(item.prototype, {
  //   unidentifiedDisplayName: {
  //     get() {
  //       const {
  //         unidentifiedInfo: {
  //           unidentifiedNameFormula,
  //           isUnidentifiedNameFromFormula,
  //           unidentifiedName,
  //         } = {},
  //       } = this.system as HasMaterialsSystemData;

  //       return unidentifiedNameFormula && isUnidentifiedNameFromFormula
  //         ? replaceDataAttribute(unidentifiedNameFormula || '', this)
  //         : unidentifiedName ?? '';
  //     }
  //   },
  //   identifiedDisplayName: {
  //     get() {
  //       return this._displayName;
  //     }
  //   },
  // });

  // (item as any).__isIdentifiedApplied = true;
};

const hasMaterialsOverrides = {
  // displayName: (item: IdentifiableItemLike): string => {
  //   const identifiedName = item._displayName;
  //   const {
  //     isIdentifiable,
  //     unidentifiedInfo: {
  //       isIdentified = false,
  //     } = {},
  //   } = item.system;

  //   return !isIdentifiable || isIdentified
  //     ? identifiedName
  //     : item.unidentifiedDisplayName;
  // },
};

export {
  applyHasMaterialsPrototype,
  hasMaterialsOverrides,
};

export type {
  ItemWithMaterials,
  ItemWithMaterialsLike,
  ItemWithMaterialsSource,
  ItemWithMaterialsSourceProps,
};
