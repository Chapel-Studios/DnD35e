<template>
  <NumberFormGroup
    label="Quantity"
    field-path="system.quantity"
    :value="quantity"
    :default-visibility="everyoneVisibility"
    :default-editability="normalEditability"
    :disabled="isInfinite"
    direct-update
  >
    <template #controls="{ editable }">
      <button
        v-if="editable"
        class="field-control-btn"
        type="button"
        :class="{ 'is-active': isInfinite }"
        :title="'Is Infinite'"
        @click="toggleInfinite"
      >
        <i class="fas fa-infinity" />
      </button>
    </template>

    <template #readonly>
      <span v-if="isInfinite"><i class="fas fa-infinity" /></span>
      <span v-else>{{ quantity }}</span>
    </template>
  </NumberFormGroup>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import {
    everyoneVisibility,
    normalEditability,
    NumberFormGroup,
  } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  const {
    documentGetters: { quantity },
    documentActions: { getDirectFieldUpdater },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

  const updater = getDirectFieldUpdater('system.quantity');
  const isInfinite = computed(() => quantity.value === -1);

  const toggleInfinite = () => updater(isInfinite.value ? 0 : -1);
</script>
