<template>
  <div class="weight-value-unit" :class="{ 'is-disabled': disabled }">
    <input
      class="vui-value"
      type="number"
      :value="localizedWeight"
      :min="min"
      :max="max"
      :step="step"
      :placeholder="placeholder"
      :disabled="disabled"
      @change="handleWeightChange"
    />
    <span class="vui-moniker">{{ weightDisplayShortLabel }}</span>
    <span class="vui-divider" aria-hidden="true" />
    <div class="select-auto">
      <select class="vui-unit select-sizer" tabindex="-1" aria-hidden="true" disabled>
        <option v-for="opt in sizerUnitOptions" :key="`sizer-${opt.value}`" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <select
        class="vui-unit"
        :value="unit"
        :disabled="disabled"
        @change="onUnitChange?.(($event.target as HTMLSelectElement).value as TUnit)"
      >
        <option v-for="opt in unitOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts" generic="TUnit extends string">
  import type { SettingsStore } from '@settings/index.mjs';
  import { SettingsStoreSymbol } from '@settings/index.mjs';
  import { computed, inject } from 'vue';

  import type { SelectOption } from './index.mjs';

  const props = withDefaults(defineProps<{
    /** Stored (system/base) weight value. */
    weight: number | null;
    /** Selected unit option value for the right-hand select. */
    unit: TUnit;
    /** Options for the right-hand select. */
    unitOptions: SelectOption<TUnit>[];
    /** Optional full option set used only for intrinsic width sizing. */
    sizingUnitOptions?: SelectOption<TUnit>[];
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    disabled?: boolean;
    /** Emits stored/base weight after localized input conversion. */
    onWeightChange?: (storedWeight: number) => void;
    onUnitChange?: (unit: TUnit) => void;
  }>(), {
  });

  const {
    measurement: {
      weightDisplayShortLabel,
      convertToStoredWeight,
      convertToLocalizedWeight,
    },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const localizedWeight = computed(() => convertToLocalizedWeight(props.weight ?? 0) ?? 0);
  const sizerUnitOptions = computed(() => props.sizingUnitOptions ?? props.unitOptions);

  function handleWeightChange(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const localized = Number(raw);
    const stored = convertToStoredWeight(Number.isFinite(localized) ? localized : 0);
    props.onWeightChange?.(stored);
  }
</script>

<style lang="scss" scoped>
  .weight-value-unit {
    display: inline-flex;
    align-items: stretch;
    border: 1px solid var(--color-border-light-tertiary, var(--color-border, #999));
    border-radius: 3px;
    background: var(--input-background-color, var(--color-cool-4, #fff));
    overflow: hidden;
    line-height: 1;

    &:focus-within {
      border-color: var(--color-border-highlight, var(--color-warm-2, #5d142b));
      box-shadow: 0 0 0 1px var(--color-border-highlight, var(--color-warm-2, #5d142b)) inset;
    }

    &.is-disabled {
      opacity: 0.6;
      pointer-events: none;
    }
  }

  .vui-value,
  .vui-unit {
    border: none;
    outline: none;
    box-shadow: none;
    margin: 0;
    height: auto;

    &:focus,
    &:focus-visible {
      outline: none;
      box-shadow: none;
    }
  }

  .vui-value {
    background: transparent;
    text-align: right;
    padding-right: 0.35rem;
    width: 7ch;
  }

  .vui-moniker {
    display: inline-flex;
    align-items: center;
    color: var(--color-text-secondary, var(--color-cool-1));
    font-size: 0.9em;
    padding-right: 0.35rem;
    white-space: nowrap;
  }

  .select-auto {
    display: inline-grid;
    width: max-content;
  }

  .select-auto > .vui-unit {
    grid-area: 1 / 1;
  }

  .select-auto > .select-sizer {
    visibility: hidden;
    pointer-events: none;
    white-space: nowrap;
  }

  .vui-unit {
    color-scheme: dark;
    padding-left: 0.25rem;
  }

  .vui-divider {
    width: 1px;
    align-self: stretch;
    margin: 0.15rem 0;
    background: #c4bbc538;
    flex: 0 0 auto;
  }
</style>