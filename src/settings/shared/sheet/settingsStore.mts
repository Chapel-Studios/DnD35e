import { roundToDecimal } from '@helpers/math.mjs';
import { CURRENCY_KEY } from '@settings/currency/constants.mjs';
import { visibilityWithinBounds } from '@settings/currency/logic/coinageVisibility.mjs';
import { COINAGE_VISIBILITIES, type CoinageDefinition, type CurrencyConfig } from '@settings/currency/types.mjs';
import { DISPLAY_WORLD_KEYS } from '@settings/display/constants.mjs';
import type { UnitOfMeasureOption } from '@settings/display/unitOfMeasure.mjs';
import { imperialUnitOfMeasure } from '@settings/display/unitOfMeasure.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

/** 1 square = 5 ft = 1.5 m (SRD's official metric conversion). Storage is always in squares. */
const FEET_PER_SQUARE = 5;
const METERS_PER_SQUARE = 1.5;
import type { ComputedRef } from 'vue';
import { computed, ref } from 'vue';

const useSettingsStore = (): SettingsStore => {
  const currencySettings = ref(game.settings.get(SYSTEM_ID, CURRENCY_KEY) as CurrencyConfig);

  const currency = {
    coinages: computed(() => currencySettings.value?.coinages ?? []),
    defaultDisplayCoin: computed(() => currencySettings.value?.defaultDisplayCoin ?? currencySettings.value?.coinages[0]?.id ?? ''),
    rollUpTargetCoin: computed(() => currencySettings.value?.rollUpTargetCoin ?? currencySettings.value?.coinages[0]?.id ?? ''),
    highestVisibleCoin: computed(() => {
      const enabledCoinages = currencySettings.value?.coinages
        .filter(c => c.enabled && visibilityWithinBounds(c.visibility, COINAGE_VISIBILITIES.gmSelect)) ?? [];
      return enabledCoinages.reduce((prev, curr) => (curr.valueInGp > prev.valueInGp ? curr : prev), enabledCoinages[0])
        .id ?? 'srd_gp';
    }),
  };

  const unitOfMeasure: ComputedRef<UnitOfMeasureOption> = computed(() => game.settings.get(SYSTEM_ID, DISPLAY_WORLD_KEYS.UNITS) as UnitOfMeasureOption ?? imperialUnitOfMeasure);
  const measurement = {
    unitOfMeasure,
    weightDisplayLabel: computed(() => {
      return game.i18n.localize(`dnd35e.MEASUREMENT.${unitOfMeasure.value}.weight.label`);
    }),
    weightDisplayShortLabel: computed(() => {
      return game.i18n.localize(`dnd35e.MEASUREMENT.${unitOfMeasure.value}.weight.abbreviation`);
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
    distanceDisplayLabel: computed(() => {
      return game.i18n.localize(`dnd35e.MEASUREMENT.${unitOfMeasure.value}.distance.label`);
    }),
    distanceDisplayShortLabel: computed(() => {
      return game.i18n.localize(`dnd35e.MEASUREMENT.${unitOfMeasure.value}.distance.abbreviation`);
    }),
    // Canonical storage unit is squares (universal, world-setting-independent). These
    // always translate squares <-> the world's configured localized unit (ft or m) — there
    // is no "stored distance is feet" concept anymore, see `$fromFeet`/`$fromMeters` in
    // `FormulaResolver.functionGrammar.mts` for the formula-side equivalent conversion.
    convertToLocalizedDistance: (storedSquares: number) => {
      const unitOfMeasure = game.settings.get(SYSTEM_ID, DISPLAY_WORLD_KEYS.UNITS) ?? imperialUnitOfMeasure;
      const perSquare = unitOfMeasure === 'imperial' ? FEET_PER_SQUARE : METERS_PER_SQUARE;
      return roundToDecimal(storedSquares * perSquare, 2);
    },
    convertToStoredDistance: (localizedDistance: number) => {
      const unitOfMeasure = game.settings.get(SYSTEM_ID, DISPLAY_WORLD_KEYS.UNITS) ?? imperialUnitOfMeasure;
      const perSquare = unitOfMeasure === 'imperial' ? FEET_PER_SQUARE : METERS_PER_SQUARE;
      return roundToDecimal(localizedDistance / perSquare, 2);
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
    highestVisibleCoin: ComputedRef<string>;
  };
  measurement: {
    unitOfMeasure: ComputedRef<UnitOfMeasureOption>;
    weightDisplayLabel: ComputedRef<string>;
    weightDisplayShortLabel: ComputedRef<string>;
    convertToLocalizedWeight: (storedWeight: number) => number;
    convertToStoredWeight: (localizedWeight: number) => number;
    distanceDisplayLabel: ComputedRef<string>;
    distanceDisplayShortLabel: ComputedRef<string>;
    convertToLocalizedDistance: (storedDistance: number) => number;
    convertToStoredDistance: (localizedDistance: number) => number;
  };
};

export {
  SettingsStoreSymbol,
  useSettingsStore,
};

export type {
  SettingsStore,
};
