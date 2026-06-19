<template>
  <FormGroupSection
    label="dnd35e.PHYSICAL_ITEM.FIELDS.hp.label"
    field-path="system.hp"
    :default-visibility="ownerPlusVisibility"
    :default-editability="gmOnlyEditability"
    class="item-hp-section"
  >
    <NumberFormGroup
      :value="currentHp"
      field-path="system.hp.current"
      :default-visibility="ownerPlusVisibility"
      :default-editability="gmOnlyEditability"
    />
    <NumberFormGroup
      :value="maxHp"
      field-path="system.hp.max"
      :default-visibility="ownerPlusVisibility"
      :default-editability="gmOnlyEditability"
    />
    <template #readonly>
      <span class="hp-display">{{ currentHp }}<HasActiveEffectsNotification :field-path="'system.hp.current'" /> / {{ maxHp }}<HasActiveEffectsNotification :field-path="'system.hp.max'" /></span>
    </template>
  </FormGroupSection>
</template>
<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { PhysicalDocumentStore } from '@items/physical/physicalItem/index.mjs';
  import FormGroupSection from '@vc/fields/formGroups/FormGroupSection.vue';
  import { HasActiveEffectsNotification, NumberFormGroup, ownerPlusVisibility } from '@vc/fields/index.mjs';
  import { gmOnlyEditability } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const {
    documentGetters: {
      maxHp,
      currentHp,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;
</script>

<style lang="scss" scoped>
  .hp-display {
    display: inline-flex;
    align-items: center;

    :deep(.effect-tooltip) {
      font-size: 0.75rem;
      margin-left: 0.3rem;
    }
  }

  .item-hp-section {
    grid-column: span 2;
  }
</style>
