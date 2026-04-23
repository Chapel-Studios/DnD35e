<template>
  <ItemWeight>
    <template v-if="isEditMode" #controls>
      <button
        class="field-control-btn weightless-toggle"
        type="button"
        @click="isWeightlessWhenEquippedUpdater(!isWeightlessWhenEquipped)"
        :title="weightlessTitle"
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
  import type { RenderModeStore } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import ItemWeight from '@items/components/Physical/sheet/components/ItemWeight.vue';
  import { inject } from 'vue';

  import type { EquippableDocumentStore } from '../EquippableItemStore.mjs';

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const weightlessTitle = game.i18n.localize('dnd35e.EQUIPPABLE.FIELDS.isWeightlessWhenEquipped.label');
  const {
    documentGetters: {
      isWeightlessWhenEquipped,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as EquippableDocumentStore;

  const isWeightlessWhenEquippedUpdater = getDirectFieldUpdater('system.isWeightlessWhenEquipped');
</script>

<style scoped lang="scss">
  /* Base button styles in core.scss .field-control-btn */
  .weightless-toggle {
    width: 1.25rem;
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
