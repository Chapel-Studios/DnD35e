<template>
  <div class="item-header">
    <slot>
      <DefaultNameHeader />
    </slot>

    <div class="item-subtitle">
      <h4 class="item-type">{{itemType}}</h4>
      <slot name="status"></slot>
    </div>
    <slot name="summary"></slot>
  </div>
</template>

<script lang="ts" setup>
import { ItemSheetStore, DefaultNameHeader } from '@items/baseItem/index.mjs';
import { inject } from 'vue';

const { getItemTypeDisplay } = inject('itemSheetStore') as ItemSheetStore;

const itemType = getItemTypeDisplay();
</script>


<style scoped lang="scss">
  .item-header {    
    display: grid;
    grid-template: auto / 3fr minmax(80px, 1fr);
  }

  .item-subtitle {
    flex: 0 0 80px;
    height: 60px;
    margin: 0;
    padding: 5px;
    text-align: right;
    color: #7a7971;
  }

  .item-type {
    font-size: 24px;
    line-height: 26px;
    margin: 0;
  }
</style>