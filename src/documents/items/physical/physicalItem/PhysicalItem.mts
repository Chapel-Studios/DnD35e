import type {
  DatabaseUpdateCallbackOptions,
} from '@common/abstract/_types.mjs';
import { DocumentMixin } from '@documents/document/DocumentDnd35e.mjs';
import { DocumentLifeCycle } from '@documents/document/events/DocumentLifeCycle.mjs';
import type { IdentifiableDocumentSourceProps } from '@documents/identifiable/index.mjs';
import {
  IdentifiableDocumentMixin,
} from '@documents/identifiable/index.mjs';
import {
  findAllBrokenAes,
  syncBrokenAeState,
} from '@effects/material/logic/brokenAe.mjs';
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
/** ItemDnd35e → DocumentMixin → IdentifiableDocumentMixin */
const IdentifiableItemBase = IdentifiableDocumentMixin(DocumentMixin(ItemDnd35eClass));

// ─── Abstract class layer ───────────────────────────────────────────────────

/** Payload carried by the `broken` and `repaired` lifecycle events. */
interface PhysicalItemHpPayload {
  item: PhysicalItem;
  hp: { current: number; max: number };
}

/**
 * Abstract base for all physical (tangible) items.
 * Sits on top of the identifiable mixin chain and provides default
 * formula context builders that concrete subclasses can override.
 */
abstract class PhysicalItem extends IdentifiableItemBase {
  declare system: PhysicalItemSystemData;

  // ─── Lifecycle event registry ─────────────────────────────────────────────

  /**
   * Static registry of lifecycle event names for this class.
   * Subclasses extend via spread:
   *   `static override readonly LifeCycle = { ...PhysicalItem.LifeCycle, onHit: 'onHit' } as const`
   *
   * Usage: `item.events.on(PhysicalItem.LifeCycle.broken, handler)`
   */
  static readonly LifeCycle = {
    ...DocumentLifeCycle,
    /** Item HP dropped to \u22640 — item transitions into broken state. */
    broken: 'broken',
    /** Item HP restored above 0 — item transitions out of broken state. */
    repaired: 'repaired',
  } as const;

  // events: DocumentEventEmitter — inherited from DocumentMixin (all system documents carry this)

  // ─── Lifecycle hooks ──────────────────────────────────────────────────────

  protected override _onUpdate(
    changed: DeepPartial<this['_source']>,
    options: DatabaseUpdateCallbackOptions,
    userId: string
  ): void {
    super._onUpdate(changed, options, userId);
    // Only the active GM handles cascade updates to avoid race conditions
    if (!game.user.isActiveGM) return;
    const changedSystem = (changed as { system?: { hp?: unknown } }).system;
    if (changedSystem === undefined) return;

    // Handle HP → Broken AE sync
    if ('hp' in changedSystem) {
      // Determine whether the broken state actually changed.
      // wasBroken = any (system-managed or custom) broken AE is currently active.
      const wasBroken = findAllBrokenAes(this).some((ae) => !ae.disabled);
      const newBroken = this.system.hp.current <= 0 && this.system.hp.max > 0;
      if (newBroken !== wasBroken) {
        // Sync the AE, then emit the lifecycle event for external subscribers
        void syncBrokenAeState(this, newBroken);
        const payload: PhysicalItemHpPayload = {
          item: this,
          hp: { current: this.system.hp.current, max: this.system.hp.max },
        };
        void this.events.emit(
          newBroken ? PhysicalItem.LifeCycle.broken : PhysicalItem.LifeCycle.repaired,
          payload
        );
      }
    }
  }
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
