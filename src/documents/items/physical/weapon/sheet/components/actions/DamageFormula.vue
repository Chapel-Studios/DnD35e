<template>
  <FormulaFormGroup
    :label="'dnd35e.WEAPON.ACTIONS.Fields.damageFormula.label'"
    :tooltip="'dnd35e.WEAPON.ACTIONS.Fields.damageFormula.hint'"
    :value="damageFormulaData.formula"
    :source-value="damageFormulaSourceText"
    :field-path="getFieldPath('damageFormula.formula')"
    :override-field-path="getOverrideFieldPath('damageFormula.formula')"
    :contexts="familiarContexts"
    :on-update="(v: string) => updateActionField('damageFormula', { ...damageFormulaData, formula: v })"
    class="grid-full-row"
  />
</template>

<script setup lang="ts">
  import FormulaFormGroup from '@helpers/formulae/FormulaFormGroup.vue';
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import type { WeaponAttackEditorStore } from '@items/physical/weapon/actions/WeaponAttack/WeaponAttackEditorStore.mjs';
  import { inject } from 'vue';

  const {
    getters: { damageFormulaData, damageFormulaSourceText, familiarContexts },
    actions: {
      updateActionField,
      getFieldPath,
      getOverrideFieldPath,
    },
  } = inject(ActionEditorStoreSymbol) as WeaponAttackEditorStore;
</script>
