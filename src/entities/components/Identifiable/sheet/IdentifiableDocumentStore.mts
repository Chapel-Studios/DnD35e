import { type DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { IdentifiableDocumentLike } from '@ec/Identifiable/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

/**
 * Extends a base document store with identifiable-specific functionality.
 * This modifies the base store's behavior via setters and returns only identifiable-specific properties.
 * The base store's documentGetters/documentActions are automatically enhanced.
 */
const useIdentifiableStore = <TDocument extends IdentifiableDocumentLike>(
  _context: VueApplicationContext<TDocument>,
  baseStore: DocumentSheetStore<TDocument>
): IdentifiableStore => {
  const {
    document,
  } = baseStore._storeUtils;

  // ===== IDENTIFIABLE STATE =====
  const isIdentifiable = computed(() => {
    return (document.value as unknown as { isIdentifiable?: boolean })?.isIdentifiable === true;
  });

  const isIdentified = computed(() => {
    return (document.value as unknown as { isIdentified?: boolean })?.isIdentified ?? true;
  });

  // ===== EDITOR VIEW ACTIONS =====
  const editorViewActions = {
    revealAllSecrets: async (): Promise<void> => {
      const doc = document.value;
      if ('revealAllSecrets' in doc && typeof doc.revealAllSecrets === 'function') {
        await doc.revealAllSecrets();
      }
    },
  };

  return {
    documentGetters: {
      isIdentifiable,
      isIdentified,
    },
    _storeUtils: {},
    documentActions: editorViewActions,
  };
};

type IdentifiableDocumentGetters = {
  isIdentifiable: ComputedRef<boolean>;
  isIdentified: ComputedRef<boolean>;
};

type IdentifiableDocumentActions = {
  revealAllSecrets: () => Promise<void>;
};
type IdentifiableDocumentStoreUtils = Record<string, unknown>;

interface IdentifiableStore {
  documentGetters: IdentifiableDocumentGetters;
  documentActions: IdentifiableDocumentActions;
  _storeUtils: IdentifiableDocumentStoreUtils;
}

type IdentifiableDocumentStore = DocumentSheetStore<IdentifiableDocumentLike> & IdentifiableStore;

export {
  useIdentifiableStore,
};

export type {
  IdentifiableDocumentActions,
  IdentifiableDocumentGetters,
  IdentifiableDocumentStore,
  IdentifiableDocumentStoreUtils,
  IdentifiableStore,
};
