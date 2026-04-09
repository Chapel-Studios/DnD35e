# FormulaFormGroup Component - Feature Planning

## Overview

**Objective**: Create a Vue component (`FormulaFormGroup.vue`) that enables rich formula editing with intelligent variable suggestions, syntax highlighting, and inline value previews.

**Problem Solved**: 
- Users currently use basic text fields for formulas without guidance on available variables
- System-wide formulas need context awareness (self, owner, target)
- No way to preview computed values inline
- Users may confuse d35e formula syntax with Foundry's native `@` syntax

**Solution**: 
- New component that uses `#` prefix for context-aware variables
- Intellisense autocomplete for available properties
- Visual highlighting of variables with hover tooltips
- Separate edit vs. view modes (edit shows formula, view shows computed result)

---

## Architecture

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ Sheet Document (Item/ActiveEffect/etc)                  │
│ - Contains formula field, owns data                      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ ParentFormComponent (e.g., HeaderNameField)             │
│ - Builds: IntellisenseContext from available parents    │
│ - Validates: Paths exist in actual parent data          │
│ - Displays: Warning icons for invalid paths             │
│ - Injects: availableContexts into FormulaFormGroup      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ FormulaFormGroup.vue (This Component)                    │
│ - Input field with contenteditable div                  │
│ - Intellisense autocomplete on # trigger                │
│ - Tooltips with computed values on hover                │
│ - Error highlighting for invalid variables              │
│ - Conditional render: edit mode vs view mode            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ FormGroup.vue (Existing)                                │
│ - Label + hint display                                  │
│ - DM-only flag handling                                 │
│ - Disabled state                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Type Definitions

### IntellisenseProperty
Represents a single resolvable variable value (leaf node in the intellisense tree).

```typescript
interface IntellisenseProperty {
  display?: string;           // Localized label (e.g., "Hardness", "Rarity")
  value: string | number;     // Current computed value (e.g., 10, "common")
  type: 'string' | 'number';  // Type determines what operations can be performed
  description?: string;       // Optional tooltip additional info (future enhancement)
}
```

**Example**:
```typescript
{
  hardness: {
    display: "Hardness",
    value: 10,
    type: 'number'
  },
  rarity: {
    display: "Rarity",
    value: "common",
    type: 'string'
  }
}
```

### IntellisenseObject
Represents a nested structure of properties (can be a leaf IntellisenseProperty or branch object).

```typescript
interface IntellisenseObject {
  [propertyPath: string]: IntellisenseProperty | IntellisenseObject;
}
```

**Example**:
```typescript
{
  hardness: { display: "Hardness", value: 10, type: 'number' },
  rarity: { display: "Rarity", value: "common", type: 'string' },
  attackDetails: {
    damageDie: { display: "Damage Die", value: 6, type: 'number' },
    damageType: { display: "Damage Type", value: "slashing", type: 'string' }
  }
}
```

### ContextSchema
Metadata for a single context (each context is one grouping like "self", "owner", "target").

```typescript
interface ContextSchema {
  properties: IntellisenseObject;
  aliases?: string[];         // e.g., ["item", "weapon"] — only suggest these aliases
}
```

### IntellisenseContext
The complete intellisense map passed to FormulaFormGroup.

```typescript
interface IntellisenseContext {
  [contextName: string]: ContextSchema;
}
```

**Full Example** (Material with Weapon owner):
```typescript
const availableContexts: IntellisenseContext = {
  self: {
    properties: {
      hardness: { display: "Hardness", value: 10, type: 'number' },
      rarity: { display: "Rarity", value: "common", type: 'string' },
      attackDetails: {
        damageDie: { display: "Damage Die", value: 6, type: 'number' }
      }
    }
  },
  owner: {
    properties: {
      ac: { display: "Armor Class", value: 12, type: 'number' },
      damageDie: { display: "Damage Die", value: 6, type: 'number' },
      attackBonus: { display: "Attack Bonus", value: 2, type: 'number' }
    },
    aliases: ["item", "weapon"]  // Suggest only "item" or "weapon", not "owner"
  }
  // Note: "target" omitted because not applicable to this formula context
};
```

**Material with no parent** (defaults merged from DefaultWeaponDetails + DefaultArmorDetails):
```typescript
const availableContexts: IntellisenseContext = {
  self: { /* ... */ },
  owner: {
    properties: {
      // Merged defaults — AC from armor, damageDie from weapon, etc.
      // All values would be null or placeholder defaults
      ac: { display: "Armor Class", value: null, type: 'number' },
      damageDie: { display: "Damage Die", value: null, type: 'number' }
    },
    aliases: ["item"]
  }
};
```

---

## Component Props

```typescript
interface FormulaFormGroupProps {
  // Labels & hints
  label?: string;              // e.g., "Material Name Formula"
  hint?: string;               // e.g., "Use #self.property or #owner.property"
  isDmOnly?: boolean;          // DM-only field flag
  
  // Data & callbacks
  value: string;               // The formula string: "Silver (+#self.hardness AC)"
  onUpdate: (value: string) => void;  // Called when formula changes
  
  // Component state
  disabled?: boolean;          // Override store editable state if needed
  
  // Intellisense data
  availableContexts: IntellisenseContext;  // All available variables + values
}
```

---

## Formula Syntax

### Format
- **Trigger**: `#` character
- **Contexts**: `self`, `owner`, `target`, or any aliases defined in ContextSchema
- **Access**: Dot notation: `#context.property.nested.path`

### Valid Examples
```
#self.hardness                      → number: 10
#self.rarity                        → string: "common"
#owner.ac                           → number: 12
#owner.abilities.str.mod            → number: 3
#item.damageDie                     → number: 6 (using alias)
Silver (+#self.hardness AC)         → Mixed text and variable
#owner.name had #self.rarity ore    → Multiple variables in one formula
```

### Invalid Examples
```
#nonexistent.path                   → Error: context "nonexistent" not found
#self.invalid                       → Error: property "invalid" not found
@self.property                      → Error: uses @ instead of # (highlight as educational)
##self.property                      → Error: double trigger
```

---

## Behavior: Edit Mode vs View Mode

### Edit Mode (`isEditable = true`)

**Visual Structure**:
```
┌─────────────────────────────────────────────────────┐
│ [Label Text]  [⚠ Error Icon]                        │  ← Only if label or errors
├─────────────────────────────────────────────────────┤
│ Silver (+[#self.hardness] AC)                        │  ← contenteditable div (styled like input)
│                  ↑ hover here                        │
│              ┌─────────────┐                         │
│              │ Hardness    │                         │
│              │ Value: 10   │                         │
│              └─────────────┘                         │
├─────────────────────────────────────────────────────┤
│ ┌─ Intellisense Dropdown (appears below on #)       │
│ ├─ hardness    10                                   │
│ ├─ rarity      common                               │
│ │ ┌─ attackDetails ▶ (has children — press → or .)
│ │ │ ├─ damageDie   6                               │
│ │ │ └─ damageType  slashing                        │
│ └─────────────────────────────────────────────────┘
```

**User Interactions**:
1. **Type `#`** → Shows available contexts (self, owner, target/aliases)
2. **Type `#self.`** → Shows all properties available under self
3. **Type `#self.har`** → Filters to matching properties (hardness)
4. **Press Tab** → Completes to `#self.hardness` and closes dropdown
   - If property is a branch (has children), stays open for chaining
   - If property is a leaf (IntellisenseProperty), closes dropdown
5. **Hover over `#variable`** → Tooltip shows: `"PropertyDisplay: value"`
6. **Continue typing `.`** → Reopens dropdown for next level
7. **Invalid path** → Variable highlights in red with error icon in label

**Contenteditable Implementation**:
- Each `#variable` wrapped in `<span class="formula-variable">`
- Allows individual styling per variable
- Markdown-like rendering but editable

### View Mode (`isEditable = false`)

**Visual Structure**:
```
┌─────────────────────────────────────────────────────┐
│ Silver (+10 AC)                                     │  ← Plain div, computed values substituted
└─────────────────────────────────────────────────────┘
```

**Behavior**:
- Formula rendered as plain text with all `#variables` resolved to their actual values
- No interaction, no tooltips
- Allow parent to style with `:deep()` CSS

---

## Intellisense & Autocomplete

### Trigger Logic
- **On `#` typed**: Show available contexts
  - If already in a context (e.g., `#self`), suggest that context's properties
  - Otherwise show all top-level contexts
  
- **On `.` after context**: Show properties under that context
  - Filter out functions, private fields (_prefixed)
  - Show `IntellisenseProperty` items + branch objects separately
  
- **On `.` after branch object**: Recursively show nested properties

### Display Format
```
[Display Name]  [Value/Type Indicator]
├─ hardness               10
├─ rarity                 common
└─ attackDetails    ▶ (object, press . or → to expand)
```

### Tab Completion
- **Completed property** → Insert full path and close dropdown
- **Branch object** → Insert path + `.` and keep dropdown open
- **Typed partial match** → Complete to nearest match

### Filtering
- Hide private properties (`_*`)
- Hide function properties (only expose getters/properties with values)
- Respect system-defined exceptions (can be added later)

---

## Error Handling & Validation

### Validation Errors
1. **Invalid context**: `#nonexistent.property`
   - Error: "Context 'nonexistent' not found"
   - Highlight: Red background on entire variable
   
2. **Invalid property**: `#self.invalidProp`
   - Error: "Property 'invalidProp' not found on self"
   - Highlight: Red background on entire variable
   
3. **Nested property missing**: `#owner.abilities.invalid.mod`
   - Error: "Property 'invalid' not found on owner.abilities"
   - Highlight: Red background

4. **Using @-syntax instead of #**
   - Warning: "Did you mean #self.property? Use # for system variables, @ for Foundry rolls"
   - Light yellow highlight (educational, not critical error)

### Error Display
- **Icon location**: `[Label] [⚠]` — in label area, outside input
- **Input border**: Red border + 2px (when errors exist)
- **Per-variable highlighting**: Red background on each broken variable
- **Tooltip**: Hover over broken variable shows: `"[PropertyName]: Property not found"` in red text
- **Validation timing**: 
  - On blur (after user finishes typing)
  - On change (document updates)
  - Not on every keystroke (too noisy)

---

## Tooltip System

### Hover Behavior
1. **User hovers over `#variable`**: 
   - Tooltip appears near cursor or variable
   - Shows: `"[Display Name]: [Value]"`
   
2. **Multiple variables in formula**:
   - Each variable has independent hover zone
   - Only hovered variable shows tooltip
   - Previous tooltip dismisses
   
3. **Error state**:
   - Broken variable shows: `"[PropertyName]: Property not found"` in red

### Tooltip Display Format
```
┌──────────────────────┐
│ Hardness             │
│ Value: 10            │
└──────────────────────┘
```

Or if error:
```
┌──────────────────────┐
│ hardness             │
│ Property not found   │  ← Red text
└──────────────────────┘
```

### Tooltip Positioning
- Prefer above/below variable
- Fall back to side if space constrained
- Dismiss on mouse leave

---

## Visual Styling

### Contenteditable Container
```scss
.formula-editable-input {
  border: 1px solid #ccc;
  padding: 0.5rem;
  font-family: monospace;
  border-radius: 4px;
  min-height: 2.5rem;
  outline: none;
  
  &:focus {
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
  }
  
  &.has-errors {
    border-color: #d32f2f;
    border-width: 2px;
  }
}
```

### Variable Spans
```scss
.formula-variable {
  padding: 2px 4px;
  border-radius: 2px;
  transition: background-color 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background-color: rgba(25, 118, 210, 0.1);  // Light blue
  }
  
  &.is-error {
    background-color: rgba(211, 47, 47, 0.15);  // Light red
    color: #d32f2f;
    border-bottom: 2px wavy #d32f2f;
  }
}
```

### Label Group (with icon)
```scss
.formula-label-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  
  .formula-label {
    font-weight: 500;
  }
  
  .formula-error-icon {
    color: #d32f2f;
    font-size: 1.2rem;
    font-weight: bold;
  }
}
```

### Autocomplete Dropdown
```scss
.formula-autocomplete {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  
  .autocomplete-item {
    padding: 0.5rem;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    &:hover {
      background-color: #f5f5f5;
    }
    
    .option-name {
      font-weight: 500;
    }
    
    .option-value {
      font-size: 0.85em;
      color: #666;
      margin-left: 1rem;
    }
  }
}
```

---

## Implementation Details

### Core Methods

#### `parseFormula(formula: string): Token[]`
Splits formula into text and variable tokens.

```typescript
interface Token {
  type: 'text' | 'variable';
  value: string;
  startIndex: number;
  endIndex: number;
}

// Input: "Silver (+#self.hardness AC)"
// Output: [
//   { type: 'text', value: 'Silver (+' },
//   { type: 'variable', value: '#self.hardness' },
//   { type: 'text', value: ' AC)' }
// ]
```

#### `renderFormulaHTML(tokens: Token[], validation: ValidationMap): string`
Converts tokens to HTML with error highlighting.

```typescript
// Returns: "Silver (+<span class='formula-variable'>#self.hardness</span> AC)"
// If error: "Silver (+<span class='formula-variable is-error'>#self.hardness</span> AC)"
```

#### `resolveFormula(formula: string, context: IntellisenseContext): string`
Substitutes variables with computed values for view mode.

```typescript
// Input: "Silver (+#self.hardness AC)", context = { self: { hardness: { value: 10 } } }
// Output: "Silver (+10 AC)"
```

#### `validateFormula(formula: string, context: IntellisenseContext): ValidationError[]`
Checks all variables against available paths.

```typescript
interface ValidationError {
  variable: string;           // "#self.invalid"
  context: string;            // "self"
  path: string[];             // ["invalid"]
  error: string;              // "Property 'invalid' not found on self"
  severity: 'error' | 'warning';
}
```

#### `getAutocompleteOptions(input: string, context: IntellisenseContext): AutocompleteOption[]`
Generates suggestions based on current cursor position.

```typescript
interface AutocompleteOption {
  path: string;               // "hardness" or "attackDetails"
  display: string;            // "Hardness" (localized)
  value: string | number | null;
  isLeaf: boolean;            // true if IntellisenseProperty, false if branch
}

// Input: "#self." (cursor after dot)
// Output: All properties under self, sorted alphabetically
```

#### `extractVariableAtPosition(formula: string, position: number): {variable: string, range: [start, end]}?`
Finds the variable under cursor for hover tooltip.

```typescript
// Input: "Silver (+#self.hardness AC)", position = 15 (within variable)
// Output: { variable: "#self.hardness", range: [10, 26] }
```

### Data Flow

```
User types in contenteditable
    ↓
@input event → Extract plain text
    ↓
parseFormula() → Token[]
    ↓
validateFormula() → ValidationError[]
    ↓
Compute availableContexts → IntellisenseContext
    ↓
renderFormulaHTML() → Update contenteditable with spans
    ↓
onUpdate(plainText) → Emit to parent
    ↓
Parent validates and resolves values
    ↓
Re-render with updated availableContexts
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Define TypeScript interfaces
- [ ] Create FormulaFormGroup.vue scaffold
- [ ] Implement `parseFormula()` and `resolveFormula()`
- [ ] Implement basic view mode (display computed values)
- [ ] Add error validation

### Phase 2: Edit Mode Core
- [ ] Implement contenteditable input with span rendering
- [ ] Wire up `onInput` and `onChange`
- [ ] Add red highlight for errors
- [ ] Implement error icon display

### Phase 3: Intellisense
- [ ] Implement `getAutocompleteOptions()`
- [ ] Build autocomplete dropdown
- [ ] Add trigger on `#` character
- [ ] Implement filtering and chaining

### Phase 4: Polish
- [ ] Add hover tooltips
- [ ] Implement tab completion
- [ ] Add tooltip positioning logic
- [ ] Refine styling and UX
- [ ] Add accessibility (ARIA labels, keyboard nav)

### Phase 5: Integration
- [ ] Create HeaderNameField.vue integration (or similar parent)
- [ ] Build context schema builder for Items/Effects
- [ ] Add default schemas for document types
- [ ] Testing & QA

---

## Future Enhancements

1. **Syntax validation**: Warn if formula contains invalid operators alongside variables
2. **Type checking**: Warn if trying to do string operations on numbers (e.g., `#self.hardness + "hello"`)
3. **Cross-document variables**: Support linking to other items/actors
4. **Custom functions**: Allow system to register custom roll functions (`#ceil()`, `#floor()`, etc.)
5. **Variable history**: Remember recently used variables
6. **Dark mode**: Adapt colors for dark theme
7. **Accessibility**: Full keyboard navigation without mouse
8. **Localization**: Display names pulled from i18n files

---

## Testing Strategy

### Unit Tests
- `parseFormula()` with various input formats
- `resolveFormula()` with nested properties
- `validateFormula()` error detection
- `getAutocompleteOptions()` filtering

### Integration Tests
- Edit mode → View mode transition
- Parent passing `availableContexts` → Component receives updates
- Error state → Icon appears + border changes
- Hover → Tooltip shows correct value

### Manual Testing
- Type various formulas and verify autocomplete
- Tab completion through nested objects
- Hover over each variable type
- Verify error highlighting
- Test on mobile/touch devices
- Keyboard-only navigation

---

## Notes & Assumptions

1. **Store Injection**: FormulaFormGroup injects `documentSheetStore` like TextFormGroup
2. **Parent Responsibility**: Parent component (e.g., HeaderNameField) builds `availableContexts` and passes down
3. **Null Handling**: Parent handles null/undefined values before building context schema
4. **Localization**: Display names come from `availableContexts.display` property (parent manages i18n)
5. **Performance**: Validation runs on blur, not every keystroke
6. **Backward Compat**: If formula lacks `#`, treat as plain text (no intellisense)

---

**Document Version**: 1.0  
**Created**: 2026-02-28  
**Last Updated**: 2026-02-28  
**Status**: Ready for Implementation - Phase 1
