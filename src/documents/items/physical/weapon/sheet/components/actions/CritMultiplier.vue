<template>
  <NumberFormGroup
    :label="'dnd35e.WEAPON.ACTIONS.Fields.critMultiplier.label'"
    :value="critMultiplier"
    :min="2"
    :max="10"
    :field-path="getFieldPath('critMultiplier')"
    :on-update="(v) => updateActionField('critMultiplier', v)"
    hide-field-controls
  />
</template>

<script setup lang="ts">
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import type { WeaponAttackEditorStore } from '@items/physical/weapon/actions/WeaponAttack/WeaponAttackEditorStore.mjs';
  import { NumberFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const {
    getters: { critMultiplier },
    actions: {
      updateActionField,
      getFieldPath,
    },
  } = inject(ActionEditorStoreSymbol) as WeaponAttackEditorStore;
</script>
