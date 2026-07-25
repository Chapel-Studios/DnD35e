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
Foundry core's Movement Action system (v13+) ships a generic `climb` token movement action, gated selectable by default. In 3.5e, climbing isn't a persistent movement speed — it's governed by the Climb skill (DC-based check per move, half speed, fall risk on failure). Wiring `canSelect` to a flat `system.speed.climb` value (as done for fly/swim/burrow in poc.9) would misrepresent the rule. Needs its own design pass tied to the skill system before it's gated/enabled properly — until then, poc.9 disables it outright (`canSelect: () => false`) rather than leaving Foundry's always-selectable default active.

### Crawl movement action (`CONFIG.Token.movement.actions.crawl`)
Foundry core ships a generic `crawl` token movement action (half speed). SRD 3.5e doesn't call out crawling as a standalone sustained movement mode with official rules the way it does for walk/fly/swim/burrow — it's tied to being prone (a creature can only crawl while prone, moving at a fraction of speed). Gating this sensibly requires the status/condition system (prone) to exist first. Until conditions land, poc.9 disables it outright (`canSelect: () => false`) rather than leaving Foundry's always-selectable default active. Deferred until conditions land — revisit proper `canSelect` gating then.

### Jump movement action (`CONFIG.Token.movement.actions.jump`)
Foundry core ships a generic `jump` token movement action (2x cost multiplier) intended for sustained leaping movement during a drag. In 3.5e, Jump is a skill check for a single leap of a specific distance, not a repeatable drag-across-the-canvas movement mode. Gating this properly requires the skill-check system. Until then, poc.9 disables it outright (`canSelect: () => false`).

### Blink / Displace movement actions (`CONFIG.Token.movement.actions.blink` / `.displace`)
Foundry core ships generic `blink` and `displace` teleport-style movement actions (speed multiplier `Infinity` / unmeasured, respectively). These map to spell/effect-granted teleportation (Dimension Door, Teleport, Blink) rather than a default movement mode any actor should always have available. Gating this properly requires wiring canSelect to an active spell/effect flag. Until then, poc.9 disables both outright (`canSelect: () => false`).
