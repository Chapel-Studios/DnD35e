# Phase References in Code Comments Must Carry a Wave Prefix

**Verified**: Session cleanup sweep — 84 matches / 45 files audited across `src/`.
**Pattern**: Phase numbers are **not unique across waves**. `docs/migration-plan/phases.json` numbers each wave (`poc`, `alpha`, `beta`, `release`, `post`) independently starting at 01. A bare "Phase 6", "Phase 9", or "§7.2c" in code is ambiguous — there are (at minimum) four different `phase-09-*.md` files, one per wave (`poc/phase-09-basic-tokens.md`, `alpha/phase-09-buff-ae-core.md`, `beta/phase-09-metamagic.md`, `post-release/phase-09-random-treasure.md`).
**Applies to**: Any code comment, docstring, or TODO in `src/`/`tests/` that references a phase/story/section number from `docs/migration-plan/`.

## The Rule

When a comment references a phase, it must do ONE of:

1. **Prefix with the wave name**: `poc Phase 6`, `alpha Phase 4 (Feats)`, `poc §7.2c`. This is the default — use it whenever you can confidently identify which wave's phase the comment means (cross-check the topic against `phases.json`'s `title` field).
2. **Full relative path for file references**: `poc/phase-09-basic-tokens.md` rather than bare `phase-09-basic-tokens.md`. The filename slug is usually unique, but the folder makes it unambiguous without requiring a `file_search`.
3. **No phase number at all** when you cannot confidently map the comment to a real, currently-scheduled phase. Describe the feature/system by name instead (e.g. "a future, not-yet-scheduled phase" or "the skill system phase"). **Do not guess a wave/number just to have one** — a wrong citation is worse than none.

## Stale references are common — verify, don't copy

Many pre-existing "Phase N" comments predate the wave reorganization (`poc`/`alpha`/`beta`/`release`/`post`) and use flat numbering that no longer maps to any real phase file. Examples found and corrected:
- `Phase 10 (Action System)` → actually `alpha Phase 3` (Action System). Phase 10 doesn't exist in any wave.
- `Phase 10 (Feats)` → actually `alpha Phase 4` (Feats).
- `Phase 9 (Class System)` → actually `alpha Phase 2` (Classes & Level History).
- `Phase 23` (NPC/Trap/Object) → no such phase exists anywhere; replaced with prose ("a future, not-yet-scheduled phase").
- `docs/migration-plan/phase-31-community-hardening.md` → the real file is `release/phase-07-community-hardening.md`.

**Before writing a phase reference**: check `docs/migration-plan/phases.json` for the `title` that matches the feature being discussed, confirm the `wave`/`number`/`file`, and cite that — don't trust an existing nearby comment's number.

## Related
- [phase-renumbering.md](phase-renumbering.md) — companion process for when a phase's number *changes* (insertion mid-wave); this note is about disambiguating *which wave* a number belongs to
- [phase-status-drift.md](phase-status-drift.md) — don't trust checklist checkboxes either; same "verify against source of truth" principle
- `docs/migration-plan/phases.json` — canonical wave → number → file → status → title mapping
