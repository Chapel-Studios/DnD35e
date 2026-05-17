# Planning Doc Commits Ship With Their Motivating Work

**Verified**: May 2026 session — Phase 4 Story 1 commit.
**Pattern**: When a commit completes (or advances) a phase checklist item, the corresponding planning doc updates ship in the **same commit**, not a follow-up.
**Applies to**: All `docs/migration-plan/**/*.md` updates and `docs/migration-plan/roadmap.md` status flips.
**Why it matters**: Keeps the phase doc as a faithful record of "what shipped when." Avoids "doc says not started" / "code clearly done" drift like we hit on Phase 2.

## Concretely
When closing a checklist item:
1. Make the code changes.
2. In the same staging step, flip the checkbox in the phase doc.
3. If the change moves a phase from `Approved` / `Not Started` → `In Progress`, or completes a whole story, also update `docs/migration-plan/roadmap.md` status column.
4. Single commit covers code + doc + roadmap.

If a planning-doc-only cleanup is needed (typo, consolidation, no code change), that ships as its own commit — separate concern.

## Related
- `phase-renumbering.md` — historical doc reshuffles
- `scope-boundary-enforcement.md` — keep commits scoped
