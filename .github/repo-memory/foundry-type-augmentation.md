# Foundry Type Augmentation Pattern

**Verified**: Phase 2, Track 10 (MASK change type)
**Pattern**: Use `interface` + `declare module` augmentation to extend Foundry's closed type unions
**Applies to**: Any Foundry type stub where runtime extensibility exists but types are closed

## The Problem

Foundry V14 supports runtime registration of custom change types via `CONFIG.ActiveEffect.changeTypes`, but the type stubs define `ActiveEffectChangeType` as a closed union of built-in literals (`'custom' | 'add' | 'multiply' | ...`). Comparing `change.type === DND35E_CHANGE_TYPE.MASK` fails type-checking.

## Wrong Approaches

```typescript
// ❌ as string cast — suppresses type narrowing, hides real type gaps
if ((change.type as string) === DND35E_CHANGE_TYPE.MASK) continue;

// ❌ (string & {}) widening — breaks all downstream type constraints
type ActiveEffectChangeType = BuiltInTypes | (string & {});
// Every field typed as ActiveEffectChangeType becomes assignable from any string
```

## Correct Approach: Augmentable Registry Interface

**Step 1**: Add an empty registry interface in the Foundry type stub:
```typescript
// types/foundry/common/constants.d.mts
export interface SystemActiveEffectChangeTypes {}

export type ActiveEffectChangeType =
  | (typeof ACTIVE_EFFECT_CHANGE_TYPES)[keyof typeof ACTIVE_EFFECT_CHANGE_TYPES]
  | SystemActiveEffectChangeTypes[keyof SystemActiveEffectChangeTypes];
```

**Step 2**: Augment from the system's global declarations:
```typescript
// src/global.mts
declare module '@common/constants.mjs' {
  interface SystemActiveEffectChangeTypes {
    FAMILIAR: 'familiar';
    MASK: 'mask';
  }
}
```

**Step 3**: System-internal types can include the custom types:
```typescript
// constants.mts
type EffectChangeType = typeof EFFECT_CHANGE_TYPE[keyof typeof EFFECT_CHANGE_TYPE] | Dnd35eChangeType;
type Dnd35eChangeType = typeof DND35E_CHANGE_TYPE[keyof typeof DND35E_CHANGE_TYPE];
```

## Why It Works

- Preserves autocomplete for built-in types
- Custom types are narrowed to exact literals (`'familiar' | 'mask'`), not `string`
- No downstream breakage — `ActiveEffectChangeType` remains a finite union
- Adding new system change types only requires updating the augmentation

## Code Smell Detection

**When you see `(x as string)` to compare against a const**: the type definition is too narrow. Fix the type upstream via augmentation rather than casting at usage sites.

## Related

- `type-safe-constants.md` — Individual const + array pattern for system constants
- `src/global.mts` — Where system augmentations live
- `types/foundry/common/constants.d.mts` — The augmented Foundry stub
