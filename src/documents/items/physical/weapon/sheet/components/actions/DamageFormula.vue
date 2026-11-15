<template>
  <FormulaFormGroup
    :label="'dnd35e.WEAPON.ACTIONS.Fields.damageFormula.label'"
    :tooltip="'dnd35e.WEAPON.ACTIONS.Fields.damageFormula.hint'"
    :value="displayFormula"
    :source-value="damageFormulaSourceText"
    :field-path="getFieldPath('damageFormula.formula')"
    :override-field-path="getOverrideFieldPath('damageFormula.formula')"
    :contexts="familiarContexts"
    :on-update="(v: string) => updateActionField('damageFormula', { ...damageFormulaData, formula: v })"
    class="grid-full-row"
  />
</template>

<script setup lang="ts">
  import { stripMarkerFlavors } from '@constants/diceMarkerBag.mjs';
  import FormulaFormGroup from '@helpers/formulae/FormulaFormGroup.vue';
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import type { WeaponAttackEditorStore } from '@items/physical/weapon/actions/WeaponAttack/WeaponAttackEditorStore.mjs';
  import { computed, inject } from 'vue';

  const {
    getters: { damageFormulaData, damageFormulaSourceText, familiarContexts },
    actions: {
      updateActionField,
      getFieldPath,
      getOverrideFieldPath,
    },
  } = inject(ActionEditorStoreSymbol) as WeaponAttackEditorStore;

  // `$typed()` applied via an AE "add" change resolves before its text is appended to
  // `damageFormula.formula` (see `resolveActiveEffectChangeValue`), so the effective formula
  // text can carry a marker bag (e.g. `1d6[__dnd35e_marker__...]`). Strip it for display only —
  // the roll pipeline reads the unstripped field directly, never this computed value.
  const displayFormula = computed(() => stripMarkerFlavors(damageFormulaData.value.formula ?? ''));
</script>
