# SRD Citation Source

**Verified**: 2026-05-16 (Phase 4 Story 2 stacking fix)
**Source of truth**: `docs/reference/fvtt-JournalEntry-3.5-srd-working-c3lf0RUqQVJ8Pm20.json` — the working SRD JournalEntry exported from Foundry. Use this when a rules question needs an authoritative quote.
**How to use**:
1. `grep_search` the JSON for the keyword (e.g. `"Stacking"`, `"saving throw"`).
2. Quote the exact text in commit messages / PR descriptions / planning docs when fixing a rules bug.
3. Cite line number — these JSON line numbers are stable enough to use as anchors.
**Example**: Line 51 → Glossary § Stacking → "only the best bonus and worst penalty applies." Cited in the stacking engine fix.
**Why it matters**: Several pieces of legacy code (and prior assumptions in this codebase) deviated from RAW. Always check the source before "fixing" stacking, saves, attack math, conditions, etc.

## Related

- `stacking-engine-rules.md` — first concrete fix that cited this source
- `docs/architecture/bonus-stacking.md`, `docs/reference/bonus-types.md` — narrative docs that must agree with SRD
