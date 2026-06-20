<template>
  <NumberFormGroup
    field-path="system.quantity"
    :disabled="isInfinite"
  >
    <template #controls="{ editable }">
      <button
        v-if="editable"
        class="field-control-btn"
        type="button"
        :class="{ 'is-active': isInfinite }"
        :title="isInfiniteTitle"
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
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { PhysicalDocumentStore } from '@items/physical/physicalItem/index.mjs';
  import { NumberFormGroup } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  const {
    documentGetters: { quantity },
    documentActions: { getViewAwareFieldUpdater },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

  const updater = getViewAwareFieldUpdater('system.quantity');
  const isInfinite = computed(() => quantity.value === -1);

  const toggleInfinite = () => updater(isInfinite.value ? 0 : -1);
  const isInfiniteTitle = game.i18n.localize('dnd35e.PHYSICAL_ITEM.FIELDS.quantity.IsInfinite');
</script>
