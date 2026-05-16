# Effect Change Optional Normalization

**Verified**: 2026-04-22 during ActiveEffect change stacking fix
**Pattern**: `system.changes[*].bonusType` and `condition` can be persisted as `null` or `''` by schema/UI even though runtime consumers want absence to mean `undefined`.
**Applies to**: `Dnd35eEffectChangeData`, `resolveActiveEffectChange()`, item stacking bridge, future action-phase condition consumers
**Why it matters**: Stacking groups by `bonusType`. Leaving `null`/`''` unnormalized creates fake bonus buckets and incorrect history.
**Rule**: Model persisted effect-change optionals as `BonusType | '' | null | undefined` / `string | '' | null | undefined`, then normalize to `undefined` before runtime resolution/stacking.
**Example**: `normalizeOptionalEffectChangeString(change.bonusType)` before constructing `StackingChange`.
**Untyped alias (Phase 4, 2026-05-16)**: The engine now treats `undefined` and `BONUS_TYPE_UNTYPED` as equivalent — both normalize to `BONUS_TYPE_UNTYPED` at the grouping step in `resolveActiveEffectChanges`. New code should prefer the explicit constant; legacy `undefined` callers still work via this alias.

## Related

- `src/entities/activeEffects/BaseActiveEffect/data/ActiveEffectSystemData.mts`
- `src/entities/activeEffects/BaseActiveEffect/resolveChangeValue.mts`
- `src/entities/items/baseItem/ItemDnd35e.mts`
- `familiar-field-patterns.md`
