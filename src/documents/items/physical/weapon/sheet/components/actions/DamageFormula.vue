<template>
  <FormulaFormGroup
    :label="'dnd35e.WEAPON.ACTIONS.Fields.damageFormula.label'"
    :tooltip="'dnd35e.WEAPON.ACTIONS.Fields.damageFormula.hint'"
    :value="damageFormulaData.formula"
    :field-path="getFieldPath('damageFormula.formula')"
    :contexts="familiarContexts"
    :on-update="(v: string) => updateActionField('damageFormula', { ...damageFormulaData, formula: v })"
    hide-field-controls
    class="grid-full-row"
  />
</template>

<script setup lang="ts">
  import FormulaFormGroup from '@helpers/formulae/FormulaFormGroup.vue';
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import type { WeaponAttackEditorStore } from '@items/physical/weapon/actions/WeaponAttack/WeaponAttackEditorStore.mjs';
  import { inject } from 'vue';

  const {
    getters: { damageFormulaData, familiarContexts },
    actions: {
      updateActionField,
      getFieldPath,
    },
  } = inject(ActionEditorStoreSymbol) as WeaponAttackEditorStore;
</script>
