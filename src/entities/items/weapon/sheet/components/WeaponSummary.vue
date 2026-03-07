<template>
  <ul class="weapon-summary">
    <li>
      <SelectFormGroup
        :value="weaponType"
        :options="weaponTypeSelectOptions"
        :on-update="getFieldUpdater('system.weaponType')"
      />
    </li>
    <li>
      <SelectFormGroup
        :value="weaponSubtype"
        :options="weaponSubtypeSelectOptions"
        :on-update="getFieldUpdater('system.weaponSubtype')"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
  import { weaponSubtypeSelectOptions, weaponTypeSelectOptions } from '@items/weapon/index.mjs';
  import { SelectFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  import type { WeaponStore } from '../WeaponStore.mjs';



  const {
    weaponGetters: {
      weaponType,
      weaponSubtype,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('documentSheetStore') as WeaponStore;
</script>

<style scoped lang="scss">
  .weapon-summary {
    grid-column: span 2;
    display: grid;
    grid-template: auto / 1fr 1fr;
    justify-items: center;
    font-size: 1.25rem;
    height: 60px;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      color: #4b4a44;
      padding: 0.5rem 1rem;;
    }

    :deep(select) {
      width: 100%;
      font-size: 1rem;
    }
  }
</style>
