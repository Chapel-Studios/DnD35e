import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { IdentifiableStore } from '@ec/Identifiable/index.mjs';
import { useIdentifiableStore } from '@ec/Identifiable/index.mjs';
import type { MaterialType } from '@effects/material/index.mjs';
import { materialEffectType } from '@effects/material/index.mjs';
import type { ItemSheetStore } from '@items/baseItem/index.mjs';
import { physicalItemEffectsTab, type PhysicalItemLike } from '@items/components/Physical/index.mjs';
import { SettingsStore } from '@settings/core/sheet/settingsStore.mjs';
import type { Price } from '@settings/currency/index.mjs';
import type { VueApplicationContext } from '@vueApps/index.mjs';
import type { ComputedRef } from 'vue';
import { computed, inject } from 'vue';

const usePhysicalItemStore = <TDocument extends PhysicalItemLike = PhysicalItemLike> (
  context: VueApplicationContext<TDocument>,
  baseStore: ItemSheetStore<TDocument>
): PhysicalItemStore => {
  const {
    currency: {
      defaultDisplayCoin,
    },
    measurement: {
      convertToLocalizedWeight,
    },
  } = inject('settingsStore') as SettingsStore;
  const document = baseStore._storeUtils.document;
  const identifiableStore = useIdentifiableStore(
    context,
  baseStore as DocumentSheetStore<TDocument>
  );
  baseStore._storeUtils.updateHiddenEffects([materialEffectType]);
  baseStore.tabs.tabActions.replaceTabs([
    ...baseStore.tabs.tabGetters.tabs.value.filter((tab) => 'effects' !== tab.id),
    physicalItemEffectsTab,
  ]);
  const getEffectiveFieldValue = baseStore.documentGetters.getEffectiveFieldValue;

  const createDefaultCoinStack = (): Price => ([{
    coinId: defaultDisplayCoin.value,
    count: 0,
  }]);

  const physicalItemGetters = {
    // static props: don't have an identifiable mode
    quantity: computed(() => document.value.system.quantity),
    actualWeight: computed(() => convertToLocalizedWeight(document.value.system.weight ?? 0) ?? 0),
    effectiveWeight: computed(() => convertToLocalizedWeight(document.value.system.effectiveWeight ?? 0) ?? 0),
    currentHp: computed(() => document.value.system.hp.value),
    possibleContainers: computed(() => {
      // TODO: build this out after implementing containers
      return [{ value: null, label: game.i18n.localize('D35E.None') }];
    }),
    hardness: computed(() => document.value.system.hardness ?? 0),
    currentContainerId: computed(() => document.value.system.containerId),
    isCarried: computed(() => document.value.system.isCarried),
    size: computed(() => game.i18n.localize(document.value.system.size)),
    materials: computed(() => 
      [...document.value.effects].filter((effect) => effect.type === materialEffectType) as unknown as MaterialType[]
    ),

    // Identifiable props: use effective value to allow overrides when viewing as unidentified
    price: computed(() => getEffectiveFieldValue('system.price', document.value.system.price) || createDefaultCoinStack()),
    resalePrice: computed(() => getEffectiveFieldValue('system.resalePrice', document.value.system.resalePrice) || []),
    brokenResalePrice: computed(() => getEffectiveFieldValue('system.brokenResalePrice', document.value.system.brokenResalePrice) || []),
    isBroken: computed(() => getEffectiveFieldValue('system.isBroken', document.value.system.isBroken) || false),
    maxHp: computed(() => getEffectiveFieldValue('system.hp.max', document.value.system.hp.max) || 0),
  };

  return {
    ...identifiableStore,
    physicalItemGetters,
  };
};

interface PhysicalItemStore extends IdentifiableStore {
  physicalItemGetters: {
    quantity: ComputedRef<number>;
    actualWeight: ComputedRef<number>;
    effectiveWeight: ComputedRef<number>;
    price: ComputedRef<Price>;
    resalePrice: ComputedRef<Price>;
    brokenResalePrice: ComputedRef<Price>;
    isBroken: ComputedRef<boolean>;
    maxHp: ComputedRef<number>;
    currentHp: ComputedRef<number>;
    hardness: ComputedRef<number | null>;
    possibleContainers: ComputedRef<Array<{ value: null; label: string }>>;
    currentContainerId: ComputedRef<string | null>;
    isCarried: ComputedRef<boolean>;
    size: ComputedRef<string>;
    materials: ComputedRef<MaterialType[]>;
  };
}

interface PhysicalDocumentStore extends PhysicalItemStore, ItemSheetStore<PhysicalItemLike> {}

export { usePhysicalItemStore };
export type {
  PhysicalDocumentStore,
  PhysicalItemStore,
};
