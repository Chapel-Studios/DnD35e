# Branching & Commit Convention

- **Branch = phase** (not story). Naming: `poc/phase-NN-short-slug` or `alpha/phase-NN-…`.
- **Commit = one story** within that phase branch. Multiple story commits accumulate on the phase branch before merge.
- Phase 4 Story 1 created branch at story level (`poc/phase-04-story-01-test-infrastructure`) — this was a one-off; treat as ephemeral. Don't repeat the pattern.
- Planning doc updates ship in the same commit as the work that motivated them (see `planning-doc-commit-pairing.md`).
