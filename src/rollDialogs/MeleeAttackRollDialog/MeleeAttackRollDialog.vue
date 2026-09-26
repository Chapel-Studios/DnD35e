<template>
  <WeaponAttackRollDialog />
</template>

<script setup lang="ts">
  import type { VueDialogContext } from '@vueApps/VueDialogMixin.mjs';
  import { provide } from 'vue';

  import { RollDialogStoreSymbol } from '../RollDialog/RollDialogStore.mjs';
  import type { WeaponAttackRollDialogData, WeaponAttackRollDialogResult } from '../WeaponAttackRollDialog/types.mjs';
  import WeaponAttackRollDialog from '../WeaponAttackRollDialog/WeaponAttackRollDialog.vue';
  import { useWeaponAttackRollDialogStore } from '../WeaponAttackRollDialog/WeaponAttackRollDialogStore.mjs';

  const props = defineProps<{
    context: VueDialogContext<WeaponAttackRollDialogData, WeaponAttackRollDialogResult>;
  }>();

  provide(RollDialogStoreSymbol, useWeaponAttackRollDialogStore(props.context));
</script>
