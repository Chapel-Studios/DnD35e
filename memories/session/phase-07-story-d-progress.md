# SilverSmith Progress — Phase 7, §7.9 (Story D: Clickable Defense Stat → Roll Dialog → Chat Card)

## Completed Cycles

- [x] Cycle A — `D20Roll` class + `CONFIG.Dice.rolls` registration
- [x] Cycle B — `VueDialogMixin` + `D20RollDialogConfig`/`D20RollDialogApp.vue`
- [x] Cycle C — `rollMessages.mts` + `save-roll-card.hbs` chat card
- [x] Cycle D — `Creature.rollSave(saveKey, options)`

## Current Cycle

- [ ] Cycle E — `CreatureDefenseStat.vue` click wiring (Fort/Ref/Will header pills only; AC excluded, DamageRoll/rollAC deferred to Phase 8)

## Decisions Made

- Chat card built with `.hbs?raw` + `Handlebars.compile()` (matching `TokenRulerDnd35e.mts`'s waypoint-label precedent), not a `.vue` component — resolves a conflict between this section's original Vue sketch and `alpha/phase-03-action-system.md` §18.11's "no Vue in chat cards" rule.
- Chat card embeds Foundry's own `await roll.render()` output for the die/tooltip block (native `.dice-roll[data-action="expandRoll"]` collapsible behavior, verified against real Foundry core source) instead of a hand-rolled die row — matches D35E's clickable-breakdown UX.
- Real class is `Creature` (not `CreatureDnd35e` as phase doc originally sketched); `SaveKey = 'fort' | 'reflex' | 'will'` (real schema key is `reflex`, not `ref`).
- `rollSave()` returns `Promise<D20Roll | null>` (not spec's literal `Promise<D20Roll>`) — `null` represents dialog cancellation.
- Chat message posted via `roll.toMessage()` (Foundry's sanctioned Roll→ChatMessage helper) instead of raw `ChatMessage.create()` — sidesteps a `rolls: Roll[]` vs `rolls: string[]` ambient-type mismatch and matches core convention (verified in `roll.mjs`).
- New `src/constants/saves.mts` (`SaveKey`, `SAVE_KEYS`, `SAVE_KEYS_LOCALIZED`) follows the existing `abilities.mts` pattern.
- New `dice.json` `SaveNames`/`RollSaveTitle` keys added — distinct from `actors.json`'s existing short pill labels (`Fort`/`Ref`/`Will`), since the roll dialog/chat card need full names (`Fortitude`/`Reflex`/`Will`).

## Deferred Items

- `rollAC(acVariant, options)` — explicitly out of scope for this pass (user-directed AC exclusion); future phase.
- `DamageRoll` class — Phase 8.
- Unit tests for D20Roll/dialog/chat-card/rollSave — not written this pass; build-verification only per session workflow so far.
- `buildACCard()` — deferred alongside AC rolling.

## Knowledge Cached

- None yet delegated to `@kb-curator` for this story — candidate topics once Cycle E lands: Foundry's native `Roll#toMessage()`/`.dice-roll[data-action="expandRoll"]` pattern, and the `DeepPartial<T>` ambient-type bug (`TNestedValue` default `{}` short-circuits partiality).
