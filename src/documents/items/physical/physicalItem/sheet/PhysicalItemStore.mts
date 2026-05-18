import type { DocumentSheetStore } from '@documents/document/index.mjs';
import type { IdentifiableDocumentActions, IdentifiableDocumentGetters, IdentifiableDocumentStoreUtils, IdentifiableStore } from '@documents/identifiable/index.mjs';
import { useIdentifiableStore } from '@documents/identifiable/index.mjs';
import type { MaterialType } from '@effects/material/Material.mjs';
import { materialEffectType } from '@effects/material/materialEffectType.mjs';
import type { SecretType } from '@effects/secret/Secret.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import { PriceData } from '@fields/PriceData.mjs';
import type { ItemDocumentActions, ItemDocumentGetters, ItemSheetStore, ItemSheetStoreUtils } from '@items/baseItem/index.mjs';
import { physicalItemEffectsTab, type PhysicalItemLike } from '@items/physical/physicalItem/index.mjs';
import type { DamageReductionTypesConfig } from '@settings/index.mjs';
import { GAME_RULES_KEYS, SettingsStoreSymbol } from '@settings/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import type { SettingsStore } from '@settings/shared/sheet/settingsStore.mjs';
import type { MultiSelectOption } from '@vc/fields/index.mjs';
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
    documentActions: {
      editEffect,
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
  const isGM = game.user.isGM;
  updateHiddenEffects([materialEffectType, secretEffectType]);
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
    quantity: computed(() => document.value.system.quantity),
    actualWeight: computed(() => convertToLocalizedWeight(document.value.system.weight ?? 0) ?? 0),
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
    materials: computed(() => {
      const all = [...document.value.effects].filter((effect) => effect.type === materialEffectType);
      return (isGM ? all : all.filter(e => !e.system.isHidden)) as unknown as MaterialType[];
    }),
    secrets: computed(() =>
      ([...document.value.effects].filter((effect) => effect.type === secretEffectType) as unknown as SecretType[])
        .sort((a, b) => (a.system.isPlayerEditSecret ? 0 : 1) - (b.system.isPlayerEditSecret ? 0 : 1))
    ),

    // Identifiable props: use effective value to allow overrides when viewing as unidentified
    price: computed(() => getViewAwareFieldValue('system.price') || createDefaultPrice()),
    // TODO(Phase 5): This needs to be reassessed as material effects (broken/masterwork Material content)
    // isBroken: computed(() => getViewAwareFieldValue('system.isBroken') || false),
    // TODO(Phase ?): These need to be reassessed for merchants (advanced actors)
    // resalePrice: computed(() => getViewAwareFieldValue('system.resalePrice') ?? null),
    // brokenResalePrice: computed(() => getViewAwareFieldValue('system.brokenResalePrice') ?? null),

    // Material Effects support
    magicEquivalency: computed(() => document.value.system.magicEquivalency ?? 0),
    damageReductionTypes: computed(() => [...(document.value.system.damageReductionTypes ?? [])]),
    damageReductionTypeOptions: computed<MultiSelectOption<string>[]>(() => {
      const config = game.settings.get(SYSTEM_ID, GAME_RULES_KEYS.DAMAGE_REDUCTION_TYPES) as DamageReductionTypesConfig;
      const systemDefaults = (CONFIG.dnd35e.gameRules.damageReductionTypes ?? {}) as Record<string, { label: string }>;
      return Object.entries(config)
        .filter(([, entry]) => entry.enabled)
        .map(([key, entry]) => ({
          value: key,
          label: systemDefaults[key]?.label ?? entry.label,
        }));
    }),
  };

  const documentActions: PhysicalItemActions = {
    ...identifiableStore.documentActions,
    createSecret: async () => {
      const createdSecrets = await document.value.createEmbeddedDocuments('ActiveEffect', [{
        name: game.i18n.localize('dnd35e.EFFECT.Secret.New'),
        img: 'icons/svg/eye.svg',
        type: secretEffectType,
        origin: document.value.uuid,
        disabled: false,
      }]);

      const createdSecret = createdSecrets[0];
      if (createdSecret?.id) {
        editEffect(createdSecret.id);
      }
    },
  };

  return {
    ...identifiableStore,
    documentGetters,
    documentActions,
  };
};

interface PhysicalItemGetters extends IdentifiableDocumentGetters {
  quantity: ComputedRef<number>;
  actualWeight: ComputedRef<number>;
  effectiveWeight: ComputedRef<number>;
  price: ComputedRef<PriceData>;
  // isBroken: ComputedRef<boolean>;
  maxHp: ComputedRef<number>;
  currentHp: ComputedRef<number>;
  hardness: ComputedRef<number | null>;
  possibleContainers: ComputedRef<Array<{ value: null; label: string }>>;
  // currentContainerId: ComputedRef<string | null>;
  isCarried: ComputedRef<boolean>;
  size: ComputedRef<string>;
  materials: ComputedRef<MaterialType[]>;
  secrets: ComputedRef<SecretType[]>;
  magicEquivalency: ComputedRef<number | null>;
  damageReductionTypes: ComputedRef<string[]>;
  damageReductionTypeOptions: ComputedRef<MultiSelectOption<string>[]>;
}

interface PhysicalItemStoreUtils extends IdentifiableDocumentStoreUtils {}

interface PhysicalItemActions extends IdentifiableDocumentActions {
  createSecret: () => Promise<void>;
}

interface PhysicalItemStore extends IdentifiableStore {
    documentGetters: PhysicalItemGetters;
    documentActions: PhysicalItemActions;
    _storeUtils: PhysicalItemStoreUtils;
}

interface PhysicalDocumentStore extends PhysicalItemStore, ItemSheetStore<PhysicalItemLike> {
  _storeUtils: PhysicalItemStoreUtils & ItemSheetStoreUtils<PhysicalItemLike>;
  documentGetters: PhysicalItemGetters & ItemDocumentGetters;
  documentActions: ItemDocumentActions<PhysicalItemLike> & PhysicalItemActions;
}

export { usePhysicalItemStore };
export type {
  PhysicalDocumentStore,
  PhysicalItemActions,
  PhysicalItemGetters,
  PhysicalItemStore,
  PhysicalItemStoreUtils,
};
