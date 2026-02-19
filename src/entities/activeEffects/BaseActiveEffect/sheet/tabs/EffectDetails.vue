<template>
  <section
    class="effect-details"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="details"
  >
    <div class="form-group">
      <label>{{ nameLabel }}</label>
      <input type="text" name="name" :value="name" :disabled="!isEditable" />
    </div>
    <div class="form-group">
      <ImageField field="img" :label="imageLabel" />
    </div>
    <div class="form-group">
      <RichTextEditor field="description" :label="descriptionLabel" />
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { ActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import { ImageField, RichTextEditor } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const store = inject('documentSheetStore') as ActiveEffectConfigStore;
  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
    isEditable,
    documentGetters: { name },
  } = store;

  const isActiveTab = getIsTabOpen('details');

  const nameLabel = game.i18n.localize('Name');
  const imageLabel = game.i18n.localize('EFFECT.Image');
  const descriptionLabel = game.i18n.localize('EFFECT.Description');
</script>

<style scoped>
  .effect-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-group label {
    font-weight: bold;
  }
</style>
