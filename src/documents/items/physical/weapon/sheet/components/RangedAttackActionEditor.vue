<template>
  <WeaponAttackActionEditor :propertyOptions="rangedWeaponPropertySelectOptions">
    <template #append>
      <NumberFormGroup
        :label="'dnd35e.WEAPON.ACTIONS.Fields.rangeIncrement.label'"
        :value="rangeIncrement"
        :min="0"
        :field-path="getFieldPath('rangeIncrement')"
        :on-update="(v) => updateActionField('rangeIncrement', v)"
        hide-field-controls
      />
      <CheckBoxFormGroup
        :label="'dnd35e.WEAPON.ACTIONS.Fields.isAmmoRequired.label'"
        :value="isAmmoRequired"
        :field-path="getFieldPath('isAmmoRequired')"
        :on-update="(v) => updateActionField('isAmmoRequired', v)"
        hide-field-controls
      />
    </template>
  </WeaponAttackActionEditor>
</template>

<script setup lang="ts">
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import { CheckBoxFormGroup,NumberFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import { rangedWeaponPropertySelectOptions } from '../../actions/RangedAttack/constants.mjs';
  import type { RangedAttackEditorStore } from '../../actions/RangedAttack/RangedAttackEditorStore.mts';
  import WeaponAttackActionEditor from './WeaponAttackActionEditor.vue';

  const {
    getters: { rangeIncrement, isAmmoRequired },
    actions: {
      updateActionField,
      getFieldPath,
    },
  } = inject(ActionEditorStoreSymbol) as RangedAttackEditorStore;
</script>