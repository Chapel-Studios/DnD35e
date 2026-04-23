<template>
  <div 
    v-if="isEquippedOrCarried"
    class="header-status-badge"
    :class="{ 'is-e-or-c': isEquippedOrCarried }"
  >
    <i :class="equippedIcon" />
    {{ statusLabel }}
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { EquippableItemStore } from '@items/components/Equippable/index.mjs';
  import { computed, inject } from 'vue';

  const store = inject(DocumentSheetStoreSymbol) as EquippableItemStore;

  const { isEquipped, isCarried } = store.documentGetters;
  const isEquippedOrCarried = computed(() => isEquipped.value || isCarried.value);
  const equippedIcon = computed(() => isEquipped.value ? 'fas fa-shield-alt' : 'fas fa-bag-check');
  const statusLabel = computed(() => isEquipped.value
    ? game.i18n.localize('dnd35e.EQUIPPABLE.FIELDS.isEquipped.label')
    : game.i18n.localize('dnd35e.PHYSICAL_ITEM.FIELDS.isCarried.label'));
</script>

<style scoped lang="scss">
  .header-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.875rem;
    color: var(--color-text-light);
    background: var(--color-shadow);
    padding: 0.25rem 0.6rem;
    border-radius: 0.25rem;

    i {
      opacity: 0.8;
    }

    &.is-e-or-c {
      background: rgba(102, 204, 0, 0.2);
      color: #66cc00;

      i {
        opacity: 1;
      }
    }
  }
</style>
