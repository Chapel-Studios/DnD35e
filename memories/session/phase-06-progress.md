# SilverSmith Progress — Phase 6 (Actor Foundation)

## Completed (this session)

- [x] **DocumentMixin on ActorDnd35e** — `ActorDnd35e extends ActorDocumentBase<TToken>` where `ActorDocumentBase = DocumentMixin(Actor) as unknown as typeof Actor`. Adds `events`, `registeredFormulas`, lifecycle hooks, `localizedType`.
- [x] **TS sheet hierarchy** — `ActorSheetDnd35e` (abstract, owns DEFAULT_OPTIONS + title) → `CreatureSheet` (abstract placeholder) → `CharacterSheet` (concrete, owns only `vueComponent`)
- [x] **DEFAULT_OPTIONS** — Lives in `ActorSheetDnd35e`, mirrors `ItemSheetDnd35e` pattern. `classes: [SYSTEM_ID, ACTOR_SHEET_CLASS]`, `position: 720×680`. No mergeObject needed — Foundry merges chain.
- [x] **Vue component layer** — `CharacterSheet.vue` (thin root: store setup + provide) → `CreatureSheet.vue` (delegates to `<DocumentSheetBody>` — no own layout/CSS needed) 
- [x] **provide/inject fix** — `CharacterSheet.vue` now calls `provide(DocumentSheetStoreSymbol, store)` (was missing). `DocumentSheetBody` and its children (DocumentArt, HeaderNameField) inject it correctly as descendants.
- [x] **Tab layer placement** — `ActorEffectsTab.vue` → `baseActor/sheet/tabs/` (all actors); Abilities/Bio/Features/Inventory → `creature/sheet/tabs/`. `CharacterSheet.vue` imports directly from layer owners, no middleman re-export.

## Decisions Made

- **CreatureSheet.vue reuses DocumentSheetBody** — avoids duplicating header/tabs/layout. Portrait comes from `DocumentArt`, name from `HeaderNameField`, tabs from injected `TabStore`.
- **No character/sheet/tabs/ folder** — character has no character-specific tabs yet; imports directly from baseActor and creature layers.
- **VueActorSheet already had DEFAULT_OPTIONS** — `ActorSheetDnd35e` replaces it (same pattern as ItemSheetDnd35e replacing VueItemSheet). `VUE_APP_CLASS` is dropped at this layer (same as item hierarchy does).
- **View mode bar requires no actor-specific code** — `VueDocumentSheetMixin._onRender` handles it for all sheet types. Play+Edit always show; True only if actor has a Secret AE.

## Current State

Sheet scaffolding is complete and compiles clean. Character sheet opens in Foundry with full tab bar and header. All tab bodies are stubs (TODO placeholders).

## Next Up (Story 1 cont.)

- **Abilities tab** — 6 `NumberFormGroup`s (editable base score) + derived modifier display (read-only)
- Requires: `CharacterSystemModel` schema with `abilities.{str,dex,con,int,wis,cha}.{base, mod}` fields

## Deferred Items

- `wellKnownEvents` static registry + typed payload interfaces (TakeDamagePayload, etc.) — spec commit 2; not yet done
- `isOfType()` method on ActorDnd35e — spec checklist item; not yet done
- All data model / derived data pipeline items — Story 1 schema onwards

## Branch

`feat/poc-06-story-1` — pending user commit review
