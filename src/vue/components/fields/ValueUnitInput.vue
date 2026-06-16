<template>
  <!--
    Visually unifies a value input + a unit select into a single control.
    The two inputs are still independent under the hood — they just share a
    frame, focus state, and a divider.
  -->
  <div class="value-unit-input" :class="{ 'is-disabled': disabled }">
    <input
      class="vui-value"
      :type="valueType"
      :value="value ?? ''"
      :min="min"
      :max="max"
      :step="step"
      :placeholder="placeholder"
      :disabled="disabled"
      @change="onValueChange?.(($event.target as HTMLInputElement).value as TValue)"
    />
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

<script setup lang="ts" generic="TValue extends number | string, TUnit extends string">
  import { computed } from 'vue';

  import type { SelectOption } from './index.mjs';

  const props = withDefaults(defineProps<{
    /** Type of the value input. Defaults to 'number'. */
    valueType: TValue extends number ? 'number' : 'text';
    /** Current value of the value input. */
    value: TValue | null;
    /** Current selected unit option value. */
    unit: TUnit;
    /** Options for the unit select. */
    unitOptions: SelectOption<TUnit>[];
    /** Optional full option set used only for intrinsic width sizing. */
    sizingUnitOptions?: SelectOption<TUnit>[];
    /** Min for number inputs. */
    min?: TValue extends number ? number : never;
    /** Max for number inputs. */
    max?: TValue extends number ? number : never;
    /** Step for number inputs. */
    step?: TValue extends number ? number : never;
    /** Placeholder for the value input. */
    placeholder?: string;
    /** Disable both halves and visually dim the wrapper. */
    disabled?: boolean;
    /** Called when the value input commits a change. Receives the raw string from the input. */
    onValueChange?: (raw: TValue) => void;
    /** Called when the unit select commits a change. */
    onUnitChange?: (unit: TUnit) => void;
  }>(), {
  });

  const sizerUnitOptions = computed(() => props.sizingUnitOptions ?? props.unitOptions);
</script>

<style lang="scss" scoped>
  .value-unit-input {
    display: inline-flex;
    align-items: stretch;
    border: 1px solid var(--color-border-light-tertiary, var(--color-border, #999));
    border-radius: 3px;
    background: var(--input-background-color, var(--color-cool-4, #fff));
    overflow: hidden;
    line-height: 1;

    // Whole control highlights when either input is focused.
    &:focus-within {
      border-color: var(--color-border-highlight, var(--color-warm-2, #5d142b));
      box-shadow: 0 0 0 1px var(--color-border-highlight, var(--color-warm-2, #5d142b)) inset;
    }

    &.is-disabled {
      opacity: 0.6;
      pointer-events: none;
    }
  }

  // Strip native chrome off both children so the wrapper owns the framing.
  // NOTE: only the value <input> gets `background: transparent`. The <select>
  // KEEPS its inherited Foundry background — otherwise the native popup loses
  // its dark surface and Chromium repaints it with the OS light theme (washed
  // out / white-on-white).
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
    padding-right: 0.5rem;
    width: 12ch; // enough for "9999"
  }

  .select-auto {
    display: inline-grid;
    width: max-content;
  }

  .select-auto > .select-sizer {
    visibility: hidden;
    pointer-events: none;
    white-space: nowrap;
  }

  // The native dropdown popup is OS-rendered; CSS reaches it only via
  // `color-scheme` (popup chrome theming) and `background-color` / `color` on
  // <select>/<option>. We let the select keep Foundry's inherited background
  // so the popup matches the rest of the app's dropdowns.
  .vui-unit {
    color-scheme: dark;
    padding-left: 0.25rem;
    grid-area: 1 / 1;
  }

  .vui-divider {
    width: 1px;
    align-self: stretch;
    margin: 0.15rem 0;
    background: #c4bbc538;
    flex: 0 0 auto;
  }
</style>
