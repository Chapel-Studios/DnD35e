<!--
  PR title format: Conventional Commits — feat: / fix: / chore: / docs: / refactor: / test: / perf:

  Scale this template to the change:
    - Small chore/docs PR: keep Summary + Changes + How to verify + Checklist; delete the rest.
    - Feature PR / phase deliverable: fill in everything. Long PRs are fine — clarity > brevity.

  Recommended workflow:
    1. Draft your writeup as docs/prs/<phase>-<slug>.md while implementing (docs/prs/ is
       gitignored — it's your personal scratchpad).
    2. When opening the PR, paste the polished writeup into the PR description below.
    3. The committed file at docs/pr-writeup-example.md is a reference for what a complete
       phase-deliverable writeup looks like.
-->

**Branch**: `<source>` → `<target>`
**Type**: `type: <feature|chore|docs|refactor|fix|test|perf>`  
**Phase / Wave**: <e.g. `wave: poc` `phase: poc.2`>  
**Build status**: `npm run build` ✅ / ❌

---

## Summary

<!--
  1–3 sentences. What changed and why. Include the user-visible or developer-visible delta.
  Optionally end with a pointer to the writeup in docs/prs/ for long-form context.
-->

## Linked issues

<!-- "Closes #N" auto-closes on merge; "Refs #N" references without closing. -->
Closes #

---

## What We Built

<!--
  Bulleted highlights of the major pieces. Bold the named concept first, then the one-line "why".
  Example:
  - **Material AE** — foundational modifier pattern: an embedded AE that reads its own schema
    and contributes to the parent item's AE application cycle every prep tick
-->
- 

---

## Implementation Summary

<!--
  Optional. For multi-cycle / multi-track work, break it down. Skip for small PRs.
  Each entry: what landed + a one-liner pattern or rationale.
-->

### Cycle / Track 1: <name>
**Completed**:
- 

**Pattern established** (optional):
> 

---

## Technical Decisions

<!--
  Optional but encouraged for anything non-obvious. Each decision: what was chosen, why, and
  what alternative was rejected. This is the most useful section for future readers.
-->

### 1. <decision>
**Decision**: 

**Rationale**:
- 

**Alternative considered**: 

---

## Deferrals

<!--
  Optional. Anything intentionally pushed to a later phase or follow-up PR, with the reason.
  Format: deferred item → target phase → why.
-->

- **<item>** → <target phase> — <reason>

---

## How to verify

<!-- Concrete steps a reviewer can run. Commands, click-paths, expected outputs. -->

- [ ] `npm run build` succeeds
- [ ] `npm test` succeeds
- [ ] 

---

## Testing & Known Limitations

<!--
  Optional. What's tested, what's deferred (and why), what's known not to work yet.
  Use this when the change touches behavior that can't be fully exercised until later phases.
-->

**What's tested**:
- ✅ 

**Deferred testing**:
- ⚠️ 

---

## Files Modified

<!--
  Optional. Group by area (Core / Sheets / Stores / Build / Docs). Useful for large PRs;
  skip for small ones — the file diff in GitHub is enough.
-->

### Core
- 

### Sheets / UI
- 

### Build / Tooling
- 

### Docs
- 

---

## Checklist

- [ ] PR title follows Conventional Commits
- [ ] Wave label and `type:` label assigned
- [ ] Milestone matches the linked issue (if any)
- [ ] Tests added or updated (or stubbed if pre-poc.4)
- [ ] Docs updated (`docs/` and inline) where behavior changed
- [ ] No unrelated changes mixed in

## Notes for reviewers

<!-- Anything the reviewer should know up front: tricky logic, intentional scope cuts, follow-ups. -->
