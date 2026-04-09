<!-- 
  HeaderNameField with FormulaFormGroup Integration
  
  This file demonstrates how to use the new FormulaFormGroup component
  integrated with HeaderNameField for dynamic formula-based naming.
-->

<template>
  <div class="example-usage">
    <!-- Example 1: Standard text-based name (default behavior) -->
    <HeaderNameField
      :display-value="itemName"
      :edit-value="itemName"
      field-path="name"
      label="Item Name"
    />

    <!-- Example 2: Formula-based name with intellisense -->
    <HeaderNameField
      :display-value="formulaResult"
      :edit-value="itemFormula"
      field-path="formula"
      use-formula
      formula-label="Dynamic Name Formula"
      formula-hint="Build name from item properties: #self.material, #self.quality, etc."
    />
  </div>
</template>

<script setup lang="ts">
  import HeaderNameField from './HeaderNameField.vue';
  import { computed, reactive } from 'vue';

  // Example item data
  const item = reactive({
    name: 'Iron Sword',
    formula: 'Iron (+#self.material.bonus ac) #self.quality',
    material: {
      name: 'Iron',
      bonus: 1,
    },
    quality: 'masterwork',
  });

  const itemName = computed(() => item.name);
  const itemFormula = computed(() => item.formula);

  // The formula result would be computed by FormulaFormGroup
  // When shown in view mode, #self.material.bonus → 1, etc.
  const formulaResult = computed(() => {
    // FormulaFormGroup internally handles this resolution
    return item.formula;
  });
</script>

<style scoped>
  .example-usage {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>

<!-- 
  DETAILED INTEGRATION GUIDE
  
  Using FormulaFormGroup in HeaderNameField:
  
  1. BASIC SETUP (Text Mode - Original Behavior)
     ============================================
     <HeaderNameField
       :display-value="item.name"
       :edit-value="item.name"
       field-path="name"
     />
     
     This works exactly as before, using TextFormGroup for simple text input.
  
  
  2. FORMULA MODE (New Feature)
     ==========================
     <HeaderNameField
       :display-value="resolvedFormula"
       :edit-value="item.nameFormula"
       field-path="data.nameFormula"
       use-formula
       formula-label="Item Display Name"
       formula-hint="Use #self.material, #self.quality, etc."
     />
     
     Benefits:
     - Users can write dynamic formulas: "Iron (+#self.bonus) Longsword"
     - View mode shows computed result: "Iron (+1) Longsword"
     - Edit mode shows formula with intellisense
     - Autocomplete suggests available properties
  
  
  3. BUILDING THE INTELLISENSE CONTEXT
     ==================================
     HeaderNameField automatically builds the context from:
     
     - self: All properties of the document (item/effect/actor)
       Functions flatten up to 3 levels deep
       Examples: #self.name, #self.material.bonus, #self.owner.level
     
     - owner: All properties of the parent actor (if any)
       Examples: #owner.abilities.str.mod, #owner.skills.perception
     
     - target: Available target properties (empty by default)
     
     Aliases make properties more discoverable:
     - "self" → ["item", "effect", "document"]
     - "owner" → ["actor", "character"]
  
  
  4. PROPERTY FLATTENING ALGORITHM
     =============================
     The flattenObject() function converts nested data structures:
     
     Input: { material: { bonus: 1, name: 'Iron' } }
     Output:
       material: {
         bonus: { display: 'Bonus', value: '1', type: 'number' },
         name: { display: 'Name', value: 'Iron', type: 'string' }
       }
     
     Max recursion depth: 3 levels
     Skipped:
     - Private properties (starting with _ or $)
     - Arrays and functions
     - Null values
  
  
  5. FORMULA EXAMPLES
     ================
     
     Weapon Naming:
       "Iron Sword" or "#self.material.name Sword"
       → Shows: "Iron Sword"
     
     With Quality/Bonus:
       "#self.material.name (#self.bonus ac)"
       → Shows: "Iron (+1 ac)"
     
     Character-based:
       "#owner.name's #self.type"
       → Shows: "Gandalf's Staff"
     
     Complex:
       "#self.quality #self.material.name #self.type (+#owner.bonuses.craft)"
       → Shows: "Masterwork iron dagger (+2)"
  
  
  6. KEYBOARD SHORTCUTS IN FORMULA MODE
     ===================================
     While editing a formula:
     
     - Type #            → Trigger intellisense/autocomplete
     - ↑/↓              → Navigate suggestions
     - Tab / Enter       → Select highlighted suggestion
     - Esc              → Close autocomplete menu
     - Hover            → See computed value in tooltip
  
  
  7. ERROR HANDLING
     ===============
     If a formula has errors (invalid property names):
     
     - Invalid variable highlighted in red: #self.invalid
     - Error tooltip shows: "Property 'invalid' not found"
     - View mode shows: "[Error: invalid property]"
     - Document still saves safely (formula is plain text)
  
  
  8. PARENT COMPONENT INTEGRATION
     =============================
     
     // In your sheet component:
     <template>
       <HeaderNameField
         :display-value="item.displayName"
         :edit-value="item.nameFormula"
         field-path="data.nameFormula"
         use-formula
         :show="canShowNameFormula"
       />
     </template>
     
     <script setup>
       const item = computed(() => game.items.get(itemId));
       
       // Show formula field only for certain item types
       const canShowNameFormula = computed(() => 
         ['weapon', 'armor'].includes(item.value?.type)
       );
     </script>
  
  
  9. REACTIVE CONTEXT UPDATES
     =========================
     HeaderNameField reactively rebuilds the intellisense context when:
     - Document data changes
     - Parent actor changes
     - Field path references different document
     
     This means users see updated suggestions as document properties change
     and tooltips show current computed values.
  
  
  10. PERFORMANCE CONSIDERATIONS
      ==========================
      - Context flattening happens on initial render
      - Validation runs on keystroke (no debounce by default)
      - For large documents (100+ properties), consider adding debounce:
        
        watch(() => editValueUnwrapped.value, () => {
          debounce(() => validateFormula(), 500);
        });
  
  
  ADVANCED: Custom Intellisense Contexts
  =======================================
  
  If you need custom contexts beyond self/owner/target, extend:
  
    const intellisenseContext = computed((): IntellisenseContext => {
      return {
        self: { properties: flattenObject(document.data), aliases: ['item'] },
        owner: { properties: flattenObject(actor.data), aliases: ['actor'] },
        target: { properties: buildTargetContext(), aliases: ['victim'] },
        // Add custom context:
        party: {
          properties: flattenObject(getPartyData()),
          aliases: ['group', 'team']
        }
      };
    });
  
  
  TESTING
  =======
  
  import { mount } from '@vue/test-utils';
  import HeaderNameField from './HeaderNameField.vue';
  
  test('formula mode integrates FormulaFormGroup', () => {
    const wrapper = mount(HeaderNameField, {
      props: {
        displayValue: 'test',
        editValue: '#self.name',
        fieldPath: 'formula',
        useFormula: true,
      },
      global: { stubs: { FormulaFormGroup: true } }
    });
    
    expect(wrapper.findComponent({ name: 'FormulaFormGroup' }).exists()).toBe(true);
  });
-->
