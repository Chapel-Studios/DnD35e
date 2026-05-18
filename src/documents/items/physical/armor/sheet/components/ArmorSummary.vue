<template>
  <ul class="armor-summary">
    <li>
      <SelectFormGroup
        :value="armorType"
        :options="ArmorTypeSelectOptions"
        :on-update="armorTypeUpdater"
        field-path="system.armorType"
      />
    </li>
    <li>
      <SelectFormGroup
        :value="armorSubtype"
        :options="ArmorSubtypeSelectOptions"
        :on-update="armorSubtypeUpdater"
        field-path="system.armorSubtype"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { ArmorSubtypeSelectOptions, ArmorTypeSelectOptions } from '@items/physical/armor/index.mjs';
  import { SelectFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import type { ArmorStore } from '../ArmorStore.mjs';

  const {
    documentGetters: {
      armorType,
      armorSubtype,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as ArmorStore;

  const armorTypeUpdater = getViewAwareFieldUpdater('system.armorType');
  const armorSubtypeUpdater = getViewAwareFieldUpdater('system.armorSubtype');
</script>

<style scoped lang="scss">
  .armor-summary {
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
      padding: 0.5rem 1rem;
    }

    :deep(select) {
      width: 100%;
      font-size: 1rem;
    }
  }
</style>
