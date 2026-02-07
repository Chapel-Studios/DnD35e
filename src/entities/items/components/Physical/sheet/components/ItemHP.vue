<template>
  <FormGroup
    :editable="isEditable"
    label="HP"
    :value="currentHp"
    @update="updateCurrentHp"
    type="number"
  />
  <FormGroup
    :editable="isEditable"
    :value="maxHp"
    @update="updateMaxHp"
    type="number"
  />
</template>
<script setup lang="ts">
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';
  import { PhysicalItemSheetStore } from '@items/components/Physical/index.mjs';

  const {
    isEditable,
    physicalItemGetters: {
      maxHp,
      currentHp,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('itemSheetStore') as PhysicalItemSheetStore;

  const updateCurrentHp = getFieldUpdater('system.hp.value');
  const updateMaxHp = getFieldUpdater('system.hp.max');
</script>
