<template>
  <div class="unique-id-container">
    <!-- UID Field -->
    <TextFormGroup
      label="UID"
      :value="uniqueId"
      :on-update="updateUUID"
    />

    <!-- Generate Button -->
    <button
      class="btn generate-uid"
      :disabled="!isEditable"
      @click="generate"
      type="button"
    >
      <i class="fas fa-wand"></i>
      {{ localize("D35E.Generate") }}
    </button>
  </div>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import TextFormGroup from '@vc/Fields/FormGroups/TextFormGroup.vue';
  import { inject } from 'vue';

  const _field = 'system.uniqueId';

  const {
    documentGetters: { getProperty },
    documentActions: { getFieldUpdater },
    isEditable,
    localize,
  } = inject('documentSheetStore') as DocumentSheetStore;

  const uniqueId = getProperty<string>(_field);
  const updateUUID = getFieldUpdater(_field);

  async function generate () {
    const uid = crypto.randomUUID();
    await updateUUID(uid);
  }
</script>

<style scoped lang="scss">
  .unique-id-container {
    grid-column: span 2;
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-column-gap: 1.5rem;
    align-items: center;
  }
</style>
