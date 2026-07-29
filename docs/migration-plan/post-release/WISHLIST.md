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

---

## Tokens & Movement

### Climb movement action (`CONFIG.Token.movement.actions.climb`)
poc.9 wires `climb` the same way as fly/swim/burrow: `canSelect` is gated on `system.speed.climb > 0` (`SPEED_GATED_ACTIONS` in `movementActionGating.mts`), and the ruler's movement budget uses that same speed field (`movementBudget.mts`). This covers the "has a climb speed" case (e.g. spider climb, natural climbers).

Still deferred: 3.5e's Climb *skill* (DC-based check per move, half speed without a climb speed, fall risk on failure) for creatures without a persistent climb speed. That needs its own design pass tied to the skill-check system — revisit once skills land (see Phase 9/skills dependency).

### Crawl movement action (`CONFIG.Token.movement.actions.crawl`)
Foundry core ships a generic `crawl` token movement action (half speed). SRD 3.5e doesn't call out crawling as a standalone sustained movement mode with official rules the way it does for walk/fly/swim/burrow — it's tied to being prone (a creature can only crawl while prone, moving at a fraction of speed). Gating this sensibly requires the status/condition system (prone) to exist first. Until conditions land, poc.9 disables it outright (`canSelect: () => false`) rather than leaving Foundry's always-selectable default active. Deferred until conditions land — revisit proper `canSelect` gating then.

### Jump movement action (`CONFIG.Token.movement.actions.jump`)
Foundry core ships a generic `jump` token movement action (2x cost multiplier) intended for sustained leaping movement during a drag. In 3.5e, Jump is a skill check for a single leap of a specific distance, not a repeatable drag-across-the-canvas movement mode. Gating this properly requires the skill-check system. Until then, poc.9 disables it outright (`canSelect: () => false`).

### Blink / Displace movement actions (`CONFIG.Token.movement.actions.blink` / `.displace`)
Foundry core ships generic `blink` and `displace` teleport-style movement actions (speed multiplier `Infinity` / unmeasured, respectively). These map to spell/effect-granted teleportation (Dimension Door, Teleport, Blink) rather than a default movement mode any actor should always have available. Gating this properly requires wiring canSelect to an active spell/effect flag. Until then, poc.9 disables both outright (`canSelect: () => false`).

### Cap Drop Prone / Stand Up confirming drag to one grid square
`dropProne`/`standUp` (`movementActionGating.mts`) are non-spatial toggles confirmed via a drag, and `TokenDocumentDnd35e#_onUpdateMovement` always snaps the token back to `movement.origin` afterward regardless of drag length — so overshooting has no functional effect, but a long drag still visually invites the player to think they moved. A first attempt to cap the confirming drag to one grid square via `getCostFunction` (`Infinity` after the first segment, relying on Foundry's `#constrainMovementPathCostAndDistance` to truncate the path) produced no visible effect in testing — the drag still tracked the mouse past one square. Worth revisiting: check whether the ruler/preview rendering path even consults the constrained/truncated path during an in-progress drag (vs. only on drop), or whether a different hook (`_addDragWaypoint`, ruler waypoint preview) is the right layer to enforce a visual stop at one square.

### Live token vision sync on senses change (poc.9 Story 3)
Placed tokens copy `sight`/`detectionModes` from the actor's `prototypeToken` once, at creation — Foundry never re-derives those fields from the actor afterward (confirmed by reading `TokenDocument#prepareBaseData`/`prepareDerivedData` in Foundry core; no auto-sync exists). Standard Foundry behavior is that an actor edit doesn't retroactively update already-placed tokens for fields like this — the GM deletes and re-drags the token (or uses `updateVisionMode()`/manual token edits) to pick up changes. poc.9 accepts this standard behavior rather than building a bespoke live-sync hook (`updateActor` → `updateEmbeddedDocuments('Token', ...)`).

Revisit if this friction proves painful in practice — a hook could push `buildTokenVisionFromSenses()` output onto linked placed tokens on `system.bio.senses` changes, surgically merging `detectionModes` (preserving unrelated GM-added entries like `seeInvisibility`).

---

## Formula System

### Structured Condition Builder & Conditional Values rule-list editor
Phase 7 (poc.7) Story C originally planned a full structured editor for formula fields: a **Condition Builder** row (aspect picker + operator dropdown, filtered by the picked aspect's type, + a literal-or-aspect value + AND/OR clause chaining + an "Edit as text" escape hatch), used two ways:
- **Standalone**, as the advanced-editor target for boolean-typed fields (e.g. the AE Condition column)
- **Embedded per-rule** inside a **Conditional Values** editor for `number`/`string` fields — an ordered list of condition → value rules (first true condition wins), with the field's original formula as the trailing default, a "+ Add Rule" button, and a live preview of the result and compiled formula string

Both compile down to the same `$conditional(when(cond, value) ... else(default))` grammar that already ships and is fully tested today (`FormulaResolver`, see `docs/migration-plan/poc/phase-07-roll-formulas.md` §7.10) — this wishlist item is purely a friendlier front-end onto existing infrastructure, not new resolution logic.

Also deferred: **round-trip parsing** — opening the editor on an existing formula needs to parse a `$conditional(...)` block back into rule rows (in source order), falling back to "whole string becomes the default, rule list starts empty" for anything not expressible in the grammar. Whether to attempt best-effort/partial parsing of loosely-formed input, or require an exact-grammar match before offering structured rows (falling back to raw text otherwise), is still an open question — default toward exact-grammar-only for simplicity.

Also deferred: helper buttons on the new basic multiline modal editor (§7.10 Half 2) to insert `#context.property` variables or `$conditional(...)` scaffolding without hand-typing — the modal shipped as a plain rich-text box for the initial pass.

Affects: `src/helpers/formulae/FormulaFormGroup.vue`, a new `ConditionBuilder.vue` / `ConditionalValuesEditor.vue` (not yet created), the AE Condition column (`EffectChangesList.vue`).
