import type { UnitOfMeasureOption } from '@settings/display/unitOfMeasure.mjs';
import { imperialUnitOfMeasure, WEIGHT_OPTIONS } from '@settings/display/unitOfMeasure.mjs';
import type { CoinageDefinition, CurrencyConfig } from '@settings/index.mjs';
import { CURRENCY_KEY, DISPLAY_WORLD_KEYS } from '@settings/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import type { ComputedRef } from 'vue';
import { computed, ref } from 'vue';

const useSettingsStore = (): SettingsStore => {
  const currencySettings = ref(game.settings.get(SYSTEM_ID, CURRENCY_KEY) as CurrencyConfig);

  const currency = {
    coinages: computed(() => currencySettings.value?.coinages ?? []),
    defaultDisplayCoin: computed(() => currencySettings.value?.defaultDisplayCoin ?? currencySettings.value?.coinages[0]?.id ?? ''),
    rollUpTargetCoin: computed(() => currencySettings.value?.rollUpTargetCoin ?? currencySettings.value?.coinages[0]?.id ?? ''),
  };

  const unitOfMeasure: ComputedRef<UnitOfMeasureOption> = computed(() => game.settings.get(SYSTEM_ID, DISPLAY_WORLD_KEYS.UNITS) as UnitOfMeasureOption ?? imperialUnitOfMeasure);
  const measurement = {
    unitOfMeasure,
    weightDisplayLabel: computed(() => {
      return WEIGHT_OPTIONS[unitOfMeasure.value].label;
    }),
    weightDisplayShortLabel: computed(() => {
      return WEIGHT_OPTIONS[unitOfMeasure.value].short;
    }),
    convertToLocalizedWeight: (storedWeight: number) => {
      const unitOfMeasure = game.settings.get(SYSTEM_ID, DISPLAY_WORLD_KEYS.UNITS) ?? imperialUnitOfMeasure;
      if (unitOfMeasure === 'imperial') {
        return storedWeight;
      } else {
        // Convert to metric
        return storedWeight * 0.5; // Example conversion, adjust as needed
      }
    },
    convertToStoredWeight: (localizedWeight: number) => {
      const unitOfMeasure = game.settings.get(SYSTEM_ID, DISPLAY_WORLD_KEYS.UNITS) ?? imperialUnitOfMeasure;
      if (unitOfMeasure === 'imperial') {
        return localizedWeight;
      } else {
        // Convert to imperial
        return localizedWeight * 2; // Example conversion, adjust as needed
      }
    },
  };

  return {
    currency,
    measurement,
  };
};

const SettingsStoreSymbol = Symbol('settingsStore');

type SettingsStore = {
  currency: {
    coinages: ComputedRef<CoinageDefinition[]>;
    defaultDisplayCoin: ComputedRef<string>;
    rollUpTargetCoin: ComputedRef<string>;
  };
  measurement: {
    unitOfMeasure: ComputedRef<string>;
    convertToLocalizedWeight: (storedWeight: number) => number;
    weightDisplayLabel: ComputedRef<string>;
    weightDisplayShortLabel: ComputedRef<string>;
    convertToStoredWeight: (localizedWeight: number) => number;
  };
};

export {
  SettingsStoreSymbol,
  useSettingsStore,
};

export type {
  SettingsStore,
};
