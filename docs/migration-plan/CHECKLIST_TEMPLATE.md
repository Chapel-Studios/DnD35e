# Phase Template - Standard Layout

**Use this template for all phases (>3). Customize sections as needed, but maintain this overall structure.**

---

## Phase X: [Title]

**Status**: [🟢 In Progress / 🟡 Planned / 🔴 Blocked]

> **Milestone**: [POC / Feature / Integration / Release]  
> **Dependencies**: [Phase A, Phase B]  
> **Goal**: [1-2 sentence summary of what this phase accomplishes]

---

## X.1 Rationale & Context

Why does this phase exist? What problem does it solve? How does it fit into the larger system?

---

## X.2 [First Design/Planning Section]

Explain approach, decisions, architecture, etc. Use subsections as needed (X.2.1, X.2.2, etc.)

---

## X.3 [Second Design/Planning Section]

Continue planning/design sections as needed. These should cover all major decisions before implementation.

---

## X.N Completion Checklist

### Planning & Acceptance Criteria

**Primary acceptance criteria** (executable, testable):

| Criterion | Verification | Status |
|-----------|--------------|---------|
| [Feature/capability] | Search: `[pattern]` should/shouldn't match in `[file]` | ⬜ Pending |
| [Coverage requirement] | File: `[path]` should exist with coverage > [%] | ⬜ Pending |
| [Behavior] | Test: `test:[category]::` should pass | ⬜ Pending |
| [Performance] | `[metric]` < [threshold] | ⬜ Pending |

**Why this format**: Executable criteria prevent ambiguity. Anyone can verify completion by running the search, checking the file, or running the test.

### ✅ Complete
- (None — Phase X not started) OR (List completed items with verification)

### 🔶 In Progress
- (If applicable, any work in progress with status)

### ❌ Not Started (Task Breakdown)

**Track 1: Research & Setup**
- [ ] [Task R1] — [Brief description] `routing: Lead dev`
- [ ] [Task R2] — [Brief description] `routing: Jr dev or Flexible`
  - Gate: [What must be true before proceeding?]

**Track 2: Implementation** [Depends on Track 1]
- [ ] [Task I1] — [Brief description] `routing: Lead dev`
- [ ] [Task I2] — [Brief description] `routing: Jr dev or Pair`
  - Gate: [Prototype complete? Tests passing?]

**Track 3: Scale & Content** [Depends on Track 2]
- [ ] [Task C1] — [Brief description] `routing: Jr dev`
- [ ] [Task T1] — [Brief description] `routing: Jr dev or Pair`
  - Gate: [Content complete? Tests passing?]

**Track 4: Documentation & Release** [Depends on Track 3]
- [ ] [Task D1] — [Brief description] `routing: Lead dev`
- [ ] [Task Q1] — [Brief description] `routing: Lead or Pair`

**Dependencies**: Track 1 → Track 2 → Track 3 → Track 4  
**Parallelization**: Tracks 1 & 2 can overlap; Tracks 2 & 3 can overlap; Track 4 must wait for Track 3

### Testing & Validation

**Unit Tests:**
- [ ] Test file: `test/path/[feature].test.ts` (Coverage: > 85%)
- [ ] Critical paths tested: [list specific scenarios]
- [ ] Edge cases covered: [list edge cases]

**Integration Tests:**
- [ ] Cross-wave integration: new + existing components work together
- [ ] Data persistence: updates save/load correctly
- [ ] Backwards compatibility: Phase N-1 data still works

**Smoke Tests:**
- [ ] Console clear, no errors on load
- [ ] i18n keys resolve (if applicable)
- [ ] No performance regressions (baseline: [X ms])

### Documentation Updates

**Developer Documentation:**
- [ ] Inline code comments for complex logic
- [ ] JSDoc/TSDoc for public APIs (`src/sheet/MyComponent.vue`, `src/models/MyModel.ts`)
- [ ] Pattern guide: "How to add new [feature type]" with example

**Architecture Documentation:**
- [ ] Update this phase's design sections with final decisions
- [ ] Update phase backlinks if dependencies changed: [Phase M], [Phase N]
- [ ] Cross-reference related sections in [skill/instruction]

**Changelog & Migration:**
- [ ] `CHANGELOG.md`: Document breaking changes, new features, deprecations
- [ ] `MIGRATION.md` (if needed): Guide for existing worlds upgrading

---

## Files Modified/Created

| Action | Path | Details | Status |
|--------|------|---------|--------|
| Create | `src/path/file.mts` | Brief description | ⬜ Pending |
| Modify | `system.json` | Brief change | ⬜ Pending |
| Test | `test/path/tests.test.ts` | Coverage area | ⬜ Pending |

---

## Risk Log

| Risk | Impact | Mitigation | Status |
|------|--------|-----------|--------|
| [Specific technical risk] | HIGH/MED/LOW | [Concrete action] | 🟢 Mitigated / 🟡 Monitoring |
| [Edge case uncertainty] | MED | [Test/spike needed] | 🔴 Blocker - Resolve before Wave N |

---

## Success Criteria

- ✅ All checklist items complete
- ✅ Tests passing, no warnings
- ✅ No deferred items in this phase's checklist (move to their proper phase)
- ✅ Cross-phase dependencies documented

---

## Deferred / Not in This Phase

_(Optional note section explaining why certain features are NOT in this phase and where they live instead)_
