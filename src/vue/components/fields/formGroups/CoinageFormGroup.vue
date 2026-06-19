<template>
  <ListFormGroup
    :value="editStacks"
    :field-path="fieldPath"
    :add-button-title="localize('dnd35e.Currency.AddCoinStack')"
    :remove-button-title="localize('dnd35e.Currency.RemoveCoinStack')"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    :on-update="updateCoinStacks"
    :on-add-item="addCoinStack"
    :read-only="props.readOnly"
    :force-edit="props.forceEdit"
    class="coinage-form-group"
  >
    <template #controls="{ editable }">
      <button
        v-if="editable && !isDisabled && hasEditStacks"
        type="button"
        class="field-control-btn consolidate-btn"
        :title="localize('dnd35e.Currency.Consolidate')"
        @click="consolidatePrice"
      >
        <i class="fas fa-compress-arrows-alt" />
      </button>
      <slot name="controls" :editable="editable" />
    </template>
    <template #item-edit="{ item, index, disabled }">
      <!-- side-by-side: same two inputs, wrapped in the new ValueUnitInput -->
      <ValueUnitInput
        value-type="number"
        :value="item.count"
        :min="0"
        :unit="item.coinId"
        :unit-options="availableCoinsForStack(item.coinId)"
        :sizing-unit-options="allSelectableCoinOptions"
        :disabled="disabled"
        :on-value-change="(raw: number) => updateStackCount(index, raw)"
        :on-unit-change="(coinId: string) => updateStackCoin(index, coinId)"
      />
    </template>
    <template #empty>
      <div class="empty-price">
        <span class="zero-value">0 {{ defaultCoinShortLabel }}</span>
      </div>
    </template>
    <template #readonly>
      <div class="coin-stacks readonly">
        <span v-if="readonlyStacks.length === 0" class="empty-price">
          <span class="zero-value">0 {{ defaultCoinShortLabel }}</span>
        </span>
        <span v-for="(stack, index) in readonlyStacks" :key="index" class="coin-stack">
          {{ stack.count }} {{ getCoinShortLabel(stack.coinId) }}<span v-if="index < readonlyStacks.length - 1">, </span>
        </span>
      </div>
    </template> 
  </ListFormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { CurrencyData } from '@fields/CurrencyData.mjs';
  import type { CoinageDefinition, CoinStack, PriceSource } from '@settings/currency/index.mjs';
  import {
    coinageVisibilityGmOnly,
    coinageVisibilityGmSelect,
  } from '@settings/currency/index.mjs';
  import { type SelectOption,ValueUnitInput } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import ListFormGroup from './ListFormGroup.vue';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value: CurrencyData;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    disabled?: boolean;
    onUpdate?: (value: PriceSource) => void;
    /** When true, forces the readonly display. */
    readOnly?: boolean;
    /** When true, forces the edit display even in play/true modes. */
    forceEdit?: boolean;
  }>();

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      getIsFieldEditable,
      hasMaskForField,
    },
    isGM,
    documentActions: {
      getViewAwareFieldUpdater,
    },
    _storeUtils: {
      getSourceProperty,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
  
  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !getIsFieldEditable(props.fieldPath, props.defaultEditability, !!props.forceEdit).value;
  });

  // Projection callback target: coin stack UI edits are converted to PriceSource before persisting.
  const fieldUpdater = props.onUpdate ?? getViewAwareFieldUpdater(props.fieldPath);

  // Explicit inverse mapping for projection-pair contract (CoinStack[] -> PriceSource).
  const updateCoinStacks = (stacks: CoinStack[]): void => {
    fieldUpdater(CurrencyData.toSource(stacks));
  };

  const sourceValue = getSourceProperty<PriceSource>(props.fieldPath);

  /** The stacks currently shown in the edit UI. */
  const editStacks = computed((): CoinStack[] => {
    if (!sourceValue) return props.value.stacks ?? [];
    if (!isGM.value && isEditMode.value && hasMaskForField(props.fieldPath).value) {
      return props.value.stacks ?? [];
    }
    const src = sourceValue.value;
    return src?.stacks ?? props.value.stacks ?? [];
  });

  const hasEditStacks = computed(() => editStacks.value.length > 0);

  /** The stacks shown in the readonly display. */
  const readonlyStacks = computed((): CoinStack[] => {
    return props.value?.stacks ?? [];
  });

  // Get currency config from settings (delegates to CurrencyData)
  const currencyConfig = computed(() => CurrencyData.getCurrencyConfig());

  // All enabled coinages
  const enabledCoinages = computed(() => CurrencyData.getEnabledCoinages());

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
  function availableCoinsForStack(currentCoinId: string): SelectOption<string>[] {
    const usedCoinIds = new Set(editStacks.value.map(s => s.coinId));
    return selectableCoinages.value
      .filter(c => c.id === currentCoinId || !usedCoinIds.has(c.id))
      .map(c => ({ value: c.id, label: c.shortLabel }));
  }

  const allSelectableCoinOptions = computed((): SelectOption<string>[] => {
    return selectableCoinages.value.map(c => ({ value: c.id, label: c.shortLabel }));
  });

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
    fieldUpdater(CurrencyData.toSource([...editStacks.value, newStack]));
  }

  function updateStackCount(index: number, rawValue: number): void {
    const count = rawValue || 0;
    const newStacks = editStacks.value.map((stack, i) =>
      i === index ? { ...stack, count: Math.max(0, count) } : stack
    );
    fieldUpdater(CurrencyData.toSource(newStacks));
  }

  function updateStackCoin(index: number, coinId: string): void {
    const newStacks = editStacks.value.map((stack, i) =>
      i === index ? { ...stack, coinId } : stack
    );
    fieldUpdater(CurrencyData.toSource(newStacks));
  }

  /**
   * Consolidate the price into the fewest coins possible,
   * delegating to {@link CurrencyData.consolidate}.
   */
  function consolidatePrice(): void {
    if (editStacks.value.length === 0) return;
    const consolidated = new CurrencyData({ stacks: editStacks.value }).consolidate();
    fieldUpdater(CurrencyData.toSource(consolidated));
  }
</script>

<style lang="scss" scoped>
  .coinage-form-group {

    :deep(.list-items) {

      &.readonly {
        font-size: var(--font-size-14);
      }
    }

    :deep(.list-item) {
      gap: 0.25rem;
    }

    .stack-count {
      width: 60px;
      text-align: right;
    }

    .stack-coin {
      padding: 0.05rem;
    }

    .empty-price {
      color: var(--color-text-secondary);
      font-style: italic;
    }

    .zero-value {
      font-style: normal;
    }
  }
  
  :global(.view-mode) .coinage-form-group {
    grid-template-columns: minmax(max-content, 2fr) 5fr;
  }

</style>
