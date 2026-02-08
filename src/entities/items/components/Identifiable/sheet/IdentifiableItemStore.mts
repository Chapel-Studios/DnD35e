import type { ItemSheetStore, ItemSheetTab } from '@items/baseItem/index.mjs';
import { computed, Ref } from 'vue';
import { IdentifiableNameConfig, IdentifiableDescription } from '@items/components/Identifiable/index.mjs';
import type { IdentifiableItemSheetRenderContext, IdentifiableItemLike } from '@items/components/Identifiable/index.mjs';

const createIdentifiableTabs = (): ItemSheetTab[] => [
  {
    id: 'description',
    label: 'D35E.Description',
    component: IdentifiableDescription,
    order: 10,
  },
  {
    id: 'name-config',
    label: 'D35E.Name',
    component: IdentifiableNameConfig,
    order: 10,
  },
];

const useIdentifiableStore = <TDocument extends IdentifiableItemLike> (context: IdentifiableItemSheetRenderContext, baseStore: ItemSheetStore<TDocument>) => {
  baseStore.tabs.tabActions.replaceTabs(createIdentifiableTabs());

  const document = baseStore._document as unknown as Ref<IdentifiableItemLike>;

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

interface IdentifiableItemStore<TDocument extends IdentifiableItemLike = IdentifiableItemLike> extends ReturnType<typeof useIdentifiableStore>, ItemSheetStore<TDocument> {}

export { useIdentifiableStore };
export type {
  IdentifiableItemStore,
};
