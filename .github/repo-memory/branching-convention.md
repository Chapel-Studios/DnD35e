# Branching & Commit Convention

- **Naming**: stories are lettered within a numbered phase (`Story A`, `Story B`, ... — never `Story 1`, `Story 2`). Shorthand form is `<milestone><phaseNumber><letter>`, e.g. `poc9a`, `poc9b`.
- **Branch = phase** (not story). Naming: `poc/{phaseNumber}{storyLetter}_short-slug` for example `poc/9a_actor-foundation`.
- **Commit = one story** within that phase branch. Multiple story commits accumulate on the phase branch before merge.
- Phase 4 Story A created branch at story level (`poc/phase-04-story-01-test-infrastructure`) — this was a one-off; treat as ephemeral. Don't repeat the pattern.
- Planning doc updates ship in the same commit as the work that motivated them (see `planning-doc-commit-pairing.md`).
- **Cross-cutting refactor exception**: when a single phase doc drives many small mechanical PRs (e.g. the 16-PR naming/layout sweep), use `refactor/pr{NN}-{kebab-summary}` branches — one branch per PR, one PR per group from the doc's checklist. See `cross-cutting-refactor-strategy.md`.
