<template>
  <ActionEditor>
    <template #append>
      <AttackFormula
        class="grid-full-row"
      />
      <DamageFormula
        class="grid-full-row"
      />
      <DamageType />
      <CritRange />
      <CritMultiplier />
      <CheckBoxFormGroup
        :label="'dnd35e.WEAPON.ACTIONS.Fields.requiresEquipped.label'"
        :hint="'dnd35e.WEAPON.ACTIONS.Fields.requiresEquipped.hint'"
        :value="requiresEquipped"
        :field-path="getFieldPath('requiresEquipped')"
        :on-update="(v) => updateActionField('requiresEquipped', v)"
        hide-field-controls
      />
      <slot name="append" />
      <MultiSelectFormGroup
        :label="'dnd35e.WEAPON.ACTIONS.Fields.properties.label'"
        :value="properties"
        :options="propertyOptions"
        :field-path="getFieldPath('properties')"
        :on-update="(v) => updateActionField('properties', v)"
        hide-field-controls
        class="grid-full-row"
      />
    </template>
  </ActionEditor>
</template>

<script lang="ts">
  export interface WeaponAttackActionEditorProps<T extends AllWeaponProperties> {
    propertyOptions: SelectOption<T>[];
  }
</script>

<script setup lang="ts" generic="T extends AllWeaponProperties">
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import ActionEditor from '@items/baseItem/sheet/components/actions/ActionEditor.vue';
  import type { SelectOption } from '@vc/fields/index.mjs';
  import { CheckBoxFormGroup, MultiSelectFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import type { AllWeaponProperties } from '../../actions/WeaponAttack/constants.mjs';
  import type { WeaponAttackEditorStore } from '../../actions/WeaponAttack/WeaponAttackEditorStore.mjs';
  import AttackFormula from './actions/AttackFormula.vue';
  import CritMultiplier from './actions/CritMultiplier.vue';
  import CritRange from './actions/CritRange.vue';
  import DamageFormula from './actions/DamageFormula.vue';
  import DamageType from './actions/DamageType.vue';

  const { propertyOptions } = defineProps<WeaponAttackActionEditorProps<T>>();

  const {
    getters: {
      requiresEquipped,
      properties,
    },
    actions: {
      updateActionField,
      getFieldPath,
    },
  } = inject(ActionEditorStoreSymbol) as WeaponAttackEditorStore;
</script>
