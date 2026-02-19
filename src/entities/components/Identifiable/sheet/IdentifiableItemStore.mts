import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { WithIdenifiableComponent } from '@ec/Identifiable/index.mjs';
import {
  identifiableDescriptionTab,
  identifiableNameConfigTab,
} from '@ec/Identifiable/index.mjs';
import { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';

const useIdentifiableStore = <TDocument extends WithIdenifiableComponent>(_context: VueApplicationContext<TDocument>, baseStore: DocumentSheetStore<TDocument>) => {
  baseStore.tabs.tabActions.replaceTabs([
    identifiableDescriptionTab,
    identifiableNameConfigTab,
  ]);

  const document = baseStore._document as unknown as Ref<WithIdenifiableComponent>;

  // UnidentifiedInfoMode
  const showBoth = computed(() => (game.user.isGM || baseStore.isEditable) && document.value.system.isIdentifiable);
  const showOnlyIdentified = computed(() =>
    !document.value.system.isIdentifiable ||
    (document.value.system.unidentifiedInfo?.isIdentified || false),
  );
  const showOnlyUnidentified = computed(() => document.value.system.isIdentifiable && !document.value.system.unidentifiedInfo?.isIdentified);
  const showIdentified = computed(() => showBoth.value || showOnlyIdentified.value);
  const showUnidentified = computed(() => showBoth.value || showOnlyUnidentified.value);

  // Getters
  const identifableGetters = {
    unidentifiedDescription: computed(() => document.value.system.unidentifiedInfo?.unidentifiedDescription || ''),
    isIdentifiable: computed(() => document.value.system.isIdentifiable),
    identifiedDisplayName: computed(() => document.value.identifiedDisplayName),
    unidentifiedDisplayName: computed(() => document.value.unidentifiedDisplayName),
    unidentifiedName: computed(() => document.value.system.unidentifiedInfo?.unidentifiedName || ''),
    isUnidentifiedNameFromFormula: computed(() => document.value.system.unidentifiedInfo?.isUnidentifiedNameFromFormula || false),
    unidentifiedNameFormula: computed(() => document.value.system.unidentifiedInfo?.unidentifiedNameFormula || ''),
    unidentifiedPrice: computed(() => document.value.system.unidentifiedInfo?.unidentifiedPrice),
  };

  return {
    unidentifiedInfoMode: {
      showBoth,
      showIdentified,
      showUnidentified,
      showOnlyIdentified,
      showOnlyUnidentified,
    },
    identifableGetters,
  };
};

interface IdentifiableStore {
  unidentifiedInfoMode: {
    showBoth: ComputedRef<boolean>;
    showIdentified: ComputedRef<boolean>;
    showUnidentified: ComputedRef<boolean>;
    showOnlyIdentified: ComputedRef<boolean>;
    showOnlyUnidentified: ComputedRef<boolean>;
  };
  identifableGetters: {
    unidentifiedDescription: ComputedRef<string>;
    isIdentifiable: ComputedRef<boolean>;
    identifiedDisplayName: ComputedRef<string>;
    unidentifiedDisplayName: ComputedRef<string>;
    unidentifiedName: ComputedRef<string>;
    isUnidentifiedNameFromFormula: ComputedRef<boolean>;
    unidentifiedNameFormula: ComputedRef<string>;
    unidentifiedPrice: ComputedRef<number | null | undefined>;
  };
}

type IdentifiableDocumentStore = DocumentSheetStore<WithIdenifiableComponent> & IdentifiableStore;

export {
  identifiableDescriptionTab,
  identifiableNameConfigTab,
  useIdentifiableStore,
};

export type {
  IdentifiableDocumentStore,
  IdentifiableStore,
};
