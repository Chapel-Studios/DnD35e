# FormulaFamiliar Field Patterns

**Verified**: April 2026, schema walker opt-out refactor session

## Schema Walker Paradigm: Default-Include

All DataFields are included in formula autocomplete by default. Opt out explicitly.

### Opt-out pattern
```ts
// Use withFamiliar() from fieldBuilders.mts — canonical way to attach metadata
slug: withFamiliar(optionalStringField(), { formulaVisible: false }),
version: withFamiliar(requiredStringField('14.0.0'), { formulaVisible: false }),
```

### Fields that should opt out
- `version` — internal system version, not useful in formulas
- `slug` — internal identifier, not useful in formulas
- `nameFormula` — formula itself (would cause circular reference); opted out via `withFamiliar(field, { formulaVisible: false })`
- `description` — HTML content, not a formula-compatible value; opted out via `withFamiliar(field, { formulaVisible: false })`

### Static constructor markers
- `isFamiliarField = true` — compound leaf; schema walker exposes `.value` access path
- `isFamiliarLeaf = true` — opaque leaf, no recursion (PriceField, FormulaField)
- Neither marker → SchemaField recurses, all other field types are simple leaves

## Effect targetContexts

### When to declare static targetContexts
- Effect type can appear in compendium templates without a parent (Material AE templates)
- Effect type can live on multiple parent document types

### When NOT to declare static targetContexts
- Effect type always lives on a parent item (Secret AEs)
- Derive context from the live parent via `resolveTargetContext()` in `ActiveEffectConfigStore`
- Base class `targetContexts = {}` provides graceful fallback (returns null)

**Related**: `copilot-instructions.md` FormulaFamiliar section, `schemaWalker.mts`
