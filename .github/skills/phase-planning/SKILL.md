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
