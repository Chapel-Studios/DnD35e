# Phase Renumbering

**Verified**: April 2026 session inserting beta.04 (Advanced Classes) and shifting beta.04–10 → beta.05–11.

**Pattern**: When inserting a phase mid-wave, rename existing files **highest-first** with `git mv` to avoid filename collisions. History is preserved.

```powershell
cd docs/migration-plan/<wave>
git mv phase-10-foo.md phase-11-foo.md
git mv phase-09-bar.md phase-10-bar.md
# ... continue downward
```

**Companion updates required** (in one commit):
1. `docs/migration-plan/phases.json` — renumber entries, insert new one
2. `docs/migration-plan/roadmap.md` — wave table rows, mermaid graph nodes (`B4`, `B5`, …) **and** mermaid edges
3. Cross-references in other phase docs that mention the renumbered phases by number (search for `beta.N` and `phase-NN-<slug>`)
4. Any release/post-release phase whose deps reference the renumbered phase

**Search recipe**:
```
grep_search 'beta\.0[N-M]|phase-(0N|0M)-<slugs>' under docs/migration-plan/**/*.md
```

**Why highest-first**: `git mv phase-04 phase-05` before renaming phase-05 collides on the destination.
