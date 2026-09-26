<template>
  <div class="hp-updater" :class="{ open: isOpen, compact: props.compact, 'read-only': props.compact && !props.editable }">
    <label v-if="!props.compact">{{ localize('dnd35e.CREATURE.FIELDS.hp.adjustment.type.label') }}</label>
    <MultiOptionToggle
      class="hp-updater-type"
      :icon-only="props.compact"
      :options="props.compact ? HP_ADJUSTMENT_TYPE_ICON_OPTIONS : HP_ADJUSTMENT_TYPE_OPTIONS"
      :value="adjustmentType"
      :disabled="isReadOnly"
      @update="onAdjustmentTypeChange"
    />
    <label v-if="!props.compact">{{ localize('dnd35e.CREATURE.FIELDS.hp.adjustment.amount.label') }}</label>
    <input
      v-model.number="adjustmentAmount"
      class="hp-updater-amount"
      type="number"
      :min="minAdjustment"
      :disabled="isReadOnly"
    >
    <button
      type="button"
      class="apply-btn"
      :class="{ 'field-control-btn': !props.compact }"
      :data-action="isReadOnly ? undefined : (props.compact ? 'adjustHp' : undefined)"
      :data-amount="props.compact ? adjustmentAmount : undefined"
      :data-adjustment-type="props.compact ? adjustmentType : undefined"
      :disabled="isReadOnly"
      :title="localize('dnd35e.CREATURE.FIELDS.hp.adjustment.apply.tooltip')"
      @click="applyAdjustment"
    >
      <i class="fas fa-check" />
      <span v-if="!props.compact">{{ localize('dnd35e.CREATURE.FIELDS.hp.adjustment.apply.label') }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import MultiOptionToggle from '@vc/fields/MultiOptionToggle.vue';
  import { computed, inject, ref } from 'vue';

  import type { CreatureDocumentStore } from '../CreatureStore.mjs';
  import {
    HP_ADJUSTMENT_TYPE,
    HP_ADJUSTMENT_TYPE_ICON_OPTIONS,
    HP_ADJUSTMENT_TYPE_OPTIONS,
    type HpAdjustmentType,
  } from './constants.mjs';

  const localize = (key: string) => game.i18n.localize(key);

  const props = withDefaults(defineProps<{
    /** Renders as an icon-only inline row (no drawer/labels) for the Token HUD's bar1 slot; applies via `data-action="adjustHp"` instead of the document store, since compact usage has no store to inject. */
    compact?: boolean;
    /** Compact only — false renders a read-only value instead of the controls. */
    editable?: boolean;
  }>(), {
    compact: false,
    editable: true,
  });

  // Document sheet usage only — compact (Token HUD) usage has no store and applies via the
  // `data-action="adjustHp"` dataset attributes above (see TokenHudDnd35e#onAdjustHp).
  const store = inject(DocumentSheetStoreSymbol, undefined) as CreatureDocumentStore | undefined;

  // Compact only — non-compact always renders inside an already permission-gated sheet.
  const isReadOnly = computed(() => props.compact && !props.editable);

  const isOpen = defineModel<boolean>('open', { default: false });

  const adjustmentType = ref<HpAdjustmentType>(HP_ADJUSTMENT_TYPE.DAMAGE_ADJUSTMENT);
  const adjustmentAmount = ref(0);
  const minAdjustment = computed(() => {
    if (adjustmentType.value === HP_ADJUSTMENT_TYPE.TEMPORARY_ADJUSTMENT) {
      return 0;
    }
    return undefined;
  });

  const onAdjustmentTypeChange = (type: HpAdjustmentType) => {
    adjustmentType.value = type;
  };

  const applyAdjustment = async () => {
    const updateAmount = adjustmentAmount.value;

    await store?.documentActions.adjustHp(updateAmount, adjustmentType.value);

    adjustmentAmount.value = 0;
  };
</script>

<style lang="scss" scoped>
  .hp-updater.compact {
    display: grid;
    grid-template-columns: 1fr min-content;
    align-items: center;
    gap: 2px;
    width: 100%;

    &.read-only {
      justify-content: center;

      .hp-updater-amount,
      .apply-btn {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .hp-updater-type {
      grid-column: span 2;
      justify-content: center;
      gap: 1px;
      background: none;

      :deep(.multi-option-toggle__option) {
        padding: 1px 2px;
        border-width: 1px;
      }

      :deep(.multi-option-toggle__option-icon) {
        font-size: 0.6rem;
      }
    }

    .hp-updater-amount {
      min-width: 0;
      flex: 1 1 auto;
      width: 100%;
      text-align: center;
    }

    .apply-btn {
      flex: 0 0 auto;
      padding: 1px 4px;
      cursor: pointer;
      background: none;
      border: 1px solid var(--color-tabs-border);
      color: inherit;
      font-size: 0.6rem;
    }
  }
</style>

