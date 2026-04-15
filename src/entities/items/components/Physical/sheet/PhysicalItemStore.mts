import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { IdentifiableDocumentActions, IdentifiableDocumentGetters, IdentifiableDocumentStoreUtils, IdentifiableStore } from '@ec/Identifiable/index.mjs';
import { useIdentifiableStore } from '@ec/Identifiable/index.mjs';
import type { MaterialType } from '@effects/material/index.mjs';
import { materialEffectType } from '@effects/material/index.mjs';
import type { ItemDocumentActions, ItemDocumentGetters, ItemSheetStore, ItemSheetStoreUtils } from '@items/baseItem/index.mjs';
import { physicalItemEffectsTab, type PhysicalItemLike } from '@items/components/Physical/index.mjs';
import { SettingsStore } from '@settings/core/sheet/settingsStore.mjs';
import { PriceData } from '@settings/currency/index.mjs';
import { DamageReductionTypesConfig, GAME_RULES_KEYS, SettingsStoreSymbol } from '@settings/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import { MultiSelectOption } from '@vc/Fields/index.mjs';
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
  } = inject(SettingsStoreSymbol) as SettingsStore;
  const {
    documentGetters: {
      getViewAwareFieldValue,
    },
    _storeUtils: {
      document,
      updateHiddenEffects,
    },
  } = baseStore;
  const identifiableStore = useIdentifiableStore(
    context,
  baseStore as DocumentSheetStore<TDocument>
  );
  updateHiddenEffects([materialEffectType]);
  // const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const { replaceTabs, tabs } = baseStore._storeUtils.tabStore;
  replaceTabs([
    ...tabs.value.filter((tab) => 'effects' !== tab.id),
    physicalItemEffectsTab,
  ]);

  const createDefaultPrice = (): PriceData => new PriceData({ stacks: [{
    coinId: defaultDisplayCoin.value,
    count: 0,
  }] });

  const documentGetters: PhysicalItemGetters = {
    ...identifiableStore.documentGetters,
    // static props: don't have an identifiable mode
    quantity: computed(() => document.value.system.quantity.value),
    actualWeight: computed(() => convertToLocalizedWeight(document.value.system.weight.value ?? 0) ?? 0),
    effectiveWeight: computed(() => convertToLocalizedWeight(document.value.system.effectiveWeight ?? 0) ?? 0),
    currentHp: computed(() => getViewAwareFieldValue('system.hp.current') || 0),
    maxHp: computed(() => getViewAwareFieldValue('system.hp.max') || 0),
    possibleContainers: computed(() => {
      // TODO(Phase 6): build this out after implementing containers (§C2)
      return [{ value: null, label: game.i18n.localize('dnd35e.COMMON.None') }];
    }),
    hardness: computed(() => getViewAwareFieldValue('system.hardness') ?? 0),
    // currentContainerId: computed(() => document.value.system.containerId),
    isCarried: computed(() => document.value.system.isCarried),
    size: computed(() => getViewAwareFieldValue('system.size') ?? ''),
    materials: computed(() => 
      [...document.value.effects].filter((effect) => effect.type === materialEffectType) as unknown as MaterialType[]
    ),

    // Identifiable props: use effective value to allow overrides when viewing as unidentified
    price: computed(() => getViewAwareFieldValue('system.price') || createDefaultPrice()),
    // TODO(Phase 5): These need to be reassessed as material effects (broken/masterwork AE content)
    // resalePrice: computed(() => getViewAwareFieldValue('system.resalePrice') ?? null),
    // brokenResalePrice: computed(() => getViewAwareFieldValue('system.brokenResalePrice') ?? null),
    // isBroken: computed(() => getViewAwareFieldValue('system.isBroken') || false),

    // Material Effects support
    magicEquivalency: computed(() => document.value.system.magicEquivalency ?? 0),
    damageReductionTypes: computed(() => [...(document.value.system.damageReductionTypes ?? [])]),
    damageReductionTypeOptions: computed<MultiSelectOption<string>[]>(() => {
      const config = game.settings.get(SYSTEM_ID, GAME_RULES_KEYS.DAMAGE_REDUCTION_TYPES) as DamageReductionTypesConfig;
      return Object.entries(config)
        .filter(([, entry]) => entry.enabled)
        .map(([key, entry]) => ({
          value: key,
          label: entry.label,
        }));
    }),
  };

  return {
    ...identifiableStore,
    documentGetters,
  };
};

interface PhysicalItemGetters extends IdentifiableDocumentGetters {
  quantity: ComputedRef<number>;
  actualWeight: ComputedRef<number>;
  effectiveWeight: ComputedRef<number>;
  price: ComputedRef<PriceData>;
  // resalePrice: ComputedRef<PriceData | null>;
  // brokenResalePrice: ComputedRef<PriceData | null>;
  // isBroken: ComputedRef<boolean>;
  maxHp: ComputedRef<number>;
  currentHp: ComputedRef<number>;
  hardness: ComputedRef<number | null>;
  possibleContainers: ComputedRef<Array<{ value: null; label: string }>>;
  // currentContainerId: ComputedRef<string | null>;
  isCarried: ComputedRef<boolean>;
  size: ComputedRef<string>;
  materials: ComputedRef<MaterialType[]>;
  magicEquivalency: ComputedRef<number | null>;
  damageReductionTypes: ComputedRef<string[]>;
  damageReductionTypeOptions: ComputedRef<MultiSelectOption<string>[]>;
}

interface PhysicalItemStoreUtils extends IdentifiableDocumentStoreUtils {}

interface PhysicalItemActions extends IdentifiableDocumentActions {}

interface PhysicalItemStore extends IdentifiableStore {
    documentGetters: PhysicalItemGetters;
    _storeUtils: PhysicalItemStoreUtils;
}

interface PhysicalDocumentStore extends PhysicalItemStore, ItemSheetStore<PhysicalItemLike> {
  _storeUtils: PhysicalItemStoreUtils & ItemSheetStoreUtils<PhysicalItemLike>;
  documentGetters: PhysicalItemGetters & ItemDocumentGetters;
  documentActions: ItemDocumentActions<PhysicalItemLike>;
}

export { usePhysicalItemStore };
export type {
  PhysicalDocumentStore,
  PhysicalItemActions,
  PhysicalItemGetters,
  PhysicalItemStore,
  PhysicalItemStoreUtils,
};
