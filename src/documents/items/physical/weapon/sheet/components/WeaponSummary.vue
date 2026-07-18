<template>
  <ul class="weapon-summary">
    <li>
      <SelectFormGroup
        :options="weaponTypeSelectOptions"
        field-path="system.weaponType"
        class="contents"
      />
    </li>
    <li>
      <SelectFormGroup
        :options="weaponSubtypeSelectOptions"
        field-path="system.weaponSubtype"
        class="contents"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
  import { weaponSubtypeSelectOptions, weaponTypeSelectOptions } from '@items/physical/weapon/data/constants.mjs';
  import { SelectFormGroup } from '@vc/fields/index.mjs';
</script>

<style scoped lang="scss">
  .weapon-summary {
    grid-column: span 2;
    display: grid;
    grid-template: auto / 1fr 1fr;
    justify-items: center;
    font-size: 1.25rem;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      color: #4b4a44;
      padding: 0.5rem 0.25em;
      display: grid;
      height: 100%;
    }

    :deep(select) {
      width: 100%;
      font-size: 1rem;
      align-self: end;
    }
  }
</style>
