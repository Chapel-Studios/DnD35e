<!--
  Example: Using FormulaFormGroup Component

  This example demonstrates how to integrate FormulaFormGroup into a parent component,
  most commonly an item sheet or active effect editor.

  In practice, familiar schemas are registered statically per entity type
  (see weaponFamiliar.mts, physicalFamiliar.mts, etc.) and the
  HeaderNameField component handles context building automatically via the registry.

  This file is for reference only — it is NOT imported or built.
-->

<template>
  <FormulaFormGroup
    label="Material Hardness Formula"
    hint="e.g., '#self.hardness + #owner.bonuses.material'"
    :value="formulaValue"
    :contexts="familiarSchema"
    field-path="system.hardnessFormula"
    :on-update="(val) => (formulaValue = val)"
  />
</template>

<script setup lang="ts">
  import { ref } from 'vue';

  import { FormulaFormGroup } from './index.mjs';
  import { buildContextFromFormula } from './registry.mjs';
  import type { FamiliarSchema } from './types.mjs';

  const formulaValue = ref('');

  /**
   * Build the familiar context from the registry.
   *
   * In real usage, HeaderNameField does this automatically using
   * the document's type and the familiar schema registry.
   * Here we show the manual approach for custom formula fields.
   */
  const familiarSchema: FamiliarSchema = buildContextFromFormula({
    formula: '',
    contexts: {
      self: 'Item.weapon', // compound key: DocumentType.subtype
    },
  });
</script>
