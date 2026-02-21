import type { DocumentSheetStore, SheetTab } from '@ec/CoreMixin/index.mjs';
import { useDocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import { DnD35eActiveEffect } from '@effects/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import {
  defaultDescriptionTab,
  defaultEffectsTab,
} from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { Ref } from 'vue';
import { computed } from 'vue';

const getDefaultItemTabs = (): SheetTab[] => [
  defaultDescriptionTab,
  defaultEffectsTab,
];

const useItemSheetStore = <TDocument extends ItemDnd35e>(context: VueApplicationContext<TDocument>): ItemSheetStore<TDocument> => {
  // Get base store functionality
  const baseStore = useDocumentSheetStore(context, {
    defaultTabs: getDefaultItemTabs(),
    defaultActiveTab: 'description',
  });
  const document = baseStore._document as unknown as Ref<TDocument>;

  // Item-specific state

  // const getItemTypeDisplay = (fallback: string = 'D35E.Item') =>
  //   computed(() => game.i18n.localize(itemType || fallback));

  // Item-specific document getters
  // Note: We spread the effects into a plain array to avoid Vue proxy conflicts
  // with Foundry's EmbeddedCollection proxy (non-configurable property error)
  const itemDocumentGetters = {
    ...baseStore.documentGetters,
    effects: computed(() => [...(document.value.effects ?? [])]),
    temporaryEffects: computed(() => [...(document.value.effects ?? [])].filter((e) => !e.disabled && e.isTemporary)),
    passiveEffects: computed(() => [...(document.value.effects ?? [])].filter((e) => !e.disabled && !e.isTemporary)),
    inactiveEffects: computed(() => [...(document.value.effects ?? [])].filter((e) => e.disabled)),
  };

  const itemDocumentActions = {
    ...baseStore.documentActions,
    removeEffect: async (effectId: string) => {
      const updatedEffects = document.value.effects.filter((effect) => effect.id !== effectId);
      return await baseStore.documentActions.updateDocument(
        { effects: updatedEffects } as unknown as Partial<TDocument>,
        {
          diff: false,
        },
      );
    },
  };

  return {
    ...baseStore,
    documentGetters: itemDocumentGetters,
    documentActions: itemDocumentActions,
    // Item-specific
  };
};

// TODO
type ItemSheetStore<TDocument extends ItemDnd35e<ItemType> = ItemDnd35e<ItemType>> = DocumentSheetStore<TDocument>
  & {
    documentGetters: DocumentSheetStore<TDocument>['documentGetters'] & {
      effects: Ref<DnD35eActiveEffect[]>,
      temporaryEffects: Ref<DnD35eActiveEffect[]>,
      passiveEffects: Ref<DnD35eActiveEffect[]>,
      inactiveEffects: Ref<DnD35eActiveEffect[]>,
    },
    documentActions: DocumentSheetStore<TDocument>['documentActions'] & {
      removeEffect: (effectId: string) => Promise<boolean>;
    },
  };

export {
  getDefaultItemTabs,
  useItemSheetStore,
};

export type {
  ItemSheetStore,
};
