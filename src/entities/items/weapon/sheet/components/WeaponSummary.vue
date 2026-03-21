<template>
  <ul class="weapon-summary">
    <li>
      <SelectFormGroup
        :value="effectiveWeaponType"
        :options="weaponTypeSelectOptions"
        :on-update="weaponTypeUpdater"
        field-path="system.weaponType"
      />
    </li>
    <li>
      <SelectFormGroup
        :value="effectiveWeaponSubtype"
        :options="weaponSubtypeSelectOptions"
        :on-update="weaponSubtypeUpdater"
        field-path="system.weaponSubtype"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
  import { weaponSubtypeSelectOptions, weaponTypeSelectOptions } from '@items/weapon/index.mjs';
  import { SelectFormGroup } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  import type { WeaponStore } from '../WeaponStore.mjs';



  const {
    documentGetters: {
      weaponType,
      weaponSubtype,
    },
    documentGetters: {
      getEffectiveFieldValue,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject('documentSheetStore') as WeaponStore;

  // View-aware values: shows override when viewing as unidentified
  const effectiveWeaponType = computed(() => 
    getEffectiveFieldValue('system.weaponType', weaponType.value)
  );
  const effectiveWeaponSubtype = computed(() => 
    getEffectiveFieldValue('system.weaponSubtype', weaponSubtype.value)
  );

  const weaponTypeUpdater = getViewAwareFieldUpdater('system.weaponType');
  const weaponSubtypeUpdater = getViewAwareFieldUpdater('system.weaponSubtype');
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
