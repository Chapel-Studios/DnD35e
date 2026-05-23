# Post-Release Wishlist

Stray ideas and "nice-to-haves" that don't yet warrant a full phase document live here. When an item matures into a real plan, promote it to a numbered post-release phase doc and remove it from this list.

> **Convention**: do **not** spin up a new `phase-NN-*.md` in post-release for a single idea. Add it here first; promote later if it grows scope.

---

## Localization

### Localize compendium folder & entry names
Foundry does not auto-localize `Folder` document names inside packs or journal entry titles. Currently the `documentation` pack uses hardcoded English names ("Workflows", "SRD Reference") for in-pack folders and SRD content.

Approaches to evaluate:
- Manual localization pass on each translated `lang/<locale>.json` keyed by stable folder/entry IDs
- A `Setup`/`ready` hook that renames Folder/JournalEntry documents in a side compendium per active locale
- Authoring SRD content as a separate localized pack per language

Affects: `packs/_source/documentation/`, SRD import pipeline.

---

## Currency & Vaults

### Debt tracking
Allow negative currency counts in `CurrencyField` to represent debts. A "negative coin" balance means the character owes that amount. Requires UI treatment (visual distinction for negatives, debt summary).

---

## Actor System

### Silhouette Equipment UI

A character body silhouette with clickable slot regions for equipment management. Players click a slot on the body outline to equip/unequip items directly, providing a visual, tactile inventory UX in place of a flat dropdown list.

Scope: armor/gear slots (head, face, neck, shoulders, chest, abdomen, hands, waist, legs, feet, rings) displayed on a character silhouette graphic; weapon slots (mainhand/offhand) shown separately. Requires SVG or canvas overlay with hit-testing per slot region. Foundation slot system is in Phase 6 (poc.6) — this is a purely visual enhancement on top.

---

### Object actor ↔ physical item linkage
An Object actor (doors, walls, chests) is the actor representation of a physical item in the world. Long-term, these should be linkable: an Object actor could reference an item from its own inventory to drive its stats (HP, hardness, breakDC) — so a "reinforced oak door" item defines the stats, and the actor is just the live instance. Traps follow the same model (a trap actor references the trap device item for its mechanics).

This avoids stat duplication and lets a chest item and a chest actor share the same stat block. Design is non-trivial — deferred post-release.
