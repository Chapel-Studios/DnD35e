<template>
  <NumberFormGroup
    :label="'dnd35e.WEAPON.ACTIONS.Fields.critRange.label'"
    :value="critRange"
    :min="2"
    :max="20"
    :field-path="getFieldPath('critRange')"
    :on-update="(v) => updateActionField('critRange', v)"
    hide-field-controls
  />
</template>

<script setup lang="ts">
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import type { WeaponAttackEditorStore } from '@items/physical/weapon/actions/WeaponAttack/WeaponAttackEditorStore.mjs';
  import { NumberFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const {
    getters: { critRange },
    actions: {
      updateActionField,
      getFieldPath,
    },
  } = inject(ActionEditorStoreSymbol) as WeaponAttackEditorStore;
</script>
