---
description: "Use when implementing formulas, working with FormulaFamiliar, or computing derived values. Covers formula resolution, variable substitution, parsing, and caching patterns."
---

# FormulaFamiliar & Formula Resolution

## FormulaFamiliar Overview

`FormulaFamiliar` is a **DataField that interprets strings as formulae**. It:
- Stores the formula string in the document
- Lazy-parses to a parsed AST
- Evaluates with a scope object to get the result
- Caches parsed formulas and results for performance

Used for attack bonuses, damage dice, skill check formulas, etc.

## Core API

```typescript
import { FormulaFamiliar } from '...fields/compound-types/FormulaFamiliar.mjs';

// Field definition
class MyItem extends ItemDataModel {
  static defineSchema() {
    return {
      bonus: new FormulaFamiliar(),  // Stores formula string
    };
  }
}

// Usage
const item = myItem.system;
item.bonus = "2 + @dex.mod";  // Store formula string

// Evaluation
const scope = { dex: { mod: 3 } };
const result = await item.formula('bonus', scope);  // Returns 5
```

## Formula Syntax

Formulas use **dice notation + references**:

### Dice Notation
```
1d20        Regular d20 roll
2d6+3       Two d6 rolls plus 3
1d20h1      Roll 1d20, keep highest 1 (advantage-like)
3d6l1       Roll 3d6, drop lowest 1 (disadvantage-like)
```

### Variable References
```
@attr.mod       Substitute attribute modifier (dex, str, con, int, wis, cha)
@skill.active   Substitute skill data
@item.bonus     Reference to another item field
```

### Operators
```
+, -, *, /      Arithmetic
(, )            Grouping
```

## Scope Object Structure

Every formula evaluation needs a scope with required variables:

```typescript
interface FormulaScope {
  // Attributes
  str?: { mod: number; };
  dex?: { mod: number; };
  con?: { mod: number; };
  int?: { mod: number; };
  wis?: { mod: number; };
  cha?: { mod: number; };
  
  // Skills
  [skillName]?: {
    mod: number;
    ranks?: number;
  };
  
  // Item references
  [fieldPath]?: any;
}
```

**Example**:
```typescript
const scope = {
  dex: { mod: actor.system.abilities.dex.mod },
  str: { mod: actor.system.abilities.str.mod },
  weapon_enhancement: 1,  // From another item
};

const result = await item.system.formula('bonus', scope);
```

## Evaluation Patterns

### Pattern 1: Item Formula (No Evaluation)

Store formula string, evaluate when needed (lazy):

```typescript
class Weapon extends ItemDataModel {
  static defineSchema() {
    return {
      damageFormula: new FormulaFamiliar({ label: "Damage" }),
    };
  }
  
  async roll(actor) {
    const scope = this.getFormulaScope(actor);
    return this.system.formula('damageFormula', scope);
  }
  
  getFormulaScope(actor) {
    return {
      str: { mod: actor.system.abilities.str.mod },
      dex: { mod: actor.system.abilities.dex.mod },
      item_bonus: this.system.enhancement || 0,
    };
  }
}
```

### Pattern 2: Derived Value (Computed from Formula)

```typescript
class Character extends ActorDataModel {
  static defineSchema() {
    return {
      traits: new SchemaField({
        speedFormula: new FormulaFamiliar({ nullable: true }),
      }),
    };
  }
  
  get speed() {
    // Check cache first
    if (this._speedCache) return this._speedCache;
    
    // If no formula, use default
    if (!this.traits.speedFormula) return 30;
    
    // Evaluate formula
    const scope = this.getFormulaScope();
    this._speedCache = this.system.formula('traits.speedFormula', scope);
    return this._speedCache;
  }
  
  invalidateCache() {
    delete this._speedCache;
  }
}
```

### Pattern 3: Static Scope (No Actor Context)

Some formulas don't reference actor data:

```typescript
class Hazard {
  async getTriggerDamage() {
    // Formula stored: "2d6+5"
    return this.system.formula('triggerDamage', {});
  }
}
```

## Parsing & Caching

**FormulaFamiliar automatically**:
1. **Parses** the string to AST (once per unique formula string)
2. **Caches** the parsed AST (in memory)
3. **Evaluates** AST with provided scope

**Never cache results** — cache only parsed formulas. Results change per evaluation.

```typescript
// ❌ WRONG: Caching results
get bonus() {
  if (this._cachedBonus !== undefined) return this._cachedBonus;
  this._cachedBonus = await this.system.formula('bonus', scope);
  return this._cachedBonus;
}

// ✅ CORRECT: Formulas are already cached internally
async getBonus(scope) {
  return this.system.formula('bonus', scope);  // Cached parse, fresh eval
}
```

## Error Handling

FormulaFamiliar throws on invalid syntax:

```typescript
async function tryFormula(item, formula, scope) {
  try {
    const result = await item.system.formula('bonusFormula', scope);
    return result;
  } catch (err) {
    console.error(`Invalid formula "${formula}":`, err.message);
    return 0;  // Fallback
  }
}
```

**Common Errors**:
- Invalid syntax: `"1d20 + +3"` (double operator)
- Unknown reference: `"@missing.ref"` (scope doesn't have this)
- Type mismatch: `"@dex"` (should be `@dex.mod`)

## Formula Resolution in DataModels

When a DataField has a formula:

```typescript
class Item extends ItemDataModel {
  static defineSchema() {
    return {
      // Formula field
      bonus: new FormulaFamiliar({ label: "Bonus" }),
      
      // Regular field
      baseBonus: new NumberField({ initial: 0 }),
    };
  }
  
  async getTotalBonus(actor) {
    // Evaluate formula if set
    const formulaValue = this.bonus 
      ? await this.formula('bonus', this.getScope(actor))
      : 0;
    
    // Add static bonus
    return formulaValue + this.baseBonus;
  }
}
```

## Formula Scope Best Practices

### Build scope as object, not spread
```typescript
// ✅ GOOD: Clear what goes into scope
const scope = {
  str: { mod: actor.system.abilities.str.mod },
  dex: { mod: actor.system.abilities.dex.mod },
  item_bonus: item.system.bonus,
};

// ❌ AVOID: Spreading creates bloated, unclear scope
const scope = { ...actor.system, ...item.system };
```

### Document expected variables
```typescript
/**
 * Returns formula evaluation scope for weapon damage.
 * Expected formula variables:
 * - @str.mod: Strength modifier
 * - @item_enh: Item enhancement bonus
 * - @sneak: Sneak attack dice count (0 if not applicable)
 */
getFormulaScope(actor) {
  return {
    str: { mod: actor.system.abilities.str.mod },
    item_enh: this.system.enhancement || 0,
    sneak: actor.canSneakAttack ? actor.sneakAttackDice : 0,
  };
}
```

### Validate scope has required variables
```typescript
async evaluateFormula(path, scope) {
  const required = ['str', 'dex', 'con'];
  for (const key of required) {
    if (!(key in scope)) {
      throw new Error(`Missing required scope variable: @${key}`);
    }
  }
  return this.system.formula(path, scope);
}
```

## Performance Considerations

- **Parse caching**: Formulas with identical text share parsed AST
- **Avoid re-parsing**: Store as FormulaFamiliar, don't manually parse
- **Scope size**: Keep scopes focused (don't include entire actor object)
- **Async evaluation**: Always `await` formula results

## Related Patterns

See also:
- [Dnd35eField Pattern](./dnd35e-field.instructions.md) — For compound formula fields with override values
- [DataModel & Schema](./foundry-data-fields.instructions.md) — FormulaFamiliar field definition
