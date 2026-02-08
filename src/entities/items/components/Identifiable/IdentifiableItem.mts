import { ItemDnd35e, ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import { IdentifiableItemSystemData, IdentifiableItemSystemSource } from './index.mjs';
import { ItemType } from '@items/index.mjs';
import { replaceDataAttribute } from '@helpers/formulae/index.mjs';

type IdentifiableItemSourceProps = {
  system: IdentifiableItemSystemSource;
}

type IdentifiableItemSource<TItemType extends ItemType = ItemType> =
  Omit<ItemSourceDnd35e<TItemType>, 'system'>
    & IdentifiableItemSourceProps;

interface IdentifiableItem {
  system: IdentifiableItemSystemData;

  get unidentifiedDisplayName(): string;
  get identifiedDisplayName(): string;
}

type IdentifiableItemLike =
  ItemDnd35e<ItemType> &
  IdentifiableItem;

const applyIdentifiablePrototype = <T extends typeof ItemDnd35e<ItemType>> (item: T) => {
  if ((item as any).__isIdentifiedApplied) return;

  Object.defineProperties(item.prototype, {
    unidentifiedDisplayName: {
      get () {
        const {
          unidentifiedInfo: {
            unidentifiedNameFormula,
            isUnidentifiedNameFromFormula,
            unidentifiedName,
          } = {},
        } = this.system as IdentifiableItemSystemData;

        return unidentifiedNameFormula && isUnidentifiedNameFromFormula
          ? replaceDataAttribute(unidentifiedNameFormula || '', this)
          : unidentifiedName ?? '';
      },
    },
    identifiedDisplayName: {
      get () {
        return this._displayName;
      },
    },
  });

  (item as any).__isIdentifiedApplied = true;
};

const identifiableOverrides = {
  displayName: (item: IdentifiableItemLike): string => {
    const identifiedName = item._displayName;
    const {
      isIdentifiable,
      unidentifiedInfo: {
        isIdentified = false,
      } = {},
    } = item.system;

    return !isIdentifiable || isIdentified
      ? identifiedName
      : item.unidentifiedDisplayName;
  },
};

export {
  applyIdentifiablePrototype,
  identifiableOverrides,
};

export type {
  IdentifiableItem,
  IdentifiableItemLike,
  IdentifiableItemSource,
  IdentifiableItemSourceProps,
};
