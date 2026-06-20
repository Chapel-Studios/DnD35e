<template>
  <div class="multi-option-toggle">
    <div
      v-for="option in props.options"
      :key="option.value"
      :class="{ active: option.value === props.value }"
      @click="$emit('update', option.value)"
      class="multi-option-toggle__option"
    >
      <i v-if="option.icon" :class="option.icon" class="multi-option-toggle__option-icon"></i>
      <span v-if="option.label" class="multi-option-toggle__option-label">{{ option.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts" generic="TType extends string">
  import type { SelectOption } from './fields/index.mjs';

  const props = defineProps<{
    options: SelectOption<TType>[];
    value: TType;
  }>();

  defineEmits<{
    update: [value: TType];
  }>();
</script>

<style lang="scss" scoped>
  .multi-option-toggle {
    display: flex;
    gap: 0.5rem;

    &__option {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      background-color: var(--vc-color-background-secondary);

      &.active {
        background-color: var(--vc-color-primary);
        color: var(--vc-color-on-primary);
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
