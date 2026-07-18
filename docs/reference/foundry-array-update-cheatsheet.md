# Foundry Document Array Update Cheat Sheet (v14)

Quick reference for how array updates behave in `Document.update()` and `updateSource()`.

## Core Rules

1. Arrays are replacement values, not patch sets.
- If you update an array path, send the full next array.
- Do not assume partial element patching for `ArrayField` values.

2. Embedded document arrays are special.
- Actor `items`, Actor/Item `effects`, etc. are embedded documents.
- Use `createEmbeddedDocuments`, `updateEmbeddedDocuments`, `deleteEmbeddedDocuments`, or update the embedded doc itself.
- Do not treat embedded collections like plain `system.*` arrays.

3. Dot-path object updates are great for objects, not a good strategy for array edits.
- Prefer read -> compute -> write full array.

4. Reorder/remove-heavy array writes often want `{ diff: false }`.
- This avoids awkward index-based diffs when your intent is "replace with exactly this array".

## Safe Patterns

### Replace a `system` array intentionally

```ts
const next = [...(actor.system.bio.languages ?? []), "Draconic"];
await actor.update({ "system.bio.languages": next });
```

### Remove by predicate/index

```ts
const current = actor.system.bio.languages ?? [];
const next = current.filter((_, i) => i !== removeIndex);
await actor.update({ "system.bio.languages": next });
```

### Reorder or bulk-edit an array (prefer `diff: false`)

```ts
const current = effect.system.changes ?? [];
const next = [...current].sort(sortFn);
await effect.update({ system: { changes: next } }, { diff: false });
```

### Local (unsaved) mutation flow with validation

```ts
const next = [...(item.system.equippedSlotIds ?? [])];
next.push("mainHand");
item.updateSource({ "system.equippedSlotIds": next });
// Persist later with item.update(...) if desired.
```

## Embedded Document Arrays: Use Embedded APIs

### Update multiple owned items

```ts
await actor.updateEmbeddedDocuments("Item", [
  { _id: sword.id, name: "Magic Sword" },
  { _id: shield.id, name: "Magic Shield" },
]);
```

### Delete owned effects

```ts
await actor.deleteEmbeddedDocuments("ActiveEffect", [effectIdA, effectIdB]);
```

## Anti-Patterns

1. Partial array payload when you mean append.

```ts
// Bad: this replaces the whole array with one element.
await actor.update({ "system.bio.languages": ["Draconic"] });
```

2. Mutating by guessed index path.

```ts
// Risky for typical app logic; index drift and diff behavior can surprise you.
await actor.update({ "system.bio.languages.2": "Draconic" });
```

3. Treating embedded documents as plain arrays.

```ts
// Bad: do not update actor.items this way.
await actor.update({ "items": [...] });
```

## Practical Guidance for dnd35e

1. For `system.bio.languages`, always compute a full next array and write it.
2. For `system.equippedSlotIds`, write the whole slot array in one update.
3. For `system.changes` (Active Effects), prefer full-array writes with `{ diff: false }` when pruning/reordering.
4. In `_preUpdate`, mutate `updateData` to final array shape (do not rely on implicit merge behavior).

## Debug Checklist

1. Is this a plain `system.*` array or an embedded document collection?
2. Did I send the full intended array value?
3. If I reordered/removed many entries, should this be `{ diff: false }`?
4. Am I accidentally replacing the whole array while trying to append/remove one element?
5. If it is embedded docs, did I use embedded document APIs instead of `update` on parent array data?

## Related

- [foundry-data-fields-cheatsheet.md](foundry-data-fields-cheatsheet.md)
- [foundry-item-data-pipeline.md](foundry-item-data-pipeline.md)
