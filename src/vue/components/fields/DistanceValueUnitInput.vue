<template>
  <div class="distance-value-unit" :class="{ 'is-disabled': disabled }">
    <template v-if="!hideDistance">
      <input
        class="vui-value"
        type="number"
        :value="localizedDistance"
        :min="min"
        :max="max"
        :step="step"
        :placeholder="placeholder"
        :disabled="disabled"
        :title="hint"
        @change="handleDistanceChange"
      />
      <span class="vui-moniker">{{ distanceDisplayShortLabel }}</span>
      <span class="vui-divider" aria-hidden="true" />
    </template>
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
        :title="unitHint"
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
  import type { SettingsStore } from '@settings/shared/sheet/settingsStore.mjs';
  import { SettingsStoreSymbol } from '@settings/shared/sheet/settingsStore.mjs';
  import { computed, inject } from 'vue';

  import type { SelectOption } from './index.mjs';

  const props = withDefaults(defineProps<{
    /** Stored (system/base) distance value. */
    distance: number | null;
    /** Selected unit option value (e.g. sense type in CreatureSenses). */
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
    /** Hides the numeric distance input, showing only the unit selector (e.g. senses with no fixed range). */
    hideDistance?: boolean;
    /** Tooltip shown on the distance input, e.g. a localized field hint with the distance unit interpolated in. */
    hint?: string;
    /** Tooltip shown on the unit select. */
    unitHint?: string;
    /** Emits stored/base distance after localized input conversion. */
    onDistanceChange?: (storedDistance: number) => void;
    onUnitChange?: (unit: TUnit) => void;
  }>(), {
  });

  const {
    measurement: {
      distanceDisplayShortLabel,
      convertToStoredDistance,
      convertToLocalizedDistance,
    },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const localizedDistance = computed(() => convertToLocalizedDistance(props.distance ?? 0) ?? 0);
  const sizerUnitOptions = computed(() => props.sizingUnitOptions ?? props.unitOptions);

  function handleDistanceChange(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const localized = Number(raw);
    const stored = convertToStoredDistance(Number.isFinite(localized) ? localized : 0);
    props.onDistanceChange?.(stored);
  }
</script>

<style lang="scss" scoped>
  .distance-value-unit {
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
    width: 6ch;
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