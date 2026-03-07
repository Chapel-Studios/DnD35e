import type {
  IdentifiableDocument,
  IdentifiableDocumentSourceProps,
} from '@ec/Identifiable/index.mjs';
// import {
//   applyIdentifiablePrototype,
//   identifiableOverrides,
// } from '@ec/Identifiable/index.mjs';
import type { ItemDnd35e, ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/index.mjs';

import { PhysicalItemSystemData, PhysicalItemSystemSource } from './index.mjs';

type PhysicalItemSourceProps = {
  system: PhysicalItemSystemSource;
};

type PhysicalItemSource<TItemType extends ItemType = ItemType> =
  Omit<ItemSourceDnd35e<TItemType>, 'system'>
    & IdentifiableDocumentSourceProps
    & PhysicalItemSourceProps;

interface PhysicalItem {
  system: PhysicalItemSystemData;

  get unidentifiedDisplayName(): string;
  get identifiedDisplayName(): string;
}

type PhysicalItemLike = ItemDnd35e<ItemType>
  & IdentifiableDocument
  & PhysicalItem;

const applyPhysicalPrototype = <T extends typeof ItemDnd35e<ItemType>> (item: T) => {
  // applyIdentifiablePrototype(item);
  // applyDamagableRuntime(item);
};

// const physicalOverrides = {
//   displayName: identifiableOverrides.displayName,
// };

export {
  applyPhysicalPrototype,
  // physicalOverrides,
};

export type {
  PhysicalItem,
  PhysicalItemLike,
  PhysicalItemSource,
  PhysicalItemSourceProps,
};
