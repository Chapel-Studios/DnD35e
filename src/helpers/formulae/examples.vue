<!-- 
  Example: Using FormulaFormGroup Component
  
  This example demonstrates how to integrate FormulaFormGroup into a parent component,
  most commonly an item sheet or active effect editor.

  In practice, familiar schemas are registered statically per entity type
  (see weaponFamiliar.mts, physicalFamiliar.mts, etc.) and the
  HeaderNameField component handles context building automatically via the registry.

  This file is for reference only — it is NOT imported or built.
-->

<!-- <template>
  <FormulaFormGroup
    label="Material Hardness Formula"
    hint="e.g., '#self.hardness + #owner.bonuses.material'"
    :value="formulaValue"
    :contexts="familiarSchema"
    :onUpdate="(val) => (formulaValue = val)"
  />
</template> -->

<script setup lang="ts">
  /* eslint-disable @typescript-eslint/no-unused-vars */
  import { ref } from 'vue';

  import { FormulaFormGroup } from './index.mjs';
  import { buildContextFromFormula } from './registry.mjs';
  import type { FamiliarSchema } from './types.mjs';

  // Local formula value
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

<!--
  USAGE IN ACTUAL ITEM SHEET

  1. Import the component:
     import { FormulaFormGroup } from '@helpers/formulae/index.mjs';

  2. Use it in template:
     <FormulaFormGroup
       label="My Formula Field"
       hint="Use #self.property or #owner.property"
       :value="documentData.myFormulaField"
       :contexts="familiarSchema"
       :onUpdate="saveFormula"
     />

  3. Build familiar context from the static registry:
     import { buildContextFromFormula } from '@helpers/formulae/index.mjs';
     import type { FormulaFieldData, FamiliarContext } from '@helpers/formulae/types.mjs';

     // The registry maps compound keys like "Item.weapon" to schema builders.
     // Schema builders return AspectGroup trees where each leaf has an
     // accessPath (e.g. "system.hardness") used to resolve values at save time.
     const familiarSchema = buildContextFromFormula({
       formula: '',
       contexts: { self: 'Item.weapon' },
     });

  4. Save a FormulaFieldData (formula + contexts):
     const saveFormula = (formula: string) => {
       const formulaData: FormulaFieldData | null = formula.trim()
         ? { formula, contexts: { self: 'Item.weapon' } }
         : null;
       updateDocument({ 'system.nameFormula': formulaData });
     };

  5. The component automatically:
     - Shows the raw formula in view mode
     - Enables familiar in edit mode
     - Validates formulas against available contexts
     - Highlights errors with tooltips
     - Provides autocomplete on typing #

  KEYBOARD SHORTCUTS:
     - #                    Trigger familiar
     - Arrow Up/Down        Navigate autocomplete options
     - Tab/Enter            Select autocomplete option
     - Escape               Close autocomplete menu
     - Hover over #var      Show resolved value tooltip

-->
