<template>
  <FormulaFormGroup
    :label="'dnd35e.WEAPON.ACTIONS.Fields.attackFormula.label'"
    :tooltip="'dnd35e.WEAPON.ACTIONS.Fields.attackFormula.hint'"
    :value="attackFormulaData.formula"
    :field-path="getFieldPath('attackFormula.formula')"
    :contexts="familiarContexts"
    :on-update="(v: string) => updateActionField('attackFormula', { ...attackFormulaData, formula: v })"
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
    getters: { attackFormulaData, familiarContexts },
    actions: {
      updateActionField,
      getFieldPath,
    },
  } = inject(ActionEditorStoreSymbol) as WeaponAttackEditorStore;
</script>