import type { ActorActions, ActorDocumentStore, ActorGetters, UseActorSheetStoreOptions } from '@actors/baseActor/sheet/index.mjs';
import { useActorSheetStore } from '@actors/baseActor/sheet/index.mjs';
import type { Creature } from '@actors/creature/Creature.mjs';
import type { SenseEntrySource } from '@actors/creature/data/CreatureSystemData.mjs';
import type { LawAxis, MoralAxis } from '@constants/alignment.mjs';
import { ALIGNMENT_I18N, NEUTRAL } from '@constants/alignment.mjs';
import type { Size } from '@constants/sizes.mjs';
import { addCurrency } from '@fields/currency/logic/mathOperations.mjs';
import { CurrencyData } from '@fields/index.mjs';
import { GAME_RULES_KEYS, type SettingsStore, SettingsStoreSymbol } from '@settings/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import type { SelectOption } from '@vc/fields/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed, inject } from 'vue';

import type { HpAdjustmentType } from './components/constants.mjs';

const buildAlignmentLabel = (law: LawAxis | null, moral: MoralAxis | null): string | null => {
  if (!law && !moral) return null;
  if (law === NEUTRAL && moral === NEUTRAL) {
    return game.i18n.localize(ALIGNMENT_I18N.trueNeutral);
  }

  const lawLabel   = law   ? game.i18n.localize(ALIGNMENT_I18N.law(law))     : null;
  const moralLabel = moral ? game.i18n.localize(ALIGNMENT_I18N.moral(moral)) : null;

  return [lawLabel, moralLabel].filter((p): p is string => Boolean(p)).join(' ') || null;
};

type UseCreatureStoreOptions = UseActorSheetStoreOptions;

/**
 * Creature layer of the actor inheritance chain. Builds the actor store internally,
 * and adds creature-level named getters.
 */
const useCreatureStore = <TDocument extends Creature>(
  context: VueApplicationContext<TDocument>,
  options?: UseCreatureStoreOptions
): CreatureDocumentStore<TDocument> => {
  const actorStore = useActorSheetStore<TDocument>(context, options);
  const { getViewAwareFieldValue } = actorStore.documentGetters;
  const { document } = actorStore._storeUtils;
  
  const {
    currency: { highestVisibleCoin },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const alignmentLaw   = computed(() => getViewAwareFieldValue<LawAxis | null>('system.bio.alignment.law')   ?? null);
  const alignmentMoral = computed(() => getViewAwareFieldValue<MoralAxis | null>('system.bio.alignment.moral') ?? null);

  const documentGetters = {
    ...actorStore.documentGetters,

    // HP is view-aware so masked values render correctly in play/edit surfaces.
    currentHp: computed(() => getViewAwareFieldValue<number>('system.hp.current') ?? 0),
    maxHp: computed(() => getViewAwareFieldValue<number>('system.hp.max') ?? 0),
    tempHp: computed(() => getViewAwareFieldValue<number>('system.hp.temp') ?? 0),
    nonlethalDamage: computed(() => getViewAwareFieldValue<number>('system.hp.nonlethal') ?? 0),

    gender: computed(() => getViewAwareFieldValue<string | null>('system.bio.gender') ?? ''),
    deity:  computed(() => getViewAwareFieldValue<string | null>('system.bio.deity')  ?? ''),
    age:    computed(() => getViewAwareFieldValue<string | null>('system.bio.age')    ?? ''),
    height: computed(() => getViewAwareFieldValue<string | null>('system.bio.height') ?? ''),
    weight: computed(() => getViewAwareFieldValue<string | null>('system.bio.weight') ?? ''),
    race:   computed(() => document.value.race ?? ''),

    alignmentLaw,
    alignmentMoral,
    alignmentLabel: computed(() => buildAlignmentLabel(alignmentLaw.value, alignmentMoral.value)),

    size:           computed(() => getViewAwareFieldValue<Size>('system.size') ?? 'medium'),
    notes:          computed(() => getViewAwareFieldValue<string>('system.notes') ?? ''),
    level:          computed(() => document.value.system.level ?? 1),
    isPartyMember:  computed(() => getViewAwareFieldValue<boolean>('system.settings.isPartyMember') ?? false),
    languages:      computed(() => [...(getViewAwareFieldValue<string[]>('system.bio.languages') ?? [])]),
    senses:         computed(() => {
      const raw = getViewAwareFieldValue<SenseEntrySource[]>('system.bio.senses') ?? [];
      // Clone so Vue's reactivity detects in-place mutations from Foundry's mergeObject
      return foundry.utils.deepClone(raw);
    }),
    armorClass:     computed(() => document.value.calculateAC() ?? 10),
    getArmorClass: (isTouch = false, denyDex = false): number => document.value.calculateAC(isTouch, denyDex) ?? 10,
    availableLanguages: computed<SelectOption<string>[]>(() => {
      const config = game.settings.get(SYSTEM_ID, GAME_RULES_KEYS.AVAILABLE_LANGUAGE_OPTIONS) as Record<string, { label: string; enabled: boolean; isSystem: boolean }>;
      const systemDefaults = (CONFIG.dnd35e.gameRules.availableLanguageOptions ?? {}) as Record<string, { label: string }>;
      return Object.entries(config)
        .filter(([, entry]) => entry.enabled)
        .map(([key, entry]) => ({
          value: key,
          // Use pre-localized CONFIG label for system entries; stored label for custom
          label: systemDefaults[key]?.label ?? entry.label,
        }));
    }),
    displayLanguages: computed<string[]>(() => {
      const config = game.settings.get(SYSTEM_ID, GAME_RULES_KEYS.AVAILABLE_LANGUAGE_OPTIONS) as Record<string, { label: string; enabled: boolean }>;
      const systemDefaults = (CONFIG.dnd35e.gameRules.availableLanguageOptions ?? {}) as Record<string, { label: string }>;
      const stored = getViewAwareFieldValue<string[]>('system.bio.languages') ?? [];
      return stored.map(id => {
        const entry = config[id];
        if (!entry) return id;
        return systemDefaults[id]?.label ?? entry.label;
      });
    }),
    creatureValue: computed(() => {
      const value = addCurrency(document.value.system.currency, document.value.system.inventoryValue);
      return CurrencyData.fromStacks(value.consolidate(highestVisibleCoin.value));
    }),

    encumbranceCarriedWeight: computed(() => getViewAwareFieldValue<number>('system.encumbrance.carriedWeight') ?? 0),
    encumbranceLight:  computed(() => getViewAwareFieldValue<number>('system.encumbrance.light')  ?? 0),
    encumbranceMedium: computed(() => getViewAwareFieldValue<number>('system.encumbrance.medium') ?? 0),
    encumbranceHeavy:  computed(() => getViewAwareFieldValue<number>('system.encumbrance.heavy')  ?? 0),
    encumbranceMaxLift:  computed(() => getViewAwareFieldValue<number>('system.encumbrance.maxLift')  ?? 0),
    encumbranceDrag:   computed(() => getViewAwareFieldValue<number>('system.encumbrance.drag')   ?? 0),
    encumbranceTier:   computed(() => getViewAwareFieldValue<number>('system.encumbrance.tier')   ?? 0),
  };

  const documentActions = {
    ...actorStore.documentActions,
    adjustHp: async (amount: number, adjustmentType: HpAdjustmentType): Promise<boolean> => {
      return await document.value.updateHP(amount, adjustmentType);
    },
  };

  const store: CreatureDocumentStore<TDocument> = {
    ...actorStore,
    documentGetters,
    documentActions,
  };

  return store;
};

interface CreatureGetters {
  currentHp:     ComputedRef<number>;
  maxHp:         ComputedRef<number>;
  tempHp:        ComputedRef<number>;
  nonlethalDamage: ComputedRef<number>;
  gender:         ComputedRef<string>;
  deity:          ComputedRef<string>;
  age:            ComputedRef<string>;
  height:         ComputedRef<string>;
  weight:         ComputedRef<string>;
  race:           ComputedRef<string>;
  alignmentLaw:   ComputedRef<LawAxis | null>;
  alignmentMoral: ComputedRef<MoralAxis | null>;
  alignmentLabel: ComputedRef<string | null>;
  size:           ComputedRef<Size>;
  notes:          ComputedRef<string>;
  level:          ComputedRef<number>;
  isPartyMember:  ComputedRef<boolean>;
  languages:      ComputedRef<string[]>;
  senses:         ComputedRef<SenseEntrySource[]>;
  armorClass:     ComputedRef<number>;
  getArmorClass: (isTouch?: boolean, denyDex?: boolean) => number;
  availableLanguages: ComputedRef<SelectOption<string>[]>;
  displayLanguages: ComputedRef<string[]>;
  creatureValue: ComputedRef<CurrencyData>;
  encumbranceCarriedWeight: ComputedRef<number>;
  encumbranceLight:  ComputedRef<number>;
  encumbranceMedium: ComputedRef<number>;
  encumbranceHeavy:  ComputedRef<number>;
  encumbranceMaxLift:  ComputedRef<number>;
  encumbranceDrag:   ComputedRef<number>;
  encumbranceTier:   ComputedRef<number>;
}

type CreatureActions = {
  adjustHp: (amount: number, adjustmentType: HpAdjustmentType) => Promise<boolean>;
};
type CreatureStoreUtils = Record<string, unknown>;

interface CreatureStore {
  documentGetters: CreatureGetters;
  documentActions: CreatureActions;
  _storeUtils: CreatureStoreUtils;
}

type CreatureDocumentStore<TDocument extends Creature = Creature> =
  ActorDocumentStore<TDocument> & {
    documentGetters: ActorGetters & CreatureGetters;
    documentActions: ActorActions & CreatureActions;
  };

export { useCreatureStore };

export type {
  CreatureActions,
  CreatureDocumentStore,
  CreatureGetters,
  CreatureStore,
  CreatureStoreUtils,
  UseCreatureStoreOptions,
};
