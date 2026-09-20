<template>
  <SelectFormGroup
    :label="'dnd35e.WEAPON.ACTIONS.Fields.damageType.label'"
    :value="damageType"
    :options="damageTypeOptions"
    :field-path="getFieldPath('damageType')"
    :on-update="(v: DamageType | null) => updateActionField('damageType', v ?? DAMAGE_TYPE_NONE)"
    hide-field-controls
  />
</template>

<script setup lang="ts">
  import type { DamageType } from '@constants/attacks/damageTypes.mjs';
  import { DAMAGE_TYPE_NONE, GetDamageTypeSelectOptions } from '@constants/attacks/damageTypes.mjs';
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import type { WeaponAttackEditorStore } from '@items/physical/weapon/actions/WeaponAttack/WeaponAttackEditorStore.mjs';
  import { SelectFormGroup } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  const damageTypeOptions = computed(() => GetDamageTypeSelectOptions());

  const {
    getters: { damageType },
    actions: {
      updateActionField,
      getFieldPath,
    },
  } = inject(ActionEditorStoreSymbol) as WeaponAttackEditorStore;
</script>
