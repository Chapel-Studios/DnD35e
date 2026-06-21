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
      @change="valueChangeHandler"
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
        @change="unitChangeHandler"
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

  import type { ValueUnitInputProps } from './types.mts';

  const props = defineProps<ValueUnitInputProps<TValue, TUnit>>();

  const sizerUnitOptions = computed(() => props.sizingUnitOptions ?? props.unitOptions);

  const valueChangeHandler = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (props.valueType === 'number') {
      props.onValueChange?.(Number(target.value) as TValue);
    } else {
      props.onValueChange?.(target.value as TValue);
    }
  };

  const unitChangeHandler = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    props.onUnitChange?.(target.value as TUnit);
  };
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
