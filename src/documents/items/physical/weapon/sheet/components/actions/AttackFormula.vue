<template>
  <FormulaFormGroup
    :label="'dnd35e.WEAPON.ACTIONS.Fields.attackFormula.label'"
    :tooltip="'dnd35e.WEAPON.ACTIONS.Fields.attackFormula.hint'"
    :value="attackFormulaData.formula"
    :source-value="attackFormulaSourceText"
    :field-path="getFieldPath('attackFormula.formula')"
    :override-field-path="getOverrideFieldPath('attackFormula.formula')"
    :contexts="familiarContexts"
    :on-update="(v: string) => updateActionField('attackFormula', { ...attackFormulaData, formula: v })"
    class="grid-full-row"
  />
</template>

<script setup lang="ts">
  import FormulaFormGroup from '@helpers/formulae/FormulaFormGroup.vue';
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import type { WeaponAttackEditorStore } from '@items/physical/weapon/actions/WeaponAttack/WeaponAttackEditorStore.mjs';
  import { inject } from 'vue';

  const {
    getters: { attackFormulaData, attackFormulaSourceText, familiarContexts },
    actions: {
      updateActionField,
      getFieldPath,
      getOverrideFieldPath,
    },
  } = inject(ActionEditorStoreSymbol) as WeaponAttackEditorStore;
</script>