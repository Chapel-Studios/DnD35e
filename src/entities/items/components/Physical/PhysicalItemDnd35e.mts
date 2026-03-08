import { Dnd35eDocumentMixin } from '@ec/CoreMixin/Dnd35eDocument.mjs';
import type { FormulaContextBuilder } from '@ec/CoreMixin/index.mjs';
import type { IdentifiableDocumentSourceProps } from '@ec/Identifiable/index.mjs';
import {
  IdentifiableDocumentMixin,
} from '@ec/Identifiable/index.mjs';
import type { ItemDnd35e, ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import { ItemDnd35e as ItemDnd35eClass } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/index.mjs';

import type { PhysicalItemSystemData, PhysicalItemSystemSource } from './index.mjs';

type PhysicalItemSourceProps = {
  system: PhysicalItemSystemSource;
};

type PhysicalItemSource<TItemType extends ItemType = ItemType> =
  Omit<ItemSourceDnd35e<TItemType>, 'system'>
    & IdentifiableDocumentSourceProps
    & PhysicalItemSourceProps;

// ─── Pre-composed mixin base ────────────────────────────────────────────────
/** ItemDnd35e → Dnd35eDocumentMixin → IdentifiableDocumentMixin */
const IdentifiableItemBase = IdentifiableDocumentMixin(Dnd35eDocumentMixin(ItemDnd35eClass));

// ─── Abstract class layer ───────────────────────────────────────────────────

/**
 * Abstract base for all physical (tangible) items.
 * Sits on top of the identifiable mixin chain and provides default
 * formula context builders that concrete subclasses can override.
 */
abstract class PhysicalItem extends IdentifiableItemBase {
  declare system: PhysicalItemSystemData;

  /** Default: no extra context for name formulas. Override in concrete classes. */
  protected nameContextBuilder: FormulaContextBuilder = () => null;

  /** Default: no extra context for unidentified name formulas. Override in concrete classes. */
  protected unidentifiedNameContextBuilder: FormulaContextBuilder = () => null;
}

type PhysicalItemLike = ItemDnd35e<ItemType> & PhysicalItem;

export {
  IdentifiableItemBase,
  PhysicalItem,
};

export type {
  PhysicalItemLike,
  PhysicalItemSource,
  PhysicalItemSourceProps,
};
