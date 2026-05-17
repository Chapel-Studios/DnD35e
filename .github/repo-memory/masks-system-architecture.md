# Masks System Architecture

**Verified**: Phase 2, Track 10 (implementation + build verified)
**Pattern**: Runtime `_masks` dictionary built from Secret AE MASK changes, checked in `getViewAwareFieldValue`
**Applies to**: Item identification, unidentified view display, Secret Active Effects

## Data Flow

```
Secret AE (type: 'secret')
  └─ MASK changes (type: 'mask', key: 'system.hp.value', value: '???')
       │
       ▼
ItemDnd35e._buildMasks()          ← called in prepareDerivedData(), before _prepareDerivedItemData()
  │ Filters: active Secret AEs only
  │ Sorts: highest priority first
  │ First-write-wins per field path
  │
  ▼
ItemDnd35e._masks = { 'system.hp.value': '???' }   ← runtime-only, rebuilt every prep cycle
       │
       ▼
DocumentSheetStore.getViewAwareFieldValue(path)
  │ In play mode:
  │   1. Check _masks[path] → return masked value if present
  │   2. Fall through to effective value resolution
  │ In true mode:
  │   Skip _masks and return unmasked effective values
  │ In edit mode:
  │   Editable source path handling applies
```

## Key Design Decisions

1. **_masks is runtime-only** — Not persisted. Rebuilt from Secret AEs every `prepareBaseData()` → `prepareDerivedData()` cycle. Reset in `prepareBaseData()`.

2. **MASK changes skip stacking** — `applyActiveEffects()` has an explicit `continue` for MASK type changes. They define display values, not computed values.

3. **Highest priority wins** — When multiple Secrets mask the same field, the one with highest `priority` on its first change takes precedence (sorted descending, first-write-wins).

4. **Masks checked first in play mode** — In `getViewAwareFieldValue`, `_masks` is checked before any other lookup in play mode. This allows Secret AEs to override any field's display value.

## Access Pattern

```typescript
// In DocumentSheetStore — cast needed since _masks is item-specific
const masks = (document.value as unknown as { _masks?: Record<string, unknown> })._masks;
if (masks && fieldPath in masks) {
  return masks[fieldPath] as T;
}
```

## What _masks Does NOT Do

- Does not affect `_source` data (read-only display layer)
- Does not participate in Active Effect stacking/resolution
- Does not affect edit mode (display masking is in play mode; true mode is unmasked)
- Does not persist — no database writes
- Top-level item `name` and `img` also need mask propagation for player-visible play mode. `ItemDnd35e` projects `_masks.name` / `_masks.img` through document accessors so sidebar and menu consumers see masked values without mutating persisted source data.
- Name masking is canonicalized onto `system.nameFormula` at runtime. Whether a Secret masks `name`, `system.nameFormula`, or its subfields, `ItemDnd35e` synthesizes a masked `FormulaData` view plus a masked top-level `name`, so display-name consumers stay aligned with the system's formula-based naming model.



## Related

- `src/entities/items/baseItem/ItemDnd35e.mts` — `_buildMasks()`, `_masks` property
- `src/entities/components/CoreMixin/sheet/DocumentSheetStore.mts` — `getViewAwareFieldValue()` masks check
- `src/entities/activeEffects/secret/` — Secret AE type that carries MASK changes
- `foundry-type-augmentation.md` — How MASK type is registered in the type system
- `dnd35e-naming-convention.md` — Why const is `DND35E_CHANGE_TYPE.MASK` not `SYSTEM_CHANGE_TYPE.MASK`
