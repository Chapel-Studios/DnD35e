<template>
  <FormGroup
    label="Quantity"
    field-path="system.quantity"
    :default-visibility="everyoneVisibility"
    :default-editability="normalEditability"
  >
    <template #controls="{ editable }">
      <button
        v-if="editable"
        class="field-control-btn infinite-toggle"
        type="button"
        @click="toggleInfinite"
        :class="{ 'is-active': isInfinite }"
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
      :disabled="!isEditViewMode"
      @change="onQuantityChange(($event.target as HTMLInputElement).value)"
      min="0"
    />

    <template #readonly>
      <span v-if="isInfinite">
        <i class="fas fa-infinity" />
      </span>
      <span v-else>{{ quantity }}</span>
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol, RenderModeStore, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import {
    everyoneVisibility,
    FormGroup,
    normalEditability,
  } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      quantity,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;
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
