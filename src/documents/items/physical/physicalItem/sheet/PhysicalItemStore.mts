import type { DocumentSheetStore } from '@documents/document/index.mjs';
import type { IdentifiableDocumentActions, IdentifiableDocumentGetters, IdentifiableDocumentStoreUtils, IdentifiableStore } from '@documents/identifiable/index.mjs';
import { useIdentifiableStore } from '@documents/identifiable/index.mjs';
import { syncContainmentAe } from '@effects/containment/logic/containmentAe.mjs';
import { syncBrokenAeState } from '@effects/material/logic/brokenAe.mjs';
import type { MaterialType } from '@effects/material/Material.mjs';
import { materialEffectType } from '@effects/material/materialEffectType.mjs';
import type { SecretType } from '@effects/secret/Secret.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import { CurrencyData } from '@fields/currency/CurrencyData.mjs';
import type { ItemDocumentActions, ItemDocumentGetters, ItemSheetStore, ItemSheetStoreUtils, UseItemSheetStoreOptions } from '@items/baseItem/index.mjs';
import { useItemSheetStore } from '@items/baseItem/index.mjs';
import { containerItemType } from '@items/itemTypes.mjs';
import type { Container } from '@items/physical/container/index.mjs';
import type { DamageReductionTypesConfig } from '@settings/index.mjs';
import { GAME_RULES_KEYS, SettingsStoreSymbol } from '@settings/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import type { SettingsStore } from '@settings/shared/sheet/settingsStore.mjs';
import type { SelectOption } from '@vc/fields/index.mjs';
import type { VueApplicationContext } from '@vueApps/index.mjs';
import type { ComputedRef } from 'vue';
import { computed, inject } from 'vue';

import type { PhysicalItem, PhysicalItemLike } from '../PhysicalItem.mjs';
import { physicalItemEffectsTab } from './tabs/index.mjs';

type UsePhysicalItemStoreOptions = UseItemSheetStoreOptions;

const usePhysicalItemStore = <TDocument extends PhysicalItemLike = PhysicalItemLike> (
  context: VueApplicationContext<TDocument>,
  options?: UsePhysicalItemStoreOptions
): PhysicalDocumentStore<TDocument> => {
  const baseStore = useItemSheetStore<TDocument>(context, options);
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
      updateGmOnlyEffectTypes,
    },
  } = baseStore;
  const identifiableStore = useIdentifiableStore(
    context,
    baseStore as DocumentSheetStore<TDocument>
  );
  const isGM = game.user.isGM;
  updateGmOnlyEffectTypes([secretEffectType]);
  const { replaceTabs, tabs } = baseStore._storeUtils.tabStore;
  replaceTabs([
    ...tabs.value.filter((tab) => 'effects' !== tab.id),
    physicalItemEffectsTab,
  ]);

  const createDefaultPrice = (): CurrencyData => new CurrencyData({ stacks: [{
    coinId: defaultDisplayCoin.value,
    count: 0,
  }] });

  const documentGetters: PhysicalItemGetters & ItemDocumentGetters = {
    ...baseStore.documentGetters,
    ...identifiableStore.documentGetters,
    // static props: don't have an identifiable mode
    quantity: computed(() => document.value.system.quantity),
    weight: computed(() => convertToLocalizedWeight(document.value.system.weight ?? 0) ?? 0),
    currentHp: computed(() => getViewAwareFieldValue('system.hp.current') || 0),
    maxHp: computed(() => getViewAwareFieldValue('system.hp.max') || 0),
    possibleContainers: computed(() => {
      const containerOptions: SelectOption<string | null>[] = [{
        value: null,
        label: game.i18n.localize('dnd35e.COMMON.None'),
      }];
      if (!document.value.actor) {
        const existingUuid = document.value.system.containerUuid;
        if (!existingUuid) {
          return containerOptions;
        }

        const existingContainer = fromUuidSync<Container>(existingUuid);

        containerOptions.push({
          value: existingUuid,
          label: existingContainer?.name ?? '',
        });
        return containerOptions;
      }

      return [
        ...containerOptions,
        ...document.value.actor.items
          .filter((item) => item.type === containerItemType && item.id !== document.value.id)
          .map((item) => ({
            value: item.uuid,
            label: item.name,
          })),
      ];
    }),
    containerUuid: computed(() => document.value.system.containerUuid),
    hardness: computed(() => getViewAwareFieldValue('system.hardness') ?? 0),
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
    isBroken: computed(() => document.value.system.isBroken ?? false),
    // TODO(Phase ?): These need to be reassessed for merchants (advanced actors)
    // resalePrice: computed(() => getViewAwareFieldValue('system.resalePrice') ?? null),
    // brokenResalePrice: computed(() => getViewAwareFieldValue('system.brokenResalePrice') ?? null),

    // Material Effects support
    magicEquivalency: computed(() => document.value.system.magicEquivalency ?? 0),
    damageReductionTypes: computed(() => [...(document.value.system.damageReductionTypes ?? [])]),
    damageReductionTypeOptions: computed<SelectOption<string>[]>(() => {
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

  const documentActions: PhysicalItemActions & ItemDocumentActions<TDocument> = {
    ...baseStore.documentActions,
    ...identifiableStore.documentActions,
    toggleBroken: async (value: boolean) => {
      await syncBrokenAeState(document.value as unknown as PhysicalItem, value);
    },
    revealAllSecrets: async () => {
      const active = [...document.value.effects].filter(
        (e) => e.type === secretEffectType && !e.disabled
      );
      if (active.length > 0) {
        await document.value.updateEmbeddedDocuments(
          'ActiveEffect',
          active.map((e) => ({ _id: e.id, disabled: true }))
        );
      }
    },
    syncContainer: async (containerUuid: string | null) => {
      const container = containerUuid
        ? await fromUuid(containerUuid) as Container
        : null;
      await syncContainmentAe(document.value, container);
    },
  };

  const store: PhysicalDocumentStore<TDocument> = {
    ...baseStore,
    documentGetters,
    documentActions,
  };

  return store;
};

interface PhysicalItemGetters extends IdentifiableDocumentGetters {
  quantity: ComputedRef<number>;
  weight: ComputedRef<number>;
  price: ComputedRef<CurrencyData>;
  isBroken: ComputedRef<boolean>;
  maxHp: ComputedRef<number>;
  currentHp: ComputedRef<number>;
  hardness: ComputedRef<number | null>;
  possibleContainers: ComputedRef<SelectOption<string | null>[]>;
  containerUuid: ComputedRef<string | null>;
  isCarried: ComputedRef<boolean>;
  size: ComputedRef<string>;
  materials: ComputedRef<MaterialType[]>;
  secrets: ComputedRef<SecretType[]>;
  magicEquivalency: ComputedRef<number | null>;
  damageReductionTypes: ComputedRef<string[]>;
  damageReductionTypeOptions: ComputedRef<SelectOption<string>[]>;
}

interface PhysicalItemStoreUtils extends IdentifiableDocumentStoreUtils {}

interface PhysicalItemActions extends IdentifiableDocumentActions {
  toggleBroken: (value: boolean) => Promise<void>;
  revealAllSecrets: () => Promise<void>;
  syncContainer: (containerUuid: string | null) => Promise<void>;
}

interface PhysicalItemStore extends IdentifiableStore {
    documentGetters: PhysicalItemGetters;
    documentActions: PhysicalItemActions;
    _storeUtils: PhysicalItemStoreUtils;
}

type PhysicalDocumentStore<TDocument extends PhysicalItemLike = PhysicalItemLike> =
  ItemSheetStore<TDocument> & {
    documentGetters: ItemDocumentGetters & PhysicalItemGetters;
    documentActions: ItemDocumentActions<TDocument> & PhysicalItemActions;
    _storeUtils: ItemSheetStoreUtils<TDocument> & PhysicalItemStoreUtils;
  };

export { usePhysicalItemStore };
export type {
  PhysicalDocumentStore,
  PhysicalItemActions,
  PhysicalItemGetters,
  PhysicalItemStore,
  PhysicalItemStoreUtils,
  UsePhysicalItemStoreOptions,
};

