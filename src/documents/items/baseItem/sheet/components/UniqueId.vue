<template>
  <div class="unique-id-container">
    <!-- UID Field -->
    <TextFormGroup
      label="UID"
      :value="uniqueId"
      field-path="system.slug"
    >
      <template #controls="{ editable }">
        <button
          class="field-control-btn generate-uid"
          :disabled="!editable"
          @click="generate"
          type="button"
          :title="localize('dnd35e.COMMON.GenerateUID').value"
        >
          <i class="fas fa-wand"></i>
        </button>
      </template>
    </TextFormGroup>

    <!-- Generate Button -->
  </div>
</template>

<script setup lang="ts">
  import { type DocumentSheetStore, DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import TextFormGroup from '@vc/fields/formGroups/TextFormGroup.vue';
  import { inject } from 'vue';

  const _field = 'system.slug';

  const {
    documentGetters: { getViewAwareFieldValue },
    documentActions: { getViewAwareFieldUpdater },
    _storeUtils: {
      createLocalizedComputed: localize,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const uniqueId = getViewAwareFieldValue<string>(_field);
  const updateUUID = getViewAwareFieldUpdater(_field);

  async function generate () {
    const uid = crypto.randomUUID();
    await updateUUID(uid);
  }
</script>

<style scoped lang="scss">
  .unique-id-container {
    // grid-column: span 2;
    width: 100%;
    display: grid;
    grid-template-columns: auto 1fr;
    grid-column-gap: 1.5rem;
    align-items: center;
  }
</style>
