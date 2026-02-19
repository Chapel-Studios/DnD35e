<template>
  <PhysicalItemSheet>
    <template #header-summary>
      <WeaponSummary />
    </template>
    <template #header-status>
      <!-- EquipableHeaderStatus -->
    </template>
  </PhysicalItemSheet>
</template>

<script lang="ts" setup>
  import { PhysicalItemSheet } from '@items/components/Physical/index.mjs';
  import { useWeaponStore, WeaponSummary } from '@items/weapon/index.mjs';
  import { provide } from 'vue';

  const props = defineProps<{
    context: any;
  }>();

  const store = useWeaponStore(props.context);
  provide('documentSheetStore', store);
</script>
