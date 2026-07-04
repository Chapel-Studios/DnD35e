<template>
  <div
    class="multi-option-toggle"
    :class="derivedClass"
  >
    <div
      v-for="option in props.options"
      :key="option.value"
      :class="getOptionClass(option)"
      @click="() => handleClick(option)"
      class="multi-option-toggle__option"
    >
      <i v-if="option.icon" :class="option.icon" class="multi-option-toggle__option-icon"></i>
      <span v-if="option.label" class="multi-option-toggle__option-label">{{ localize(option.label) }}</span>
    </div>
  </div>
</template>

<script lang="ts">
  import type { SelectOption } from './index.mjs';

  export interface MultiOptionToggleProps<TType extends string = string> {
    /** The available options to toggle between. */
    options: SelectOption<TType>[];
    /** The currently selected option value. */
    value: TType;
    /** Disable all options and visually dim the wrapper. */
    disabled?: boolean;
  }
</script>

<script setup lang="ts" generic="TType extends string">
  import { computed } from 'vue';

  const localize = (key: string) => game.i18n.localize(key);
  const props = defineProps<MultiOptionToggleProps<TType>>();

  const emit = defineEmits<{
    update: [value: TType];
  }>();

  const handleClick = (option: SelectOption<TType>) => {
    if (!option.disabled && !props.disabled) {
      emit('update', option.value);
    }
  };

  const derivedClass = computed(() => {
    return {
      disabled: props.disabled
        || props.options.every(option => option.disabled),
    };
  });

  const getOptionClass = (option: SelectOption<TType>) => {
    return {
      active: option.value === props.value,
      disabled: option.disabled,
      // todo: add visibility and editability handling
    };
  };
</script>

<style lang="scss" scoped>
  .multi-option-toggle {
    display: flex;
    gap: 0.5rem;
    background-color: var(--color-cool-4);

    &__option {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      border: 1px solid var(--color-tabs-border);
      cursor: pointer;
      color: var(--color-tabs-border);
      // background-color: var(--color-tabs-border);

      &.active {
        // background-color: var(--vc-color-primary);
        color: var(--color-level-warning);
      }

      &-icon {
        font-size: 1rem;
      }

      &-label {
        font-size: 0.875rem;
      }
    }
  }
</style>
