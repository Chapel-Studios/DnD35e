import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type { DocumentSheetStore } from '@documents/document/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

/**
 * Overlay that adds actor-level named getters and behaviors on top of a base
 * document sheet store. Mirrors the IdentifiableStore / CreatureStore pattern:
 * returns a partial overlay that callers spread into the final leaf store.
 *
 * Responsibilities at this layer:
 *   - Tell the base store how to refetch this kind of document (`game.actors.get`).
 *   - Provide getters for fields defined on `ActorSystemModel` (e.g. speeds).
 *
 * Final-store registration in `game.dnd35e.stores` is done by the leaf store,
 * since it requires the fully composed store reference.
 */
const useActorSheetStore = <TDocument extends ActorDnd35e>(
  _context: VueApplicationContext<TDocument>,
  baseStore: DocumentSheetStore<TDocument>
): ActorStore => {
  const {
    documentGetters: { getViewAwareFieldValue },
  } = baseStore;

  baseStore._storeUtils.setGetFreshDocument(async (id: string) => {
    const doc = game.actors.get(id);
    return Promise.resolve(doc ?? null) as Promise<TDocument | null>;
  });

  const documentGetters: ActorGetters = {
    landSpeedBase:  computed(() => getViewAwareFieldValue<number>('system.speed.land.base')  ?? 0),
    landSpeedTotal: computed(() => getViewAwareFieldValue<number>('system.speed.land.total') ?? 0),
    // TODO(actor speed): expose climb/swim/burrow/fly when sheet UI consumes them
  };

  return {
    documentGetters,
    documentActions: {},
    _storeUtils: {},
  };
};

interface ActorGetters {
  landSpeedBase:  ComputedRef<number>;
  landSpeedTotal: ComputedRef<number>;
}

type ActorActions = Record<string, unknown>;
type ActorStoreUtils = Record<string, unknown>;

interface ActorStore {
  documentGetters: ActorGetters;
  documentActions: ActorActions;
  _storeUtils: ActorStoreUtils;
}

type ActorDocumentStore<TDocument extends ActorDnd35e = ActorDnd35e> =
  DocumentSheetStore<TDocument> & ActorStore;

export { useActorSheetStore };
export type {
  ActorActions,
  ActorDocumentStore,
  ActorGetters,
  ActorStore,
  ActorStoreUtils,
};
