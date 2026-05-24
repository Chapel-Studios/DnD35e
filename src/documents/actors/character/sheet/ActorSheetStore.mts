import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type { DocumentSheetStore, SheetTab } from '@documents/document/index.mjs';
import { useDocumentSheetStore } from '@documents/document/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';

const useActorSheetStore = <TDocument extends ActorDnd35e>(
  context: VueApplicationContext<TDocument>,
  options: {
    defaultTabs?: SheetTab[];
    defaultActiveTab?: string;
  } = {}
): DocumentSheetStore<TDocument> => {
  const baseStore = useDocumentSheetStore(context, options);
  const document = baseStore._storeUtils.document;

  baseStore._storeUtils.setGetFreshDocument(async (id: string) => {
    const doc = game.actors.get(id);
    return Promise.resolve(doc ?? null) as Promise<TDocument | null>;
  });

  game.dnd35e.stores[document.value.documentName][context.document.id] = baseStore;

  return baseStore;
};

export { useActorSheetStore };
