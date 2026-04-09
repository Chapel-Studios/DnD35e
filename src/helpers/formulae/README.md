# FormulaFormGroup Component Documentation

## Overview

**FormulaFormGroup** is a Vue 3 component that provides an interactive formula editor with intellisense support for the d35e system. It enables users to write dynamic formulas using a custom `#context.property` syntax, with real-time validation, autocomplete suggestions, and computed value previews.

## Features

✨ **Complete Feature Set:**
- 📝 **Formula Editor** - Contenteditable input with variable highlighting
- 🎯 **Intellisense** - Context-aware autocomplete suggestions  
- ✅ **Validation** - Real-time error detection and reporting
- 👁️ **Tooltips** - Hover over variables to see computed values
- 🎨 **Styled UI** - Modern, polished appearance with animations
- ⌨️ **Keyboard Navigation** - Arrow keys, Tab, Enter support
- 🔍 **Smart Filtering** - Intelligent suggestion ordering
- 📊 **Dual Modes** - View mode shows computed results, edit mode for formula entry

## Installation & Import

```typescript
// Option 1: Import specific components
import { FormulaFormGroup, parseFormula, resolveFormula } from '@helpers/formulae/index.mjs';

// Option 2: Import all exports
import * as FormulaeSystem from '@helpers/formulae/index.mjs';
```

## Basic Usage

### Simple Example

```vue
<template>
  <FormulaFormGroup
    label="Weapon Damage"
    hint="Use #self.diceFormula or #owner.bonuses.damage"
    :value="formula"
    :available-contexts="intellisenseContext"
    @onUpdate="formula = $event"
  />
</template>

<script setup lang="ts">
  import { FormulaFormGroup, type IntellisenseContext } from '@helpers/formulae/index.mjs';
  import { ref } from 'vue';

  const formula = ref('2d6 + #self.bonus');

  const intellisenseContext: IntellisenseContext = {
    self: {
      properties: {
        bonus: { value: 3, type: 'number' },
        diceFormula: { value: '2d6', type: 'string' },
      },
    },
    owner: {
      properties: {
        bonuses: {
          damage: { value: 2, type: 'number' },
        },
      },
      aliases: ['actor'],
    },
  };
</script>
```

## API Reference

### Component Props

```typescript
interface FormulaFormGroupProps {
  /** Label displayed above the field (localization key) */
  label?: string;
  
  /** Hint text shown below the field (localization key) */
  hint?: string;
  
  /** The formula value (e.g., "Silver (+#self.hardness AC)") */
  value: string;
  
  /** Callback when formula changes */
  onUpdate: (value: string) => void;
  
  /** Whether the field is disabled (overrides store state) */
  disabled?: boolean;
  
  /** DM-only visibility flag */
  isDmOnly?: boolean;
  
  /** Intellisense context with all available variables */
  availableContexts: IntellisenseContext;
}
```

### Formula Syntax

Variables use the `#context.property.nested` syntax:

```
#self.damage              References self.damage property
#owner.abilities.str.mod  Nested property access
#target.ac                Target context variable
#actor.level              Using alias instead of context name
```

### Type Definitions

#### IntellisenseContext

```typescript
// Map of context names to their schemas
interface IntellisenseContext {
  self: ContextSchema;
  owner: ContextSchema;
  target?: ContextSchema;
  [customContext: string]: ContextSchema;
}
```

#### ContextSchema

```typescript
interface ContextSchema {
  // Hierarchical object of available properties
  properties: IntellisenseObject;
  
  // Optional alternative names for this context (user-friendly)
  // Example: ["item", "weapon"] for the "self" context
  aliases?: string[];
}
```

#### IntellisenseProperty (Leaf Value)

```typescript
interface IntellisenseProperty {
  // Display label (can be localized)
  display?: string;
  
  // Current computed value
  value: string | number;
  
  // Value type
  type: 'string' | 'number';
  
  // Optional description for future enhancements
  description?: string;
}
```

#### IntellisenseObject

```typescript
// Recursive object tree
interface IntellisenseObject {
  [propertyPath: string]: IntellisenseProperty | IntellisenseObject;
}
```

## Utility Functions

### parseFormula

Parse a formula into tokens:

```typescript
import { parseFormula } from '@helpers/formulae/index.mjs';

const tokens = parseFormula('2d6 + #self.bonus');
// Returns: [
//   { type: 'text', value: '2d6 + ', startIndex: 0, endIndex: 6 },
//   { type: 'variable', value: '#self.bonus', startIndex: 6, endIndex: 17 }
// ]
```

### resolveFormula

Substitute variables with their values:

```typescript
import { resolveFormula } from '@helpers/formulae/index.mjs';

const context: IntellisenseContext = {
  self: {
    properties: {
      bonus: { value: 5, type: 'number' }
    }
  }
};

const resolved = resolveFormula('2d6 + #self.bonus', context);
// Returns: "2d6 + 5"
```

### validateFormula

Check for formula errors:

```typescript
import { validateFormula } from '@helpers/formulae/index.mjs';

const errors = validateFormula('#invalid.path', context);
// Returns: [
//   {
//     variable: '#invalid.path',
//     context: 'invalid',
//     path: ['path'],
//     error: 'Context "invalid" not found',
//     severity: 'error',
//     index: 0
//   }
// ]
```

### extractVariables

Get all variables from a formula:

```typescript
import { extractVariables } from '@helpers/formulae/index.mjs';

const vars = extractVariables('#self.hp + #owner.bonuses.all');
// Returns: [
//   { variable: '#self.hp', context: 'self', path: ['hp'], ... },
//   { variable: '#owner.bonuses.all', context: 'owner', path: ['bonuses', 'all'], ... }
// ]
```

### getAutocompleteOptions

Get suggestions for incomplete formula:

```typescript
import { getAutocompleteOptions } from '@helpers/formulae/index.mjs';

const options = getAutocompleteOptions('#self.bo', context);
// Returns suggestions starting with "bo"
// Sorted by relevance and alphabetically
```

## Real-World Examples

### Item Sheet Integration

```vue
<template>
  <div class="item-sheet">
    <FormulaFormGroup
      label="Item Formula"
      hint="Define dynamic item properties"
      :value="item.formula"
      :available-contexts="buildItemContext()"
      @onUpdate="updateItemField('formula', $event)"
    />
  </div>
</template>

<script setup lang="ts">
  import { FormulaFormGroup, type IntellisenseContext } from '@helpers/formulae/index.mjs';
  import { computed } from 'vue';

  const props = defineProps<{ documentId: string }>();
  const item = reactive(game.items.get(props.documentId));

  function buildItemContext(): IntellisenseContext {
    return {
      self: {
        properties: flattenItemData(item),
        aliases: ['item', 'weapon', 'armor'],
      },
      owner: {
        properties: item.actor ? flattenActorData(item.actor) : {},
        aliases: ['actor', 'character'],
      },
    };
  }

  function flattenItemData(item): any {
    // Recursively flatten item.data into property tree
    // Each leaf is an IntellisenseProperty
  }
</script>
```

### Active Effect Integration

```vue
<template>
  <div class="effect-editor">
    <!-- Formula for conditional activation -->
    <FormulaFormGroup
      label="Activation Condition"
      hint="When should this effect apply?"
      :value="effect.activation"
      :available-contexts="buildEffectContext()"
      @onUpdate="effect.activation = $event"
    />

    <!-- Formula for effect value -->
    <FormulaFormGroup
      label="Effect Value"
      hint="Dynamic effect calculation"
      :value="effect.value"
      :available-contexts="buildEffectContext()"
      @onUpdate="effect.value = $event"
    />
  </div>
</template>

<script setup lang="ts">
  function buildEffectContext(): IntellisenseContext {
    // Include both origin (who applied effect) and target (who has effect)
    return {
      source: {
        properties: flattenActorData(effect.origin),
        aliases: ['origin', 'caster'],
      },
      target: {
        properties: flattenActorData(effect.target),
        aliases: ['victim', 'affected'],
      },
      self: {
        properties: flattenEffectData(effect),
        aliases: ['effect'],
      },
    };
  }
</script>
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `#` | Trigger intellisense (type # to start) |
| `↑` / `↓` | Navigate autocomplete suggestions |
| `Tab` | Select current autocomplete option |
| `Enter` | Select current autocomplete option |
| `Escape` | Close autocomplete menu |
| Hover | Show tooltip with computed value |
| Click on #var | Select variable (triple-click selects all) |

## Styling & Customization

The component uses scoped SCSS with CSS variables for theming:

```scss
// Available for customization
$formula-bg-color: rgba(255, 255, 255, 0.04);
$formula-text-color: #d4d4d4;
$formula-accent-color: #66b3ff;
$formula-error-color: #ff6b6b;

// Override in your component:
:deep(.formula-input) {
  background: $custom-bg;
  color: $custom-text;
}
```

## Best Practices

### 1. Building Intellisense Context

**❌ Don't:** Hardcode contexts
```typescript
const context = {
  self: {
    properties: {
      damage: { value: 5, type: 'number' }
    }
  }
};
```

**✅ Do:** Build dynamically from document data
```typescript
function buildContext(item, actor) {
  return {
    self: {
      properties: flattenObject(item.data, getLeafPropertyInfo)
    },
    owner: {
      properties: flattenObject(actor.data, getLeafPropertyInfo)
    }
  };
}
```

### 2. Provide Useful Aliases

```typescript
{
  self: {
    properties: { ... },
    aliases: ['item', 'weapon', 'armor']  // Multiple names for users
  }
}
```

### 3. Include Display Labels

```typescript
damage: {
  display: 'Damage Modifier',  // User-friendly label
  value: 5,
  type: 'number'
}
```

### 4. Validate Resolved Values

```typescript
try {
  const resolved = resolveFormula(formula, context);
  // Use resolved in calculations
} catch (error) {
  console.error('Formula resolution failed:', error);
}
```

### 5. Handle Errors Gracefully

```typescript
const errors = validateFormula(formula, context);
if (errors.length > 0) {
  // Show errors to user
  // Don't save invalid formula
}
```

## Error Types

| Error | Cause | Example |
|-------|-------|---------|
| Context not found | Using undefined context name | `#invalid.prop` |
| Property not found | Path doesn't exist | `#self.nonexistent.path` |
| Invalid syntax | Malformed variable | `#self..prop` |

## Performance Considerations

- **Validation** runs on every input (debounce if needed)
- **Context building** should be efficient (avoid deep cloning)
- **Large contexts** (100+ properties) work fine but may show performance impact in autocomplete
- **Nested depths** > 5 levels deep are readable but uncommon

## Testing

```typescript
import { parseFormula, validateFormula, resolveFormula } from '@helpers/formulae/index.mjs';

describe('Formula System', () => {
  it('parses formulas correctly', () => {
    const tokens = parseFormula('text #var.path more');
    expect(tokens).toHaveLength(3);
    expect(tokens[1].type).toBe('variable');
  });

  it('validates formulas', () => {
    const errors = validateFormula('#self.invalid', emptyContext);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('resolves formulas', () => {
    const result = resolveFormula('#self.x', contextWithX5);
    expect(result).toBe('5');
  });
});
```

## Troubleshooting

### Autocomplete not showing
- Check that context has properties at current path
- Ensure properties are IntellisenseProperty objects with `value` and `type`
- Verify syntax: should be `#context.property` format

### Variables showing as errors
- Confirm property path exists in context
- Check nested objects are properly defined
- Use console logs to inspect context structure

### Tooltip not appearing
- Hover directly over the variable span (blue highlight)
- Tooltip appears above variable with computed value
- Only works in edit mode

### Performance issues
- Reduce context size if extremely large
- Consider debouncing validation for complex formulas
- Profile with Vue DevTools

## Future Enhancements

- 🚀 Formula caching for frequently used patterns
- 📦 Built-in formatters (number, currency, etc.)
- 🔄 Formula history/undo support
- 🎨 Dark/light theme variants
- 📖 Inline documentation system
- 🧮 Expression builder UI
- 🔐 Access control for contexts

## License

This component is part of the d35e system and follows the same licensing terms.

---

**Questions?** Check the examples.vue file or reach out to the d35e development team.
