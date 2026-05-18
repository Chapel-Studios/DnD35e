# Untracked workflow files — leave alone

**Verified**: Phase 4 Story 6 wrap-up
**Applies to**: Wrapping up phases, reviewing `git status` before commit

- `.github/workflows/restrict-main-pr-source.yml` is intentionally
  untracked on feature/phase branches. It belongs to **poc.8 (Pipeline &
  Branching)** and will be committed there.
- Do NOT `git add` it when wrapping up unrelated phases, even if it shows
  up in `git status` as untracked. It is not stray scratch work.
- If `git status` shows other unexplained workflow YAML files, ask the
  user before touching them — they are likely poc.8-scoped or another
  in-flight branch-protection task.

**Related**: `.github/repo-memory/branching-convention.md`,
`docs/migration-plan/poc/phase-08-pipeline-and-branching.md`
