# Cross-Cutting Refactor — Wave/Group PR Sequencing

**Verified**: refactor/naming-conventions sweep, PRs 1–16 (merged #51–#66, May 2026)
**Pattern**: A single phase document drives **many small PRs**, one per coherent group; each PR independently leaves build clean and unit suite green; full E2E runs once at the end.
**Applies to**: Future cross-cutting refactors (folder moves, repo-wide renames, layout overhauls)
**Why it matters**: A "mega-PR" for repo-wide layout/naming work is unreviewable. The group-PR pattern keeps each diff in human-readable territory, surfaces collisions early, and lets work pause at any group boundary without leaving the tree in a broken state.

## The shape

1. **One planning doc** lists every rule and every group as numbered checklist items (e.g. `G5g.1`, `G6.4`, `G9.2`). The doc is the source of truth; status updates land in the same commit as the work.
2. **One phase branch per PR**: `refactor/pr{NN}-{kebab-summary}`. PRs target `dev`, not `main`.
3. **Mechanical groups go first, semantic groups last**. The 16-PR sweep ordered as: file moves → folder casing → file renames → helper-type renames → final validation. Keeping all renames-of-the-same-symbol inside one PR avoids cross-PR import churn.
4. **Per-PR gates** for a cross-cutting refactor: `tsc --noEmit` + `npm run build` + `vitest` + **full Playwright E2E**. The refactor is mechanical, so the only way regressions surface is in E2E — it runs per PR, not per story. (This is the exception to the project's general "E2E every story, not every PR" rule, which applies to feature-flavored phase work.) Doc-only PRs may skip the build and E2E gates.
5. **Final Validation PR** (FV) is doc-only: grep audit for residual old names, one last full E2E sanity pass on merged `dev`, status badge flip to ✅ Complete, instruction-file docs caught up.

## Why per-group, not per-rule

A group is "all renames that affect the same import surface" — e.g. G9 swept eight helper-type symbols in one PR because they all flow through the same `import { ... } from '@helpers/...'` lines. Splitting that into eight PRs would create eight import-line-rewrite collisions on the next rebase.

## Things that surface inside a sweep (treat as scope, not bugs)

- **Target-name collisions**. PR 15's G9.2 renamed `Dnd35eFieldMeta → FieldMeta` mechanically, then discovered the sheet store's `FieldMeta` already claimed that name. Resolved with a fixup amendment: `SchemaFieldMeta` for the schema-definition meta, bare `FieldMeta` stays on the sheet store. **Lesson**: grep the *target* names before sweeping (see `identifier-rename-sweep.md`).
- **Type-export-split rule**. `export type { X };` and `export { Y };` must be separate statements when `X` is a type-only alias of a name re-exported as a value elsewhere. Came up in the PR 15 fixup.
- **Stale repo-memory / instruction-file paths**. Repo-wide path renames invalidate every `src/entities/...` reference in `.github/` docs. The FV PR is the natural place to sweep these — but if the refactor is long, do a mid-sweep KB pass to prevent compounding drift.

## Untracked files during the sweep

`.github/workflows/restrict-main-pr-source.yml` (and similar) may be deliberately untracked. Use **named-file commits** or `git add -A -- src/ tests/` to avoid sweeping them in by accident. Do **not** `git add -A` at repo root during a long-running sweep.

## When to invoke this pattern

- Cross-cutting rename or move that touches 20+ files
- Foundry-vocabulary alignment work (folder renames, document hierarchy)
- Repo-wide convention shifts (file casing, type-export styles)

## When NOT to use this pattern

- Single-feature work — use a normal phase branch with story commits.
- Anything with runtime behavior change — those go through the phase pipeline, not a "mechanical" refactor sweep.

## Related

- `identifier-rename-sweep.md` — The PowerShell mechanics for safe renames
- `branching-convention.md` — Branch = phase, commit = story (this pattern is a refinement: branch = PR, group = commit-cluster)
- `planning-doc-commit-pairing.md` — Phase doc updates ship with the motivating commit
- `phase-status-drift.md` — Verify checklist state against code before flipping the status badge
- `docs/migration-plan/poc/refactor-naming-conventions.md` — Worked example
