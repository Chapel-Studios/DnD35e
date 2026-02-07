<template>
  <div class="unique-id-container">
    <!-- UID Field -->
    <FormGroup
      label="UID"
      type="text"
      :value="uniqueId"
      :editable="isEditable"
      :onUpdate="updateUUID"
    />

    <!-- Generate Button -->
    <button
      class="btn generate-uid"
      @click="generate"
      type="button"
    >
      <i class="fas fa-wand"></i>
      {{ t("D35E.Generate") }}
    </button>
  </div>
</template>

<script setup lang="ts">
  import { ItemSheetStore } from '@items/baseItem/index.mjs';
  import FormGroup from '@vc/Fields/FormGroup.vue';
  import { inject } from 'vue';

  const _field = 'system.uniqueId';
  const {
    documentGetters: {
      uniqueId,
    },
    documentActions: {
      getFieldUpdater,
    },
    isEditable,
  } = inject('itemSheetStore') as ItemSheetStore;
  const updateUUID = getFieldUpdater(_field);

  function t (key: string) {
    return game.i18n.localize(key);
  }

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

  /* Match your form-container override */
  .form-container .unique-id-container {
    display: contents;
  }
</style>
