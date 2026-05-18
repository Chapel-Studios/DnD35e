# Dnd35e Naming Convention — Suffix-Only on Foundry Collision

**Verified**: PR sweep 1–16 (refactor/naming-conventions, May 2026 — closed by PR #66)
**Pattern**: `Dnd35e` is a **suffix**, applied **only** when the bare name collides with a Foundry class or type. No prefix anywhere in `src/`.
**Applies to**: All exported classes, types, interfaces, constants in `src/` (and `tests/` references)

> **Supersedes the old "use `Dnd35e` prefix" rule.** Phase 2 introduced
> `Dnd35eChangeType`/`DND35E_CHANGE_TYPE`-style prefixes; the refactor sweep
> reversed this. The canonical rule below is the post-refactor target state.

## The Rule

1. **Default**: use the bare, descriptive name. `ChangeType`, `OverrideOptions`, `ParentDoc`, `SystemConfig`, `BaseFlags`, `EffectChangeData`-style names — no decoration.
2. **On collision with a Foundry export**: append `Dnd35e` as a **suffix**. The suffix marks "this is our version of the otherwise-Foundry-named thing."
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

- **`Base` marker**: drop it where it only restates `abstract class`; keep it where it's the most accurate descriptor *and* avoids a `Dnd35e` suffix (e.g. `BaseActiveEffect`, `BaseItem`).
- **`types.mts`** (no leading underscore) is the file-aggregation convention; `_types.mts` is non-standard JS/TS.
- **`fieldBuilders.mts`** is the canonical exception for grouped-helper filenames: camelCase plural when the file groups related factory helpers, not a single exported class.
- **`documents/`**, not `entities/`. Foundry calls them documents; we follow.
- **File casing**: PascalCase filename matches the primary exported class (`ItemDnd35e.mts` exports `class ItemDnd35e`). camelCase for grouped-helper files. R.2.9 single-component-folder exception allows `TabDivider/TabDivider.vue` PascalCase folder when the folder is dedicated to a single same-named export.

## Migration Aliases

When renaming a public-ish symbol, prefer a clean cut. Do **not** add `export { NewName as OldName }` aliases unless an external consumer demands it — the refactor sweep deleted these as it went.

## Related

- `cross-cutting-refactor-strategy.md` — How the 16-PR sweep was sequenced
- `identifier-rename-sweep.md` — Mechanical-rename recipe with collision pre-check
- `foundry-type-augmentation.md` — Where `SystemActiveEffectChangeTypes` (Foundry stub) vs `ChangeType` (our type) distinction is visible
- `type-safe-constants.md` — Naming pattern for const + type pairs
- `docs/migration-plan/poc/refactor-naming-conventions.md` — Full rule set with rationale
