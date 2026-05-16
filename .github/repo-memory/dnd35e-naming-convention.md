# Dnd35e Naming Convention — System vs Dnd35e Prefix

**Verified**: Phase 2, Track 10 (renamed SYSTEM_CHANGE_TYPE → DND35E_CHANGE_TYPE)
**Pattern**: Use `Dnd35e` prefix for our system's custom types/constants, reserve `System` for Foundry's generic concept
**Applies to**: All constants, types, and interfaces specific to the dnd35e game system

## The Rule

| Prefix | Meaning | Example |
|--------|---------|---------|
| `System` | Foundry's generic "system data" concept | `system.hardness`, `ActiveEffectSystemModelBase`, `SystemActiveEffectChangeTypes` (Foundry stub) |
| `Dnd35e` / `DND35E` | Our game system's custom additions | `DND35E_CHANGE_TYPE`, `Dnd35eChangeType`, `Dnd35eEffectChangeData`, `Dnd35eField` |

## Why It Matters

`system` in FoundryVTT has a specific meaning — it's the `system` property on Documents that holds the DataModel data. Using `System` prefix for our custom constants creates ambiguity:

- `SystemChangeType` — is this about changes to `document.system`? Or our system's custom change types?
- `SYSTEM_CHANGE_TYPE` — Foundry system data change type? Or dnd35e-registered change type?

Using `Dnd35e` makes ownership unambiguous:

- `Dnd35eChangeType` — clearly our game system's custom change types
- `DND35E_CHANGE_TYPE` — clearly dnd35e-registered, not a Foundry concept

## Export Aliases

The const may still be exported under a convenience alias if the full name is unwieldy:
```typescript
// In constants.mts
const DND35E_CHANGE_TYPE = { FAMILIAR: 'familiar', MASK: 'mask' } as const;

// In barrel — alias for ergonomic imports
export { DND35E_CHANGE_TYPE as SYSTEM_CHANGE_TYPE };
```

This is acceptable when the alias is well-understood within the codebase. The source-of-truth name uses the `DND35E` prefix.

## Exceptions

- **Foundry extension points**: Interfaces in Foundry type stubs (e.g., `SystemActiveEffectChangeTypes`) use `System` because they're Foundry-level concepts that any system could augment.
- **Generic base classes**: `ActiveEffectSystemModelBase` uses `System` because it mirrors Foundry's `system` DataModel pattern.

## Related

- `foundry-type-augmentation.md` — Where `SystemActiveEffectChangeTypes` (Foundry stub) vs `Dnd35eChangeType` (our type) distinction is most visible
- `type-safe-constants.md` — Naming pattern for const + type pairs
