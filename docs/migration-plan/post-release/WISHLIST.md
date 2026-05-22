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
