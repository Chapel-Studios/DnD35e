import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type { DocumentSheetStore, SheetTab } from '@documents/document/index.mjs';
import { useDocumentSheetStore } from '@documents/document/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import { PHYSICAL_ITEM_TYPES } from '@items/itemTypes.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

interface UseActorSheetStoreOptions {
  defaultTabs?: SheetTab[];
  defaultActiveTab?: string;
}

/**
 * Top of the actor inheritance chain. Builds the base document store internally
 * and adds actor-level named getters/behaviors.
 */
const useActorSheetStore = <TDocument extends ActorDnd35e>(
  context: VueApplicationContext<TDocument>,
  options?: UseActorSheetStoreOptions
): ActorDocumentStore<TDocument> => {
  const baseStore = useDocumentSheetStore(context, options);
  baseStore._storeUtils.setGetFreshDocument(async (id: string) => {
    const doc = game.actors.get(id);
    return Promise.resolve(doc ?? null) as Promise<TDocument | null>;
  });

  const { getViewAwareFieldValue } = baseStore.documentGetters;
  const document = baseStore._storeUtils.document;

  // Base `DocumentSheetStore` only stubs these (always `[]`/`false`) since not every
  // document type accumulates effect overrides the same way - actors record theirs in
  // `effectOverrides` via `applyStackedActiveEffectChanges()` (see `ActorDnd35e.applyActiveEffects()`),
  // same shape as `ItemSheetStore`'s equivalent override.
  const getEffectsForField = (fieldPath: string) => computed(() => document.value.effectOverrides?.[fieldPath] ?? []);

  const documentGetters = {
    ...baseStore.documentGetters,
    landSpeed: computed(() => getViewAwareFieldValue<number>('system.speed.land') ?? 0),

    items: computed(() => [...baseStore._storeUtils.document.value.items]),
    physicalItems: computed(() => [...baseStore._storeUtils.document.value.items]
      .filter((item) => PHYSICAL_ITEM_TYPES.has(item.type)) as unknown[] as PHYSICAL_ITEMS[]
    ),

    getEffectsForField,
    hasEffectsForField: (fieldPath: string) => computed(() => getEffectsForField(fieldPath).value.length > 0),
  };

  const store: ActorDocumentStore<TDocument> = {
    ...baseStore,
    documentGetters,
  };

  return store;
};

interface ActorGetters {
  landSpeed: ComputedRef<number>;
  items: ComputedRef<ItemDnd35e[]>;
  physicalItems: ComputedRef<PHYSICAL_ITEMS[]>;
}

type ActorActions = Record<string, unknown>;
type ActorStoreUtils = Record<string, unknown>;

interface ActorStore {
  documentGetters: ActorGetters;
  documentActions: ActorActions;
  _storeUtils: ActorStoreUtils;
}

type ActorDocumentStore<TDocument extends ActorDnd35e = ActorDnd35e> =
  DocumentSheetStore<TDocument> & {
    documentGetters: DocumentSheetStore<TDocument>['documentGetters'] & ActorGetters;
  };

export { useActorSheetStore };
export type {
  ActorActions,
  ActorDocumentStore,
  ActorGetters,
  ActorStore,
  ActorStoreUtils,
  UseActorSheetStoreOptions,
};
