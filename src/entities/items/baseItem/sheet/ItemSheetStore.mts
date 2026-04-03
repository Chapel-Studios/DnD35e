import type {
  DocumentSheetStore,
  DocumentSheetStoreDocumentActions,
  DocumentSheetStoreDocumentGetters,
  DocumentSheetStoreUtils,
  SheetTab,
} from '@ec/CoreMixin/index.mjs';
import { defaultDetailsTab, useDocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import { DnD35eActiveEffect, EffectType } from '@effects/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import type { ItemType } from '@items/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed, ref, triggerRef } from 'vue';

import {
  defaultEffectsTab,
} from './tabs/index.mjs';

const getDefaultItemTabs = (): SheetTab[] => [
  defaultDetailsTab,
  defaultEffectsTab,
];

const useItemSheetStore = <TDocument extends ItemDnd35e>(context: VueApplicationContext<TDocument>): ItemSheetStore<TDocument> => {
  // Get base store functionality
  const baseStore = useDocumentSheetStore(context, {
    defaultTabs: getDefaultItemTabs(),
    defaultActiveTab: 'details',
  });
  const document = baseStore._storeUtils.document;
  baseStore._storeUtils.setGetFreshDocument(async (id: string) => {
    const doc = game.items.get(id);
    return Promise.resolve(doc) as Promise<TDocument | null>;
  });

  const hasOwner = computed(() => !!document.value.parent);

  // Item-specific document getters
  // Note: We spread the effects into a plain array to avoid Vue proxy conflicts
  // with Foundry's EmbeddedCollection proxy (non-configurable property error)
  const hiddenEffectIds = ref<Set<string>>(new Set());
  const effects = computed(() => [...(document.value.effects ?? [])]
    .filter((effect: DnD35eActiveEffect) => !hiddenEffectIds.value.has(effect.type))
  );
  const getEffectsForField = (fieldPath: string) => computed(() => document.value.overrides?.[fieldPath]
    ? document.value.overrides?.[fieldPath] as []
    : []
  );
  const itemDocumentGetters = {
    ...baseStore.documentGetters,
    effects,
    temporaryEffects: computed(() => effects.value.filter((e: DnD35eActiveEffect) => !e.disabled && e.isTemporary)),
    passiveEffects: computed(() => effects.value.filter((e: DnD35eActiveEffect) => !e.disabled && !e.isTemporary)),
    inactiveEffects: computed(() => effects.value.filter((e: DnD35eActiveEffect) => e.disabled)),
    hasOwner,
    getEffectsForField,
    hasEffectsForField: (fieldPath: string) => computed(() => getEffectsForField(fieldPath).value.length > 0),
  };

  const itemDocumentActions = {
    ...baseStore.documentActions,
    removeEffect: async (effectId: string) => {
      const effect = document.value.effects.get(effectId);
      if (!effect) return false;

      await effect.deleteDialog();
      triggerRef(document);
      return true;
    },
    toggleEffect: async (effectId: string) => {
      const effect = document.value.effects.get(effectId);
      if (!effect) return false;
      await effect.update({ disabled: !effect.disabled });
      triggerRef(document);
      return true;
    },
    editEffect: (effectId: string) => {
      const effect = document.value.effects.get(effectId);
      if (!effect) return false;
      effect.sheet?.render(true);
      triggerRef(document);
      return true;
    },
    createEffect: async () => {
      const effectData = {
        name: game.i18n.localize('D35E.EffectNew'),
        img: 'icons/svg/aura.svg',
        origin: document.value.uuid,
        disabled: false,
      };
      // TODO: fix type definitions
      await (DnD35eActiveEffect as any).createDialog(effectData, {
        parent: document.value,
      });
      // const createData = DnD35eActiveEffect.createDialog(effectData);
      // await document.value.createEmbeddedDocuments('ActiveEffect', [createData]);
      triggerRef(document);
    },
  };

  const itemStoreUtils = {
    ...baseStore._storeUtils,
    updateHiddenEffects: async (effectTypes: EffectType[]) => {
      hiddenEffectIds.value = new Set([
        ...hiddenEffectIds.value,
        ...effectTypes,
      ]);
    },
  };

  const store: ItemSheetStore<TDocument> = {
    ...baseStore,
    documentGetters: itemDocumentGetters,
    documentActions: itemDocumentActions,
    _storeUtils: itemStoreUtils,
    // Item-specific
  };

  game.dnd35e.stores[document.value.documentName][context.document.id] = store;

  return store;
};

type ItemDocumentGetters = DocumentSheetStoreDocumentGetters & {
  effects: ComputedRef<DnD35eActiveEffect[]>,
  temporaryEffects: ComputedRef<DnD35eActiveEffect[]>,
  passiveEffects: ComputedRef<DnD35eActiveEffect[]>,
  inactiveEffects: ComputedRef<DnD35eActiveEffect[]>,
  hasOwner: ComputedRef<boolean>;
  getEffectsForField: (fieldPath: string) => ComputedRef<object[]>;
};

type ItemDocumentActions<TDocument extends ItemDnd35e> = DocumentSheetStoreDocumentActions<TDocument> & {
  removeEffect: (effectId: string) => Promise<boolean>;
  toggleEffect: (effectId: string) => Promise<boolean>;
  editEffect: (effectId: string) => boolean;
  createEffect: () => Promise<void>;
};

type ItemSheetStoreUtils<TDocument extends ItemDnd35e> = DocumentSheetStoreUtils<TDocument> & {
  updateHiddenEffects: (effectTypes: EffectType[]) => Promise<void>;
};

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
};
