<template>
  <div class="name-and-art">
    <div class="item-art-container">
      <ImageField field="img" :title="displayName" class="item-art" />
    </div>
    <div class="item-name-container">
      <slot>
        <!-- Name field goes here -->
      </slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import ImageField from '@vc/Fields/ImageField.vue';
  import { inject } from 'vue';
  import type { ItemSheetStore } from '@items/baseItem/index.mjs';

  const {
    documentGetters: {
      displayName,
    },
  } = inject('itemSheetStore') as ItemSheetStore;
</script>

<style scoped lang="scss">
  .name-and-art {
    display: flex;
  }

  .item-art-container {
    flex: 0 128px;
    width: 128px;
    position: relative;
    margin-right: 0.5rem;
    margin-bottom: 0.25rem;

    img.item-art {
      object-fit: contain;
      border: 2px solid #000;
    }
  }

  .item-name-container {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>