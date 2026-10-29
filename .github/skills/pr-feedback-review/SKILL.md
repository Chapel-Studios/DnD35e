---
name: pr-feedback-review
description: 'Assess pasted PR/code-review feedback for validity against this codebase before fixing it. Use when the user pastes one or more review comments, review threads, or reviewer feedback sections and wants a critique of whether each item is valid for dnd35e, followed by approval-gated fixes and a single commit (no push). Cross-checks instruction files, skills, and docs/migration-plan, and consults d35e-reference/system-comparison/foundry-reference when feedback claims something about legacy D35E or Foundry core behavior.'
---

# PR Feedback Review

Triage pasted code-review feedback: judge whether each comment is actually valid for this
codebase, push back (in chat only) on anything that isn't, and only implement the items the
user approves — unless they explicitly say to just fix it.

## When to Use
- The user pastes one or more review comments / review thread excerpts and asks for a
  critique, not a blind "fix everything."
- A reviewer's claim rests on an assumption about legacy D35E behavior, Foundry core API
  behavior, or a system convention — any of which may be wrong or outdated.

## Procedure

### 1. Parse the feedback into discrete items
Split the pasted text into individually addressable comments. A single pasted block may
contain several unrelated points — assess each on its own merits, don't bundle them.

### 2. Assess each item against the codebase
For every item, determine whether it's valid *for this repo's actual conventions*, not just
in the abstract. In priority order:
1. Check relevant `.github/instructions/*.instructions.md` (field permissions, patterns,
   form groups, formula/familiar, data fields, Vue sheet patterns, E2E).
2. Check `.github/repo-memory/*.md` for a verified fact/convention that settles the question.
3. Check the relevant `docs/migration-plan/<wave>/phase-NN-*.md` spec — feedback that
   contradicts an agreed phase design may be out of scope, not wrong code.
4. Read the actual code the comment refers to — don't assess from the diff/comment text
   alone.
5. If the comment asserts "D35E does X" or "Foundry does Y", verify it:
   - Legacy D35E behavior / migration equivalence → use the `d35e-reference` or
     `system-comparison` skill.
   - Foundry v14 core API/class/event behavior → use the `foundry-reference` skill.
   Do not take the reviewer's claim about either system at face value if it changes the
   verdict — confirm it.

### 3. Classify each item
For each item, classify as one of:
- **Valid** — the feedback is correct and should be applied as-is.
- **Valid, different fix** — the underlying concern is real but the suggested fix conflicts
  with a documented convention; propose the convention-consistent fix instead.
- **Not valid** — the feedback is based on a mistaken assumption about this codebase, D35E,
  or Foundry; cite the instruction/memory/spec/source line that contradicts it.
- **Out of scope** — technically correct but belongs to a different phase/story; note where
  it should be tracked instead of fixing it now.

### 4. Present the critique for approval
Unless the user said "just fix this" (or equivalent) for the current batch, present a short
per-item verdict before writing any code:
```
1. [Valid] <comment summary> — will fix: <one-line approach>
2. [Not valid] <comment summary> — <file/instruction/spec citing why>
3. [Valid, different fix] <comment summary> — convention says <X>, proposing <Y> instead
```
Wait for the user's go-ahead on which items to implement. Do not edit files for items still
pending approval.

### 5. Implement approved items
Make the approved edits following the matching `.instructions.md` conventions for the files
touched (e.g. `vue-sheet-patterns`, `dnd35e-field`, `dnd35e-patterns`). Keep changes scoped to
what was approved — don't expand into adjacent cleanup the reviewer didn't ask for.

### 6. Wait for staging, then commit only
The user stages the approved changes themselves as their final approval gate. Once they
indicate it's staged:
- Create exactly one commit covering the whole approved batch from this feedback pass
  (even if it touches several files/items) — see `branching-convention.md` repo memory for
  branch/commit norms.
- Write a plain, imperative commit message describing the change itself, matching existing
  repo history style (e.g. `Gate action chain mutation controls by chain editability`). Do
  not reference "review", "PR", or reviewer names in the message.
- Do **not** run `git push` under any circumstances in this flow, even after committing —
  only push when the user explicitly asks for it in that moment.

## Non-goals
- Not for fetching PR comments from GitHub automatically — feedback is always pasted by the
  user.
- Not for auto-applying every suggestion verbatim — the point of this skill is the critique
  step, which only "just fix this" skips.
