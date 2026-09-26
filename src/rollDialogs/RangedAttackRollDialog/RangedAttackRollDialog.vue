<template>
  <WeaponAttackRollDialog>
    <div v-if="ammoOptions.length" class="form-group subgrid">
      <label for="ammo-select">{{ localize('dnd35e.COMBAT.Ammo') }}</label>
      <select id="ammo-select" v-model="ammo">
        <option v-for="opt in ammoOptions" :key="opt.itemUuid" :value="opt.itemUuid">
          {{ opt.name }}
        </option>
      </select>
    </div>
  </WeaponAttackRollDialog>
</template>

<script setup lang="ts">
  import type { VueDialogContext } from '@vueApps/VueDialogMixin.mjs';
  import { provide } from 'vue';

  import { RollDialogStoreSymbol } from '../RollDialog/RollDialogStore.mjs';
  import WeaponAttackRollDialog from '../WeaponAttackRollDialog/WeaponAttackRollDialog.vue';
  import { useRangedAttackRollDialogStore } from './RangedAttackRollDialogStore.mjs';
  import type { RangedAttackRollDialogData, RangedAttackRollDialogResult } from './types.mjs';

  const props = defineProps<{
    context: VueDialogContext<RangedAttackRollDialogData, RangedAttackRollDialogResult>;
  }>();

  const store = useRangedAttackRollDialogStore(props.context);
  const { ammoOptions, ammo } = store.ranged;
  provide(RollDialogStoreSymbol, store);

  function localize(key: string): string {
    return game.i18n.localize(key);
  }
</script>

<style scoped lang="scss">
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    label {
      font-weight: 500;
      font-size: 0.9rem;
    }
  }
</style>
