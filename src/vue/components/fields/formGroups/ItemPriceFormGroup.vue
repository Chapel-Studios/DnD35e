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
    <template #controls="{ editable }">
      <button
        v-if="editable && !isDisabled"
        type="button"
        class="field-control-btn add-stack-btn"
        :title="localize('dnd35e.Currency.AddCoinStack')"
        @click="addCoinStack"
      >
        <i class="fas fa-plus" />
      </button>
      <button
        v-if="editable && !isDisabled && hasEditStacks"
        type="button"
        class="field-control-btn consolidate-btn"
        :title="localize('dnd35e.Currency.Consolidate')"
        @click="consolidatePrice"
      >
        <i class="fas fa-compress-arrows-alt" />
      </button>
      <slot name="controls" />
    </template>

    <!-- Editable coin stacks -->
    <div class="coin-stacks">
      <div v-if="!hasEditStacks" class="empty-price">
        <span class="zero-value">0 {{ defaultCoinShortLabel }}</span>
      </div>
      <div v-for="(stack, index) in editStacks" :key="index" class="coin-stack">
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
          :title="localize('dnd35e.Currency.RemoveCoinStack')"
          @click="removeCoinStack(index)"
        >
          <i class="fas fa-times" />
        </button>
      </div>
    </div>

    <!-- Readonly display -->
    <template #readonly>
      <div class="coin-stacks readonly">
        <span v-if="readonlyStacks.length === 0" class="empty-price">0 {{ defaultCoinShortLabel }}</span>
        <span v-for="(stack, index) in readonlyStacks" :key="index" class="coin-stack-display">
          {{ stack.count }} {{ getCoinShortLabel(stack.coinId) }}{{ index < readonlyStacks.length - 1 ? ', ' : '' }}
        </span>
      </div>
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import { type DocumentSheetStore, DocumentSheetStoreSymbol, type RenderModeStore,RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { PriceData } from '@fields/PriceData.mjs';
  import type { CoinageDefinition, CoinStack, PriceSource } from '@settings/currency/index.mjs';
  import {
    coinageVisibilityGmOnly,
    coinageVisibilityGmSelect,
  } from '@settings/currency/index.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value: PriceData;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    disabled?: boolean;
    onUpdate?: (value: PriceSource) => void;
    /** When true, edit inputs show derived data instead of source data. */
    editDerived?: boolean;
    /** When true and no onUpdate, uses the store's direct field updater instead of view-aware. */
    directUpdate?: boolean;
  }>();

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      hasMaskForField,
    },
    isGM,
    documentActions: {
      getDirectFieldUpdater,
      getViewAwareFieldUpdater,
    },
    _storeUtils: {
      getSourceProperty,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
  
  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !isEditMode.value;
  });

  const fieldUpdater = props.onUpdate ?? (
    props.directUpdate
      ? getDirectFieldUpdater(props.fieldPath)
      : getViewAwareFieldUpdater(props.fieldPath)
  );

  const sourceValue = getSourceProperty<PriceSource>(props.fieldPath);

  /** The stacks currently shown in the edit UI. */
  const editStacks = computed((): CoinStack[] => {
    if (props.editDerived || !sourceValue) return props.value?.stacks ?? [];
    if (!isGM.value && isEditMode.value && hasMaskForField(props.fieldPath).value) {
      return props.value?.stacks ?? [];
    }
    const src = sourceValue.value;
    return src?.stacks ?? props.value?.stacks ?? [];
  });

  const hasEditStacks = computed(() => editStacks.value.length > 0);

  /** The stacks shown in the readonly display. */
  const readonlyStacks = computed((): CoinStack[] => {
    return props.value?.stacks ?? [];
  });

  // Get currency config from settings (delegates to PriceData)
  const currencyConfig = computed(() => PriceData.getCurrencyConfig());

  // All enabled coinages
  const enabledCoinages = computed(() => PriceData.getEnabledCoinages());

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
    const usedCoinIds = new Set(editStacks.value.map(s => s.coinId));
    return selectableCoinages.value.filter(c => c.id === currentCoinId || !usedCoinIds.has(c.id));
  }

  // Get the next available coin (not already in use)
  function getNextAvailableCoin(): CoinageDefinition | undefined {
    const usedCoinIds = new Set(editStacks.value.map(s => s.coinId));
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
    fieldUpdater(PriceData.toSource([...editStacks.value, newStack]));
  }

  function removeCoinStack(index: number): void {
    const newStacks = editStacks.value.filter((_, i) => i !== index);
    fieldUpdater(PriceData.toSource(newStacks));
  }

  function updateStackCount(index: number, rawValue: string): void {
    const count = parseInt(rawValue, 10) || 0;
    const newStacks = editStacks.value.map((stack, i) =>
      i === index ? { ...stack, count: Math.max(0, count) } : stack
    );
    fieldUpdater(PriceData.toSource(newStacks));
  }

  function updateStackCoin(index: number, coinId: string): void {
    const newStacks = editStacks.value.map((stack, i) =>
      i === index ? { ...stack, coinId } : stack
    );
    fieldUpdater(PriceData.toSource(newStacks));
  }

  /**
   * Consolidate the price into the fewest coins possible,
   * delegating to {@link PriceData.consolidate}.
   */
  function consolidatePrice(): void {
    if (editStacks.value.length === 0) return;
    const consolidated = new PriceData({ stacks: editStacks.value }).consolidate();
    fieldUpdater(PriceData.toSource(consolidated));
  }
</script>
<!-- Styles live in src/styles/core.scss — see price form group comment there for why. -->
