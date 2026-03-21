<template>
  <FormGroup
    label="Quantity"
    field-path="system.quantity"
    :default-visibility="everyoneVisibility"
    :default-editability="normalEditability"
  >
    <template #controls>
      <button
        class="infinite-toggle"
        type="button"
        @click="toggleInfinite"
        :class="{ 'is-infinite': isInfinite }"
        :title="'Is Infinite'"
      >
        <i class="fas fa-infinity" />
      </button>
    </template>
    
    <span v-if="isInfinite">
      <i class="fas fa-infinity" />
    </span>

    <input
      v-else
      type="number"
      :value="quantity"
      :disabled="!isEditable"
      @change="onQuantityChange(($event.target as HTMLInputElement).value)"
      min=0
    />

    <template #readonly>
      <span v-if="isInfinite">
        <i class="fas fa-infinity" />
      </span>
      <span v-else>{{ quantity }}</span>
    </template>
  </FormGroup>
  
  <!-- old implementation
  <NumberFormGroup
    :editable="isEditable"
    label="Quantity"
    :value="quantity"
    :on-update="onQuantityChange"
    field-path="system.quantity"
  />
  -->
</template>

<script setup lang="ts">
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import {
    everyoneVisibility,
    FormGroup,
    normalEditability,
  } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  const {
    isEditable,
    documentGetters: {
      quantity,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;
  const updater = getDirectFieldUpdater('system.quantity');

  const toggleInfinite = () => {
    const newValue = isInfinite.value
      ? 0
      : -1;
    updater(newValue);
  };

  const isInfinite = computed(() => quantity.value === -1);

  const onQuantityChange = (input: string) => {
    let value = input === '' ? 0 : Number(input);
    if (isNaN(value)) {
      value = 0;
    }
    updater(value);
  };
</script>

<style lang="scss" scoped>
  button.infinite-toggle {
    cursor: pointer;
    padding: 0.125rem 0.25rem;
    color: var(--color-text-dark, #444);
    background: transparent;
    border: none;
    opacity: 0.5;
    font-size: var(--font-size-11);

    transition: 
      opacity 0.15s ease,
      color 150ms ease,
      transform 0.15s ease;

    &:hover {
      opacity: 1;
      transform: translateY(-1px);
    }

    &.is-infinite {
      color: var(--color-level-warning);
    }
  }
</style>
