<template>
  <PhysicalItemSheet>
    <template #header-summary>
      <WeaponSummary />
    </template>
    <template #header-status>
      <!-- [1.G] Two header status components needed:
        - PhysicalItemHeaderStatus.vue: checks isCarried, shows "Carried" badge (reusable for all physical items)
        - EquippableHeaderStatus.vue: overrides physical, checks isEquipped (priority) + isCarried (reusable for all equippables)
       -->
    </template>
  </PhysicalItemSheet>
</template>

<script lang="ts" setup>
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { PhysicalItemSheet } from '@items/components/Physical/index.mjs';
  import { useWeaponStore, WeaponSummary } from '@items/weapon/index.mjs';
  import { provide } from 'vue';

  const props = defineProps<{
    context: any;
  }>();

  const store = useWeaponStore(props.context);
  provide(DocumentSheetStoreSymbol, store);
</script>
