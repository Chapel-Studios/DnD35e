<template>
  <ItemWeight>
    <template #controls>
      <button
        class="weightless-toggle"
        type="button"
        @click="isWeightlessWhenEquippedUpdater(!isWeightlessWhenEquipped)"
        :title="'Is Weightless When Equipped'"
      >
        <i class="fas fa-weight-hanging icon-off" v-if="!isWeightlessWhenEquipped"></i>

        <span class="fa-stack icon-on" v-else>
          <i class="fas fa-feather fa-stack-1x base"></i>
          <i class="fas fa-sparkles fa-stack-1x overlay"></i>
        </span>
      </button>
    </template>
  </ItemWeight>
</template>

<script setup lang="ts">
  import ItemWeight from '@items/components/Physical/sheet/components/ItemWeight.vue';
  import { inject } from 'vue';

  import { EquippableDocumentStore } from '../EquippableItemStore.mjs';

  const {
    documentGetters: {
      isWeightlessWhenEquipped,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject('documentSheetStore') as EquippableDocumentStore;

  const isWeightlessWhenEquippedUpdater = getDirectFieldUpdater('system.isWeightlessWhenEquipped');

</script>

<style scoped lang="scss">
  .weightless-toggle {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    padding: 0.125rem 0.25rem;
    color: var(--color-text-dark, #444);
    background: transparent;
    border: none;
    opacity: 0.5;
    transition: opacity 150ms ease, transform 150ms ease;
    font-size: var(--font-size-11);
    height: 1.5rem;
    width: 1.25rem;

    &:hover {
      opacity: 1;
      transform: translateY(-1px);
    }
  }

  /* Inactive icon */
  .icon-off {
    color: var(--color-text-dark-secondary, #888);
  }

  /* Active stacked icon */
  .icon-on {
    position: relative;
    // width: 0.75rem;
    // height: 1.2em;

    .base {
      color: var(--color-text-light-primary, #fff);
    }

    .overlay {
      position: absolute;
      top: -0.35em;
      left: 0.55em;
      font-size: 0.55em;
      color: #fbc02d; /* golden sparkle */
      pointer-events: none;
    }
  }
</style>
