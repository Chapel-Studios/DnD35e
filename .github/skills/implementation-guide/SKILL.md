---
name: implementation-guide
description: "Step-by-step workflows for adding new item types, mechanics, compendium entries, and features from planning to code."
---

# Implementation Guide Skill

## Using This Skill

Ask questions like:
- "How do I add a new item type?"
- "What steps to implement a new mechanic?"
- "How do I add data to an existing item type?"
- "What's the process for compendium entries?"
- "How do I implement a spell that needs special handling?"

This skill helps you:
- **Follow systematic steps** for adding features
- **Understand what changes** in each layer (schema, sheet, mechanics)
- **Test thoroughly** at each phase
- **Organize workflow** to avoid rework

## Phase: Add a New Item Type

### Step 1: Define the Schema

**File**: `src/module/system/item/data-models.mjs` or equivalent

```typescript
import { ItemDataModel } from './_item-data-model.mjs';
import { FormulaFamiliar } from '...fields/index.mjs';

class SpecialWeapon extends ItemDataModel {
  static defineSchema() {
    return foundry.utils.mergeObject(super.defineSchema(), {
      // Add custom properties
      properties: new SchemaField({
        specialAbility: new StringField({ initial: 'none' }),
        saveDC: new NumberField({ min: 0, initial: 10 }),
        specialEffect: new FormulaFamiliar({ label: "Effect Formula" }),
      }),
    });
  }
  
  // Optional: computed properties
  get effectiveSpecialAbility() {
    return this.properties.specialAbility;
  }
}
```

**Checklist**:
- [ ] Extend from appropriate parent model
- [ ] Override `defineSchema()` call super first
- [ ] Use plain Foundry DataFields and fieldBuilders helpers
- [ ] Formulas use `FormulaFamiliar`
- [ ] All fields have `initial` or `required: false`

### Step 2: Register the Type

**File**: `system.json` or type registration code

```typescript
// If using system.json (Phase 4)
{
  "Item": {
    "types": ["weapon", "specialWeapon"], // Add new type
    "specialized": {
      "specialWeapon": {
        "class": "SpecialWeapon",
        "dataModel": "SpecialWeapon"
      }
    }
  }
}

// Or dynamic registration
CONFIG.Item.documentClass.register('specialWeapon', SpecialWeapon);
```

### Step 3: Create Sheet Component

**File**: `src/vue/sheets/item/special-weapon-sheet.vue`

```vue
<script setup>
import ItemSheetBase from './item-sheet-base.vue';
import FormGroupSection from '../../form/form-group-section.vue';
import StringFormGroup from '../../form/string-form-group.vue';
import NumberFormGroup from '../../form/number-form-group.vue';
import FormulaFormGroup from '../../form/formula-form-group.vue';

defineProps({ documentSheet: Object });
const emit = defineEmits(['update']);

const handleUpdate = (path, value) => {
  emit('update', { [path]: value });
};
</script>

<template>
  <ItemSheetBase :document-sheet="documentSheet">
    <FormGroupSection label="Special Abilities" field-path="system.properties">
      <StringFormGroup 
        label="Ability" 
        :value="documentSheet.system.properties.specialAbility"
        field-path="system.properties.specialAbility"
        @update="(val) => handleUpdate('system.properties.specialAbility', val)"
      />
      
      <NumberFormGroup 
        label="Save DC" 
        :value="documentSheet.system.properties.saveDC"
        field-path="system.properties.saveDC"
        :min="0"
        @update="(val) => handleUpdate('system.properties.saveDC', val)"
      />
      
      <FormulaFormGroup 
        label="Effect" 
        :value="documentSheet.system.properties.specialEffect"
        field-path="system.properties.specialEffect"
        @update="(val) => handleUpdate('system.properties.specialEffect', val)"
      />
    </FormGroupSection>
  </ItemSheetBase>
</template>
```

**Checklist**:
- [ ] Extends ItemSheetBase or appropriate parent
- [ ] Imports and uses FormGroup components
- [ ] Handles all custom properties
- [ ] Uses field-path for permissions/view mode
- [ ] Emits 'update' events properly

### Step 4: Add Compendium Entry (If Core Content)

**File**: `packs/items-special-weapons.json` or database pack

```json
[
  {
    "_id": "special-weapon-01",
    "name": "Frost Blade",
    "type": "specialWeapon",
    "data": {
      "properties": {
        "specialAbility": "frost",
        "saveDC": 15,
        "specialEffect": "2d6 + #context.enhancement"
      }
    }
  }
]
```

Or import via script:

```typescript
const item = await Item.create({
  name: "Frost Blade",
  type: "specialWeapon",
  system: {
    properties: {
      specialAbility: "frost",
      saveDC: 15,
      specialEffect: "2d6 + #context.enhancement"  // #context.X syntax resolves from evaluation scope
    }
  }
});

// Add to compendium pack
await game.packs.get('dnd35e.items-special-weapons').importDocument(item);
```

**Checklist**:
- [ ] Compendium pack exists or create new
- [ ] All required fields set
- [ ] Formulas are valid syntax
- [ ] Entry tested in game

### Step 5: Test Schema & Type

```typescript
// Test: Can create item of new type
const item = await Item.create({
  name: "Test",
  type: "specialWeapon"
});

// Test: Can access schema fields
console.assert(item.system.properties.specialAbility !== undefined);

// Test: Can update fields
await item.update({ 'system.properties.specialAbility': 'fire' });

// Test: Sheet renders
item.sheet.render(true);

// Test: Formulas evaluate
const scope = { enhancement: 1 };
const result = await item.system.formula('properties.specialEffect', scope);
console.assert(result > 0);
```

## Phase: Add Mechanic (e.g., "Defensive Stance")

### Step 1: Define Mechanic Rules

Document what "Defensive Stance" does:
- Grants +2 AC bonus
- Lasts 1 round
- Ends if you move
- Can be toggled each turn
- Stacks with shield bonus but not other AC bonuses

### Step 2: Choose Implementation Method

**Option A**: Active Effect (Simple, reusable)
```typescript
// Already built-in, GM just creates AE with changes
// changes: [{ key: "system.ac.base", mode: "ADD", value: 2 }]
```

**Option B**: Character Sheet Toggle (Complex, custom logic)
```typescript
// Add to actor schema
class Character extends ActorDataModel {
  static defineSchema() {
    return {
      defenses: new SchemaField({
        defensiveStance: new BooleanField({ initial: false })
      })
    };
  }
  
  // Get AC bonus from stance
  get defensiveStanceBonus() {
    return this.defenses.defensiveStance ? 2 : 0;
  }
}
```

**Option C**: Feat or Feature (Role-based)
```typescript
// Add to item type "Feature"
// "Defensive Stance" replaces the feature name
// Feature grants active effect via component chain
```

### Step 3: Implement in Schema Layer

Add to actor data model if not in Option A:

```typescript
class Character extends ActorDataModel {
  static defineSchema() {
    return foundry.utils.mergeObject(super.defineSchema(), {
      defenses: new SchemaField({
        defensiveStance: new BooleanField({ initial: false }),
      }),
    });
  }
}
```

### Step 4: Add UI (Sheet Component)

```vue
<script setup>
import FormGroupSection from '../../form/form-group-section.vue';
import ToggleFormGroup from '../../form/toggle-form-group.vue';

const emit = defineEmits(['update']);
</script>

<template>
  <FormGroupSection label="Defenses" field-path="system.defenses">
    <ToggleFormGroup
      label="Defensive Stance"
      :value="character.system.defenses.defensiveStance"
      field-path="system.defenses.defensiveStance"
      @update="(val) => emit('update', { 'system.defenses.defensiveStance': val })"
    />
  </FormGroupSection>
</template>
```

### Step 5: Add Mechanics (Derived Values)

```typescript
// In ActorDataModel
get totalAC() {
  const base = this.ac.base || 10;
  const defensiveBonus = this.defenses.defensiveStance ? 2 : 0;
  const aoeBonus = this.getActiveEffectBonus('ac');
  return base + defensiveBonus + aoeBonus;
}

// Or in getter if it's computed during render
get acBonuses() {
  return {
    base: this.ac.base,
    defensive: this.defenses.defensiveStance ? 2 : 0,
    effects: this.getActiveEffectBonus('ac'),
  };
}
```

### Step 6: Test Implementation

```typescript
// Create test actor
const actor = await Actor.create({ name: "Test", type: "character" });

// Test: Can toggle stance
await actor.update({ 'system.defenses.defensiveStance': true });
console.assert(actor.system.defenses.defensiveStance === true);

// Test: AC changes
const baseAC = actor.totalAC;
await actor.update({ 'system.defenses.defensiveStance': true });
const stanceAC = actor.totalAC;
console.assert(stanceAC === baseAC + 2);

// Test: UI renders
actor.sheet.render(true);
```

## Phase: Add Compendium Entries

### For Simple Items

**Workflow**:
1. Create item via sheet
2. Edit data as needed
3. Right-click item → "To Compendium"
4. Select pack
5. Item added to `.db` file

### For Complex Entries (With Relationships)

```typescript
// Use script to batch import
const entries = [
  {
    name: "Longsword",
    type: "weapon",
    system: { damageFormula: "1d8+@str.mod" }
  },
  {
    name: "Armor Proficiency (Light)",
    type: "feat",
    system: { level: 1 }
  }
];

for (const entry of entries) {
  const doc = await Item.create(entry);
  await game.packs.get('dnd35e.weapons').importDocument(doc);
}
```

## Workflow Checklists

### New Item Type (Complete)
- [ ] Schema defined in data model
- [ ] Type registered in system.json
- [ ] Sheet component created
- [ ] FormGroups cover all properties
- [ ] Tested: create, update, render sheet
- [ ] Added to compendium (if core content)

### New Mechanic
- [ ] Rules documented
- [ ] Implementation approach chosen
- [ ] Schema fields added to actor/item
- [ ] UI components added to sheet
- [ ] Derived values computed correctly
- [ ] Tested with typical use cases

### New Compendium Entries
- [ ] Pack exists or created
- [ ] Entries use schema correctly
- [ ] All required fields set
- [ ] Formulas validated
- [ ] Tested ingame use

## Related Skills

- **foundry-reference**: API details for each step
- **phase-reference**: Which phase covers this feature
- **system-comparison**: How other systems handle similar
