# Stacking Engine Rules

**Verified**: 2026-05-16 (Phase 4 Story 2)
**File**: `src/helpers/stacking.mts` — `resolveActiveEffectChanges()`
**SRD citation**: `docs/reference/fvtt-JournalEntry-3.5-srd-working-c3lf0RUqQVJ8Pm20.json` line 51 (Glossary § Stacking): "only the best bonus and worst penalty applies."

## Algorithm

Group changes by `(field, bonusType)`. For each group:

- **Stacking type** (members of `STACKING_BONUS_TYPES`): sum **all** values → one winner, reason `'untyped-stack'`. Zero sum produces no winner.
- **Non-stacking named type**: split into bonuses (positive) and penalties (negative). Best bonus (max positive) **and** worst penalty (min negative) both win as separate winners. Reasons: `"lower bonus"` / `"less severe penalty"` / `"zero value"` for rejections.
- NaN values are dropped defensively before grouping.

## Untyped is the default

- `BONUS_TYPE_UNTYPED = 'dnd35e.BONUS_TYPES.Untyped'` is a first-class member of `BONUS_TYPES`.
- `undefined` callers are normalized to `BONUS_TYPE_UNTYPED` at grouping (alias).
- `STACKING_BONUS_TYPES` currently contains only `BONUS_TYPE_UNTYPED`. Dodge / Circumstance / Racial are documented as future additions per community-expert ruling (always stack, including penalties) but not yet in the union because no consumer exists.

## Group key format

Because `BonusType` values contain `:` (localization keys like `dnd35e.BONUS_TYPES.Untyped`), the groupKey uses the **first** `:` as the field/type separator. Use `.slice` on the first colon, not `.split`.

## No `isPenalty` flag

`StackingChange.isPenalty` was removed — penalty status is derived from sign at the moment it's needed. Do not reintroduce.

## Related

- `effect-change-optional-normalization.md` — how persisted `null`/`''` gets to `undefined`/UNTYPED at this boundary
- `docs/architecture/bonus-stacking.md` — narrative docs (must be kept in sync)
- `docs/reference/bonus-types.md` — per-type stacking rules
