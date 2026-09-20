<template>
  <WeaponAttackActionEditor :propertyOptions="meleeWeaponPropertySelectOptions">
    <template #append>
      <NumberFormGroup
        :label="'dnd35e.WEAPON.ACTIONS.Fields.reachLength.label'"
        :value="reachLength"
        :min="0"
        :field-path="getFieldPath('reachLength')"
        :on-update="(v) => updateActionField('reachLength', v)"
        hide-field-controls
      />
    </template>
  </WeaponAttackActionEditor>
</template>

<script setup lang="ts">
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import { NumberFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import { meleeWeaponPropertySelectOptions } from '../../actions/MeleeWeaponAttack/constants.mjs';
  import type { MeleeAttackEditorStore } from '../../actions/MeleeWeaponAttack/MeleeAttackEditorStore.mjs';
  import WeaponAttackActionEditor from './WeaponAttackActionEditor.vue';

  const {
    getters: { reachLength },
    actions: {
      updateActionField,
      getFieldPath,
    },
  } = inject(ActionEditorStoreSymbol) as MeleeAttackEditorStore;

</script>