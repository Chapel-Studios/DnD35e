# Type-Safe Constants Pattern

**Verified**: Phase 1, Session 4b (damage type refactor)  
**Pattern**: Individual `const` exports + combined array built from them  
**Applies to**: Localization keys, enum-like choices, repeated string values

## The Pattern

```typescript
// src/constants/attacks/damageTypes.mts
const DAMAGE_TYPE_PIERCING = 'dnd35e.DAMAGE_TYPES.Piercing' as const;
const DAMAGE_TYPE_SLASHING = 'dnd35e.DAMAGE_TYPES.Slashing' as const;
// ... more individual constants

const DAMAGE_TYPES = [
  DAMAGE_TYPE_PIERCING,
  DAMAGE_TYPE_SLASHING,
  // ...
];

type DamageType = (typeof DAMAGE_TYPES)[number];

export { DAMAGE_TYPE_PIERCING, DAMAGE_TYPE_SLASHING, DAMAGE_TYPES, type DamageType };
```

## Why It Matters

**Problem it solves**: Magic strings scattered at use sites prevent refactoring and cause validation errors.

**Session 4b evidence**: 
- Bug: `initial: 'D35E.DRSlashing'` didn't match `choices: ['dnd35e.DAMAGE_TYPES.*']` (different namespace)
- Fix: Refactored damageTypes.mts to use constants
- Impact: Zero magic strings, type-safe at all call sites, single point of change for future updates

## Usage

```typescript
// In schema
schema.damageType = new Dnd35eField(StringField, {
  choices: DAMAGE_TYPES,           // Array for validation
  initial: DAMAGE_TYPE_SLASHING,   // Individual const for default
  required: true
});
```

## Scope

**When to use**:
- Localization keys (DAMAGE_TYPES, BONUS_TYPES, EFFECT_TYPES, etc.)
- Enum-like choices (subtypes: 'standard' | 'broken' | 'masterwork')
- Any value that appears in multiple schema definitions

**When NOT to use**:
- Single-use strings
- Transient UI values
- Values calculated at runtime

## Related

- Documentation: `foundry-data-fields.instructions.md` → Constants Pattern section
- Phase 2 impact: BonusType system will use similar pattern for 'material' | 'broken' | 'masterwork'
- `foundry-type-augmentation.md` — When Foundry's type stubs have closed unions, use interface augmentation to extend them with system constants (complementary pattern)
- `dnd35e-naming-convention.md` — Use `Dnd35e`/`DND35E` prefix for system-specific constants, not `System`
