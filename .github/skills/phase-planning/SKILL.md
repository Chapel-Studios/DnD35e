---
name: phase-planning
description: "Analyze, improve, and maintain phase planning documentation. Use when: consolidating redundant sections, reorganizing phase structure, updating checklists, moving deferred work, adding cross-references, or improving decision frameworks."
---

# Phase Planning Maintenance

Helps maintain and improve phase planning documentation throughout the system lifecycle.

## When to Use

- **Consolidate Sections**: Merge repeated information into focused areas
- **Reorganize Structure**: Improve clarity by reordering sections
- **Clarify Decisions**: Convert implicit decisions into explicit frameworks
- **Update Checklists**: Ensure completion items are specific and testable
- **Add Cross-References**: Link related sections and phases
- **Move Deferred Work**: Separate "nice to have" from "blocked on"
- **Extract Patterns**: Pull reusable workflows for documentation

## Capabilities

- Identify redundancy and ambiguity in planning documents
- Analyze sections and suggest consolidation approaches
- Propose exact text changes with before/after examples
- Ensure consistency across Phase N documents
- Verify completion checklists match implementation reality
- Extract patterns used in multiple phases
- Add cross-references to related phases and sections

## Workflow

1. **User describes issue**: "Section 4.2 repeats section 4.8"
2. **Skill analyzes**: Reads both sections, identifies overlap
3. **Skill proposes**: Exact consolidation strategy with specific edits
4. **Result**: Cleaner, more maintainable documentation

## Key Principles

- **Clarity over brevity**: Prefer explicit over implicit
- **DRY principle**: One place for each decision
- **Forward reference**: Explain why deferred work is deferred
- **Traceability**: Cross-reference related sections
- **Testability**: Completion checklists use verifiable criteria
- **Terminology fidelity**: Verify runtime terms against constants/types before final wording
- **Open question protocol**: Never mark open questions as resolved unilaterally. Present each proposed answer, get user sign-off, then apply. See "Open Question Protocol" below.
- **WISHLIST scope rule**: WISHLIST = "no phase assigned yet." If the target phase is known, reference that phase directly instead. Sending known-phase work to WISHLIST creates false backlog.

## Open Question Protocol

Phase docs contain `[ ]` open questions in a dedicated section. These are unresolved design decisions — **never resolve them without user sign-off**, even when the answer seems obvious.

**Correct workflow:**
1. Read each unchecked question aloud to the user
2. Propose an answer with brief rationale (especially for POC-scope questions where "simplest thing" is usually right)
3. Wait for confirmation or correction
4. Apply the resolution verbatim to the doc
5. Mark the item `[x]`

**Example — good approach:**
> C2 UI — original question: "expandable tree or flat list with parent indicator?"
> My proposal: flat list, contained items grouped under container row with indentation. Tree UI → deferred to beta.1.
> *(wait for user response before editing)*

**Why it matters:** Design decisions in planning docs have downstream cost. A wrong answer left unchallenged gets built. An answer the user disagrees with costs a corrective conversation mid-implementation.

## Anti-Regression Checks (After Major Implementation)

When planning docs are updated after heavy implementation, run these checks:

1. **Canonical term check**
	- Confirm mode names/enums against source constants (example: `ViewMode` in `src/helpers/formulae/types.mts`)
	- Replace deprecated names globally in the doc (for example `unidentified` mode name -> `true`)

2. **Behavior-evidence check**
	- Each major claim in summary/checklist must map to at least one code location
	- If behavior is only partially verified, mark as `partial`/`deferred`

3. **Platform command check**
	- Use shell commands that work on the active platform (PowerShell vs Unix tools)
	- Avoid documenting commands that fail on contributor default shells

4. **Retrospective capture check**
	- For mistakes found during phase work, record: symptom -> root cause -> prevention rule
	- Feed prevention rules into agent/instruction files, not only phase notes

## Common Tasks

| Task | Example |
|------|---------|
| **Consolidate** | "Pack registration info is in 4.4 AND 4.6, merge" |
| **Clarify** | "Change 'we use JSON' to 'JSON because: [ecosystem], not YAML'" |
| **Extract Pattern** | "Pull content authoring workflow for Phase 5 reuse" |
| **Improve Checklist** | "Make completion items specific and testable" |
| **Add References** | "Link Phase 5 feats to Phase 4 compendium system" |
| **Move Deferred** | "This note belongs in Deferred, not main design" |

## Document Structure

Phases typically follow:
1. **Goals**: Why this phase? What does it enable?
2. **Dependencies**: What earlier phases does it need?
3. **Design**: Architecture and approach
4. **Implementation**: Tasks, workflows, file structure
5. **Proof Concept**: First feature showing system works
6. **Deferred**: Future work with justification
7. **Completion Checklist**: Specific, testable items

## Related Documentation

- Full roadmap: `docs/migration-plan/README.md`
- Individual phases: `docs/migration-plan/phase-NN-*.md`
- Quick reference: See `.github/AGENTS.md` for planning agents
