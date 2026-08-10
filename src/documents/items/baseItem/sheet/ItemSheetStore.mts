import type {
  DocumentSheetStore,
  DocumentSheetStoreDocumentActions,
  DocumentSheetStoreDocumentGetters,
  DocumentSheetStoreUtils,
  SheetTab,
} from '@documents/document/index.mjs';
import { defaultDetailsTab, preparationWarningsTab, useDocumentSheetStore } from '@documents/document/index.mjs';
import type { EffectDocumentActions, EffectDocumentGetters, EffectDocumentUtils } from '@documents/document/logic/index.mjs';
import { useEffectDocumentActions } from '@documents/document/logic/index.mjs';
import type { RenderModeStore } from '@documents/document/sheet/stores/RenderModeStore.mjs';
import type { EffectRowStore } from '@effects/baseActiveEffect/sheet/effectRowStoreRegistry.mjs';
import { createEffectRowStore } from '@effects/baseActiveEffect/sheet/effectRowStoreRegistry.mjs';
import type { ActiveEffectDnd35e } from '@effects/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import type { ItemType } from '@items/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed, watch } from 'vue';

import {
  defaultEffectsTab,
} from './tabs/index.mjs';

const getDefaultItemTabs = (): SheetTab[] => [
  defaultDetailsTab,
  defaultEffectsTab,
];

interface UseItemSheetStoreOptions {
  defaultTabs?: SheetTab[];
  defaultActiveTab?: string;
  /** See `useDocumentSheetStore`'s option of the same name. */
  renderModeStore?: RenderModeStore;
}

const useItemSheetStore = <TDocument extends ItemDnd35e>(
  context: VueApplicationContext<TDocument>,
  options?: UseItemSheetStoreOptions
): ItemSheetStore<TDocument> => {
  // Get base store functionality
  const baseStore = useDocumentSheetStore(context, {
    defaultTabs: options?.defaultTabs ?? getDefaultItemTabs(),
    defaultActiveTab: options?.defaultActiveTab ?? 'details',
    renderModeStore: options?.renderModeStore,
  });
  const document = baseStore._storeUtils.document;
  baseStore._storeUtils.setGetFreshDocument(async (uuid: string) => {
    // `game.items.get(id)` would only resolve world-collection items - an item embedded
    // in an unlinked token's synthetic Actor shares its base counterpart's `.id` but has
    // a distinct `.uuid`, so it must be resolved via `fromUuid`.
    const doc = await foundry.utils.fromUuid(uuid);
    return (doc ?? null) as TDocument | null;
  });

  const hasOwner = computed(() => !!document.value.parent);

  // Item-specific document getters/actions - shared with actor-level effect
  // hosting via `useEffectDocumentActions` (extracted for DRY across Item/Actor sheets).
  const { getters: effectGetters, actions: effectActions, utils: effectUtils } = useEffectDocumentActions(document);

  // Row-scoped stores for this item's own owned effect rows (Effects tab) - cached per
  // effect uuid so a row remounting reuses the same store instead of rebuilding it. Never
  // touches `game.dnd35e.stores`; see effectRowStoreRegistry.mts.
  const effectRowStoreCache = new Map<string, EffectRowStore>();

  // Forwarded explicitly rather than letting the row store `inject()` it ambiently -
  // this is the SAME instance this item store itself uses (see DocumentSheetStore.mts).
  const { renderModeStore } = baseStore._storeUtils;

  const getOrCreateEffectRowStore = (effect: ActiveEffectDnd35e): EffectRowStore => {
    const existing = effectRowStoreCache.get(effect.uuid as string);
    if (existing) return existing;
    const rowStore = createEffectRowStore(effect, renderModeStore);
    effectRowStoreCache.set(effect.uuid as string, rowStore);
    return rowStore;
  };

  // Cache guarantees a row store's document type already matches effect's actual type.
  const refreshEffectRowStore = (rowStore: EffectRowStore, effect: ActiveEffectDnd35e): Promise<void> =>
    (rowStore._storeUtils.refreshDocument as (doc?: ActiveEffectDnd35e | null) => Promise<void>)(effect);

  const itemDocumentGetters = {
    ...baseStore.documentGetters,
    ...effectGetters,
    hasOwner,
    getOrCreateEffectRowStore,
  };

  // Conditional "Warnings" tab: appears while any preparation warning exists, persists
  // until fixed (not dismissable, unlike the summary banner) - see `preparationWarnings.mts`.
  const { tabStore } = baseStore._storeUtils;
  watch(
    () => itemDocumentGetters.preparationWarnings.value.length > 0,
    (hasWarnings) => {
      const otherTabs = tabStore.tabs.value.filter((tab) => tab.id !== preparationWarningsTab.id);
      tabStore.replaceTabs(hasWarnings ? [...otherTabs, preparationWarningsTab] : otherTabs, false);
    },
    { immediate: true }
  );

  const itemDocumentActions = {
    ...baseStore.documentActions,
    ...effectActions,
  };

  const itemStoreUtils = {
    ...baseStore._storeUtils,
    ...effectUtils,
    // Wraps the base refresh - `ActiveEffectDnd35e._onUpdate()` already calls
    // `refreshOwningDocument()` on every child effect change, so it's the natural hook to
    // also re-sync each cached row store's own document ref and prune deleted effects.
    refreshDocument: async (doc?: TDocument | null): Promise<void> => {
      await baseStore._storeUtils.refreshDocument(doc);

      const currentEffects = new Map([...document.value.effects]
        .map((effect) => [effect.uuid as string, effect] as const));
      for (const [uuid, rowStore] of effectRowStoreCache) {
        const currentEffect = currentEffects.get(uuid);
        if (!currentEffect) {
          effectRowStoreCache.delete(uuid);
          continue;
        }
        void refreshEffectRowStore(rowStore, currentEffect as unknown as ActiveEffectDnd35e);
      }
    },
  };

  const store: ItemSheetStore<TDocument> = {
    ...baseStore,
    documentGetters: itemDocumentGetters,
    documentActions: itemDocumentActions,
    _storeUtils: itemStoreUtils,
    // Item-specific
  };

  return store;
};


type ItemDocumentGetters = DocumentSheetStoreDocumentGetters & EffectDocumentGetters & {
  hasOwner: ComputedRef<boolean>;
  getOrCreateEffectRowStore: (effect: ActiveEffectDnd35e) => EffectRowStore;
};

type ItemDocumentActions<TDocument extends ItemDnd35e> = DocumentSheetStoreDocumentActions<TDocument> & EffectDocumentActions;

type ItemSheetStoreUtils<TDocument extends ItemDnd35e> = DocumentSheetStoreUtils<TDocument> & EffectDocumentUtils;

type ItemSheetStore<TDocument extends ItemDnd35e<ItemType> = ItemDnd35e<ItemType>> = DocumentSheetStore<TDocument>
  & {
    documentGetters: ItemDocumentGetters,
    documentActions: ItemDocumentActions<TDocument>,
    _storeUtils: ItemSheetStoreUtils<TDocument>,
  };

export {
  getDefaultItemTabs,
  useItemSheetStore,
};

export type {
  ItemDocumentActions,
  ItemDocumentGetters,
  ItemSheetStore,
  ItemSheetStoreUtils,
  UseItemSheetStoreOptions,
};
