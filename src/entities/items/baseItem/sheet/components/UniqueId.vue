<template>
  <div class="unique-id-container">
    <!-- UID Field -->
    <TextFormGroup
      label="UID"
      :value="uniqueId"
      :on-update="updateUUID"
    >
      <template #controls>
        <button
          class="generate-uid"
          :disabled="!isEditable"
          @click="generate"
          type="button"
          :title="localize('D35E.GenerateUID').value"
        >
          <i class="fas fa-wand"></i>
        </button>
      </template>
    </TextFormGroup>

    <!-- Generate Button -->
  </div>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import TextFormGroup from '@vc/Fields/FormGroups/TextFormGroup.vue';
  import { inject } from 'vue';

  const _field = 'system.uniqueId';

  const {
    documentGetters: { getProperty },
    documentActions: { getDirectFieldUpdater },
    isEditable,
    localize,
  } = inject('documentSheetStore') as DocumentSheetStore;

  const uniqueId = getProperty<string>(_field);
  const updateUUID = getDirectFieldUpdater(_field);

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
    
    .generate-uid {
      cursor: pointer;
      padding: 0.125rem 0.25rem;
      background: transparent;
      border: none;
      opacity: 0.5;
      font-size: var(--font-size-11);

      transition: 
        opacity 0.15s ease,
        transform 0.15s ease;

      &:hover {
        opacity: 1;
        transform: translateY(-1px);
      }
    }
  }
</style>
