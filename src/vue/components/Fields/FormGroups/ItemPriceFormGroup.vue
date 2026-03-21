<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    class="price-form-group"
  >
    <!-- Controls slot: add coin stack button and consolidate button -->
    <template #controls>
      <button
        v-if="!isDisabled"
        type="button"
        class="add-stack-btn"
        :title="localize('DND35E.Currency.AddCoinStack')"
        @click="addCoinStack"
      >
        <i class="fas fa-plus" />
      </button>
      <button
        v-if="!isDisabled && editValue.length > 0"
        type="button"
        class="consolidate-btn"
        :title="localize('DND35E.Currency.Consolidate')"
        @click="consolidatePrice"
      >
        <i class="fas fa-compress-arrows-alt" />
      </button>
      <slot name="controls" />
    </template>

    <!-- Editable coin stacks -->
    <div class="coin-stacks">
      <div v-if="editValue.length === 0" class="empty-price">
        <span class="zero-value">0 {{ defaultCoinShortLabel }}</span>
      </div>
      <div v-for="(stack, index) in editValue" :key="index" class="coin-stack">
        <input
          type="number"
          class="stack-count"
          :value="stack.count"
          min="0"
          :disabled="isDisabled"
          @change="updateStackCount(index, ($event.target as HTMLInputElement).value)"
        />
        <select
          class="stack-coin"
          :value="stack.coinId"
          :disabled="isDisabled"
          @change="updateStackCoin(index, ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="coin in availableCoinsForStack(stack.coinId)" :key="coin.id" :value="coin.id">
            {{ coin.shortLabel }}
          </option>
        </select>
        <button
          v-if="!isDisabled"
          type="button"
          class="remove-stack-btn"
          :title="localize('DND35E.Currency.RemoveCoinStack')"
          @click="removeCoinStack(index)"
        >
          <i class="fas fa-times" />
        </button>
      </div>
    </div>

    <!-- Readonly display -->
    <template #readonly>
      <div class="coin-stacks readonly">
        <span v-if="value.length === 0" class="empty-price">0 {{ defaultCoinShortLabel }}</span>
        <span v-for="(stack, index) in value" :key="index" class="coin-stack-display">
          {{ stack.count }} {{ getCoinShortLabel(stack.coinId) }}{{ index < value.length - 1 ? ', ' : '' }}
        </span>
      </div>
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import type { CoinageDefinition, CoinStack, CurrencyConfig, Price } from '@settings/currency/index.mjs';
  import {
    coinageVisibilityGmOnly,
    coinageVisibilityGmSelect,
    CURRENCY_KEY,
    DEFAULT_CURRENCY_CONFIG,
  } from '@settings/currency/index.mjs';
  import { SYSTEM_ID } from '@settings/shared.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value: Price;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    disabled?: boolean;
    onUpdate?: (value: Price) => void;
    /** When true, edit inputs show derived data instead of source data. */
    editDerived?: boolean;
    /** When true and no onUpdate, uses the store's direct field updater instead of view-aware. */
    directUpdate?: boolean;
  }>();

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const {
    isEditable,
    isGM,
    documentActions: {
      getDirectFieldUpdater,
      getViewAwareFieldUpdater,
    },
    documentGetters: {
      getSourceProperty,
    },
  } = inject('documentSheetStore') as DocumentSheetStore;
  
  const isDisabled = computed(() => {
    const storeCanEdit = isEditable;
    if (props.disabled) return true;
    return storeCanEdit ? !storeCanEdit.value : false;
  });

  const fieldUpdater = props.onUpdate ?? (
    props.directUpdate
      ? getDirectFieldUpdater(props.fieldPath)
      : getViewAwareFieldUpdater(props.fieldPath)
  );

  const sourceValue = getSourceProperty<Price>(props.fieldPath);
  const editValue = computed((): Price => {
    if (props.editDerived || !sourceValue) return props.value;
    return (sourceValue.value ?? props.value) as Price;
  });

  // Get currency config from settings
  const currencyConfig = computed((): CurrencyConfig => {
    return game.settings.get(SYSTEM_ID, CURRENCY_KEY) as CurrencyConfig ?? DEFAULT_CURRENCY_CONFIG;
  });

  // All enabled coinages
  const enabledCoinages = computed((): CoinageDefinition[] => {
    return currencyConfig.value.coinages.filter(c => c.enabled);
  });

  // Coinages the current user can select (respects visibility)
  const selectableCoinages = computed((): CoinageDefinition[] => {
    return enabledCoinages.value.filter(c => {
      if (c.visibility === coinageVisibilityGmOnly) return isGM.value;
      if (c.visibility === coinageVisibilityGmSelect) return isGM.value;
      return true;
    });
  });

  // Default display coin
  const defaultCoin = computed((): CoinageDefinition | undefined => {
    const defaultId = currencyConfig.value.defaultDisplayCoin;
    return enabledCoinages.value.find(c => c.id === defaultId) ?? enabledCoinages.value[0];
  });

  const defaultCoinShortLabel = computed(() => defaultCoin.value?.shortLabel ?? 'gp');

  // Get short label for a coin ID
  function getCoinShortLabel(coinId: string): string {
    const coin = enabledCoinages.value.find(c => c.id === coinId);
    return coin?.shortLabel ?? coinId;
  }

  // Available coins for a specific stack (includes currently selected + unselected coins)
  function availableCoinsForStack(currentCoinId: string): CoinageDefinition[] {
    const usedCoinIds = new Set(editValue.value.map(s => s.coinId));
    return selectableCoinages.value.filter(c => c.id === currentCoinId || !usedCoinIds.has(c.id));
  }

  // Get the next available coin (not already in use)
  function getNextAvailableCoin(): CoinageDefinition | undefined {
    const usedCoinIds = new Set(editValue.value.map(s => s.coinId));
    return selectableCoinages.value.find(c => !usedCoinIds.has(c.id));
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  function addCoinStack(): void {
    const nextCoin = getNextAvailableCoin();
    if (!nextCoin) return; // All coins already in use
    
    const newStack: CoinStack = {
      coinId: nextCoin.id,
      count: 0,
    };
    fieldUpdater([...editValue.value, newStack]);
  }

  function removeCoinStack(index: number): void {
    const newPrice = editValue.value.filter((_, i) => i !== index);
    fieldUpdater(newPrice);
  }

  function updateStackCount(index: number, rawValue: string): void {
    const count = parseInt(rawValue, 10) || 0;
    const newPrice = editValue.value.map((stack, i) =>
      i === index ? { ...stack, count: Math.max(0, count) } : stack
    );
    fieldUpdater(newPrice);
  }

  function updateStackCoin(index: number, coinId: string): void {
    const newPrice = editValue.value.map((stack, i) =>
      i === index ? { ...stack, coinId } : stack
    );
    fieldUpdater(newPrice);
  }

  /**
   * Consolidate the price into the fewest coins possible,
   * targeting the rollUpTargetCoin from settings.
   */
  function consolidatePrice(): void {
    if (editValue.value.length === 0) return;

    // Calculate total value in GP
    let totalGp = 0;
    for (const stack of editValue.value) {
      const coin = enabledCoinages.value.find(c => c.id === stack.coinId);
      if (coin) {
        totalGp += stack.count * coin.valueInGp;
      }
    }

    // Get target coin and coins sorted by value (highest first)
    const targetCoinId = currencyConfig.value.rollUpTargetCoin;
    const sortedCoins = [...enabledCoinages.value].sort((a, b) => b.valueInGp - a.valueInGp);
    
    // Build new price starting from highest value coins down to target
    const newPrice: Price = [];
    let remainingGp = totalGp;

    for (const coin of sortedCoins) {
      // Only use coins with value >= target coin value, or the target coin itself
      const targetCoin = enabledCoinages.value.find(c => c.id === targetCoinId);
      if (!targetCoin) continue;
      
      if (coin.valueInGp > targetCoin.valueInGp) {
        continue;
      }

      const count = Math.floor(remainingGp / coin.valueInGp);
      if (count > 0) {
        newPrice.push({ coinId: coin.id, count });
        remainingGp -= count * coin.valueInGp;
      }

      // Stop after we've used the target coin
      if (remainingGp <= 0) break;
    }

    // If there's remaining value that couldn't be expressed, add it as the smallest available coin
    if (remainingGp > 0.0001) {
      const smallestCoin = sortedCoins[sortedCoins.length - 1];
      if (smallestCoin) {
        const count = Math.round(remainingGp / smallestCoin.valueInGp);
        if (count > 0) {
          const existing = newPrice.find(s => s.coinId === smallestCoin.id);
          if (existing) {
            existing.count += count;
          } else {
            newPrice.push({ coinId: smallestCoin.id, count });
          }
        }
      }
    }

    // Remove zero-count stacks and sort by value (highest first)
    const finalPrice = newPrice
      .filter(s => s.count > 0)
      .sort((a, b) => {
        const coinA = enabledCoinages.value.find(c => c.id === a.coinId);
        const coinB = enabledCoinages.value.find(c => c.id === b.coinId);
        return (coinB?.valueInGp ?? 0) - (coinA?.valueInGp ?? 0);
      });

    fieldUpdater(finalPrice);
  }
</script>

<style scoped>
.price-form-group {
  display: contents;
}

.coin-stacks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.coin-stacks.readonly {
  font-size: var(--font-size-14);
}

.coin-stack {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--color-select-option-bg);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  padding: 0.25rem;
}

.stack-count {
  width: 60px;
  text-align: right;
}

.stack-coin {
  padding: 0.05rem;
}

.remove-stack-btn {
  background: transparent;
  border: none;
  padding: 0.125rem 0.25rem;
  cursor: pointer;
  color: var(--color-level-error);
  opacity: 0.6;
  transition: opacity 0.15s;
}

.remove-stack-btn:hover {
  opacity: 1;
}

.add-stack-btn,
.consolidate-btn {
  background: transparent;
  border: none;
  padding: 0.125rem 0.25rem;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s, transform 0.15s;
}

.add-stack-btn:hover,
.consolidate-btn:hover {
  opacity: 1;
  transform: translateY(-1px);
}

.empty-price {
  color: var(--color-text-secondary);
  font-style: italic;
}

.zero-value {
  font-style: normal;
}

.coin-stack-display {
  white-space: nowrap;
}
</style>
