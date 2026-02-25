<template>
  <NumberFormGroup
    :editable="isEditable"
    label="HP"
    :value="currentHp"
    :on-update="updateCurrentHp"
  />
  <NumberFormGroup
    :editable="isEditable"
    label="Max HP"
    :value="maxHp"
    :on-update="updateMaxHp"
  />
</template>
<script setup lang="ts">
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    isEditable,
    physicalItemGetters: {
      maxHp,
      currentHp,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  const updateCurrentHp = getFieldUpdater('system.hp.value');
  const updateMaxHp = getFieldUpdater('system.hp.max');
</script>
