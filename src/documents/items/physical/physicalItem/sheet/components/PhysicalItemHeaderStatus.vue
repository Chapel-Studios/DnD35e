<template>
  <div
    :class="{ 'active-shadow': useActiveShadow }"
    class="header-status-badge"
  >
    <i :class="carriedIcon" />
    {{ carriedLabel }}
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { PhysicalDocumentStore } from '@items/physical/physicalItem/index.mjs';
  import { computed, inject } from 'vue';

  const props = defineProps<{
    iconOverride?: string | null;
    labelOverride?: string | null;
  }>();

  const store = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

  const { isCarried } = store.documentGetters;
  const useActiveShadow = computed(() => !!props.labelOverride || isCarried.value);
  const carriedIcon = computed(() =>
    props.iconOverride ?? (isCarried.value
      ? 'fa-solid fa-person-walking-luggage'
      : 'fas fa-box'));
  const carriedLabel = computed(() => 
    props.labelOverride ?? (isCarried.value
      ? game.i18n.localize('dnd35e.PHYSICAL_ITEM.FIELDS.isCarried.label')
      : game.i18n.localize('dnd35e.PHYSICAL_ITEM.FIELDS.isCarried.antilabel')));
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

    &.active-shadow {
      color: var(--identify-identified-color, #e6c27a);
      text-shadow: 0 0 6px rgba(230, 194, 122, 0.6), 0 0 12px rgba(230, 194, 122, 0.35);

      i {
        opacity: 1;
      }
    }
  }
</style>
