# Dnd35e Naming Convention — Suffix-Only on Foundry Collision

**Verified**: PR sweep 1–16 (refactor/naming-conventions, May 2026 — closed by PR #66)
**Pattern**: `Dnd35e` is a **suffix**, applied **only** when the bare name collides with a Foundry class or type. No prefix anywhere in `src/`.
**Applies to**: All exported classes, types, interfaces, constants in `src/` (and `tests/` references)

> **Supersedes the old "use `Dnd35e` prefix" rule.** Phase 2 introduced
> `Dnd35eChangeType`/`DND35E_CHANGE_TYPE`-style prefixes; the refactor sweep
> reversed this. The canonical rule below is the post-refactor target state.

## The Rule

1. **Default**: use the bare, descriptive name. `ChangeType`, `OverrideOptions`, `ParentDoc`, `SystemConfig`, `BaseFlags`, `FieldMeta` — no decoration when no Foundry export claims the name.
2. **On collision with a Foundry export**: append `Dnd35e` as a **suffix**. The suffix marks "this is our version of the otherwise-Foundry-named thing." `EffectChangeData` is a Foundry type, so our extended interface is `EffectChangeDataDnd35e`.
3. **`System` is reserved for Foundry's `system` data concept** (the `Document.system` DataModel slot). Never use `System` for arbitrary "this is the game system" decoration.
4. **Constant naming**: bare `SCREAMING_SNAKE` for our consts when there's no collision (`CHANGE_TYPE`, not `DND35E_CHANGE_TYPE`). Only suffix on collision.

| Bare name collides? | Form to use | Example |
|---------------------|-------------|---------|
| No | bare | `ChangeType`, `OverrideOptions`, `ParentDoc`, `SystemConfig`, `BaseFlags`, `CHANGE_TYPE` |
| Yes (Foundry has same name) | `<Name>Dnd35e` | `ItemDnd35e`, `ActiveEffectConfigDnd35e`, `TokenDnd35e`, `EffectChangeDataDnd35e` |

Verified collisions (require suffix): `Item`, `Actor`, `ActiveEffect`, `ActiveEffectConfig`, `Token`, `Scene`, `RegionDocument`, `EffectChangeData`.

## Schema Meta vs Sheet Meta — the FieldMeta example

A single bare name can be claimed by two different layers. When the second layer arrives, **the more descriptive name moves** — both keep `Dnd35e` off.

- `FieldMeta` (in `src/documents/document/sheet/stores/FieldOverridesStore.mts`) — runtime-resolved meta on the document-sheet store, claimed first.
- `SchemaFieldMeta` (in `src/fields/fieldBuilders.mts`) — meta attached at schema-definition time, renamed during PR 15 fixup to avoid collision with the sheet-store `FieldMeta`.

**Rule**: prefer a more-descriptive bare name over a `Dnd35e` suffix when both options are available within our codebase. Reserve the suffix for genuine Foundry collisions.

## Naming Sub-Rules from the Refactor

- **`Base` marker**: drop it from class names where it only restates `abstract class`. After the refactor, no `src/` class is named `Base*`; the marker survives only on **folder names** that hold the foundation layer of a composition chain (`baseItem/`, `baseActiveEffect/`, `baseActor/`). Class names inside those folders still follow the suffix rule (`ItemDnd35e`, `ActiveEffectDnd35e`, `ActorDnd35e`).
- **`types.mts`** (no leading underscore) is the file-aggregation convention; `_types.mts` is non-standard JS/TS.
- **`fieldBuilders.mts`** is the canonical exception for grouped-helper filenames: camelCase plural when the file groups related factory helpers, not a single exported class.
- **`documents/`**, not `entities/`. Foundry calls them documents; we follow.
- **File casing**: PascalCase filename matches the primary exported class (`ItemDnd35e.mts` exports `class ItemDnd35e`). camelCase for grouped-helper files. R.2.9 single-component-folder exception allows `TabDivider/TabDivider.vue` PascalCase folder when the folder is dedicated to a single same-named export.

## Migration Aliases vs Semantic Re-Exports

Two different things; only one is banned.

- **Migration alias** (banned): `export { NewName as OldName }` purely so importers can keep using the *old* name post-rename. The refactor sweep deleted all of these as it went; prefer a clean cut and update call sites in the same PR.
- **Semantic re-export** (allowed): exporting a value under a second name that means something different in the consumer's vocabulary. The active example is `export { CHANGE_TYPE as SYSTEM_CHANGE_TYPE }` in `src/documents/activeEffects/baseActiveEffect/data/constants.mts` — `CHANGE_TYPE` is the local data-module name, `SYSTEM_CHANGE_TYPE` is how the rest of `src/` (Item, Secret, sheet components) refers to "the system's effect-change-type enum" to disambiguate from Foundry's own change-type concepts. Both names are first-class; neither is a deprecated alias of the other.

## Related

- `cross-cutting-refactor-strategy.md` — How the 16-PR sweep was sequenced
- `identifier-rename-sweep.md` — Mechanical-rename recipe with collision pre-check
- `foundry-type-augmentation.md` — Where `SystemActiveEffectChangeTypes` (Foundry stub) vs `ChangeType` (our type) distinction is visible
- `type-safe-constants.md` — Naming pattern for const + type pairs
- `docs/migration-plan/poc/refactor-naming-conventions.md` — Full rule set with rationale
