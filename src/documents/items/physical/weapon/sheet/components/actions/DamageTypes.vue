<template>
  <MultiSelectFormGroup
    :label="'dnd35e.WEAPON.ACTIONS.Fields.damageTypes.label'"
    :value="damageTypes"
    :options="damageTypeOptions"
    :field-path="getFieldPath('damageTypes')"
    :on-update="(v) => updateActionField('damageTypes', v)"
  />
</template>

<script setup lang="ts">
  import { GetDamageTypeSelectOptions } from '@constants/attacks/damageTypes.mjs';
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import type { WeaponAttackEditorStore } from '@items/physical/weapon/actions/WeaponAttack/WeaponAttackEditorStore.mjs';
  import { MultiSelectFormGroup } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  const damageTypeOptions = computed(() => GetDamageTypeSelectOptions());

  const {
    getters: { damageTypes },
    actions: {
      updateActionField,
      getFieldPath,
    },
  } = inject(ActionEditorStoreSymbol) as WeaponAttackEditorStore;
</script>
