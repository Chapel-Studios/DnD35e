import { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';
import { replaceDataAttribute } from '@helpers/formulae/index.mjs';
import { ItemDnd35e, ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import { ItemType } from '@items/index.mjs';

import { IdentifiableDocumentSystemData, IdentifiableDocumentSystemSource } from './index.mjs';

type IdentifiableDocumentSourceProps = {
  system: IdentifiableDocumentSystemSource;
}

type IdentifiableDocumentSource<TItemType extends ItemType = ItemType> =
  Omit<ItemSourceDnd35e<TItemType>, 'system'>
    & IdentifiableDocumentSourceProps;

interface IdentifiableDocument {
  system: IdentifiableDocumentSystemData;

  get unidentifiedDisplayName(): string;
  get identifiedDisplayName(): string;
}

type IdentifiableDocumentLike =
  ItemDnd35e<ItemType> &
  IdentifiableDocument;

type IdentifiableEffectLike =
  DnD35eActiveEffect &
  IdentifiableDocument;

type WithIdentifiableComponent = IdentifiableDocumentLike | IdentifiableEffectLike;

type ItemOrEffectCtor = AbstractConstructorOf<ItemDnd35e<ItemType>> | AbstractConstructorOf<DnD35eActiveEffect>;
const applyIdentifiablePrototype = <T extends ItemOrEffectCtor> (item: T) => {
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
        } = this.system as IdentifiableDocumentSystemData;

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
  displayName: (item: WithIdentifiableComponent): string => {
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
  IdentifiableDocument,
  IdentifiableDocumentLike,
  IdentifiableDocumentSource,
  IdentifiableDocumentSourceProps,
  IdentifiableEffectLike,
  WithIdentifiableComponent,
};
