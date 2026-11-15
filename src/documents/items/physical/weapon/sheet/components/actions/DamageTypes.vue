<template>
  <MultiSelectFormGroup
    :label="'dnd35e.WEAPON.ACTIONS.Fields.damageTypes.label'"
    :value="editValue"
    :options="damageTypeOptions"
    :field-path="getFieldPath('damageTypes')"
    :on-update="(v) => updateActionField('damageTypes', v)"
  />
</template>

<script setup lang="ts">
  import { GetDamageTypeSelectOptions } from '@constants/attacks/damageTypes.mjs';
  import type { RenderModeStore } from '@documents/document/index.mjs';
  import { RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import type { WeaponAttackEditorStore } from '@items/physical/weapon/actions/WeaponAttack/WeaponAttackEditorStore.mjs';
  import { MultiSelectFormGroup } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  const damageTypeOptions = computed(() => GetDamageTypeSelectOptions());

  const {
    getters: { damageTypes, damageTypesSource },
    actions: {
      updateActionField,
      getFieldPath,
    },
  } = inject(ActionEditorStoreSymbol) as WeaponAttackEditorStore;

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;

  // `MultiSelectFormGroup` only applies its own source/mode-awareness when its `value` prop is
  // left undefined — passing an explicit value (as here) bypasses that logic entirely, so it
  // must be computed here instead. Edit mode shows the authored source set (so toggling a
  // checkbox never bakes an AE-contributed type into source data); play/true mode shows the
  // effective (post-AE) set.
  const editValue = computed(() => (isEditMode.value && damageTypesSource.value ? damageTypesSource.value : damageTypes.value));
</script>
