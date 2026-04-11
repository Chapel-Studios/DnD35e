# Planning Guide — Task-Based Decomposition

Simple guide to breaking down work into concrete tasks, identifying parallelization opportunities, and routing work by skill level.

---

## Quick Start

**Goal**: Understand what a phase involves in concrete terms, who should do what, and what can happen together.

**Invoke**: `@planning Plan [phase or feature name]`

**Output**: 
- List of concrete tasks with descriptions
- Skill routing for each (Lead dev, Jr dev, Pair, or Flexible)
- Dependencies (what must finish before what)
- Parallelization diagram (which tasks can run simultaneously)
- Success criteria for each task

**Example**:
```
@planning Plan Phase 5: Feats
```

Result:
```
## Phase 5: Feats — Task Breakdown

### Research & Setup
- R1: Analyze existing feat patterns [routing: Lead dev] → verify "Can explain 3+ patterns"
- R2: Design schema for feat storage [routing: Lead dev → Pair teach Jr] → verify "Schema reviewed and approved"

### Implementation
- I1: Implement feat mechanics engine [routing: Lead dev] depends_on [R2] → verify "Mechanics tests pass (>80% coverage)"
- I2: Build feat sheet UI [routing: Jr dev or Pair] depends_on [R2] → verify "Sheet renders 5+ feats correctly"

### Scale & Content
- C1: Populate 200+ feats in compendium [routing: Jr dev] depends_on [I1, I2] → verify "200+ feats present and valid"
- T1: Add feat interaction tests [routing: Jr dev or Pair] depends_on [I1] → verify "Integration tests pass"

### Parallelization
```
R1, R2 | (can overlap, both Lead + Jr working)
   ↓
I1 | I2 (can run in parallel: Lead on I1, Jr on I2)
   ↓
C1 | T1 (can run in parallel: Jr on C1, Jr/Pair on T1)
```

### Skills Needed
- Lead dev: R1, R2 design, I1 lead (teach Jr on I2)
- Jr dev: R2 assist, I2, C1, T1

### 3-Person Team Timeline
- Day 1: R1 (Lead) + R2 setup (Lead + Jr-1 pair)
- Day 2-3: I1 (Lead), I2 (Jr-1), C1 starts (Jr-2)
- Day 4: C1 completes, T1 runs, Lead reviews
```

---

## Task Properties

Each task should have:

### Name & Description
- **Clear**: What is being done?
- **Bounded**: What's NOT included?
- **Why**: What problem does this solve?

### Routing
How to match task to team member:

- **Lead dev**: Requires expertise, complex decisions, or teaching others
- **Jr dev**: Can be done independently with clear acceptance criteria
- **Pair** (Lead + Jr): Good teaching opportunity; jr dev drives with lead reviewing
- **Flexible**: Can be done by anyone; choose based on capacity

### Blocking Dependencies
- **Hard block**: This task CANNOT START until another finishes
- **Nice to have**: These tasks can inform this one, but don't block it

### Verification
How do we know this task is done?
- **Concrete**: Not "looks good" but "tests pass" or "X items complete"
- **Testable**: Anyone can verify (grep, test run, file count, etc.)
- **Small scope**: A single task's success check should take < 5 min to verify

---

## Decomposition Patterns

### Pattern 1: Add a Content Type (Feats, Spells, etc.)

```yaml
research:
  - name: "Analyze existing patterns"
    routing: Lead dev
    blocking: [impl-setup]
    verify: "Can explain 3+ existing patterns from codebase"

  - name: "Design content schema"
    routing: Lead dev → Pair teach Jr
    blocking: [impl-mechanics, impl-ui]
    verify: "JSON schema document exists and is approved"

implementation:
  - name: "Build mechanics engine"
    routing: Lead dev
    depends_on: [research]
    verify: "Unit tests pass (>85% coverage)"

  - name: "Build UI/sheet views"
    routing: Jr dev or Pair
    depends_on: [research]
    verify: "Can display 5+ items without errors"

content:
  - name: "Populate content (200+ items)"
    routing: Jr dev
    depends_on: [implementation]
    verify: "Content compendium has 200+ valid entries"

  - name: "Write integration tests"
    routing: Jr dev or Pair
    depends_on: [implementation]
    verify: "Tests pass, coverage >80%"

validation:
  - name: "Review & documentation"
    routing: Lead dev
    depends_on: [content]
    verify: "PR approved, CHANGELOG updated"
```

**Parallelization**: research is sequential (Lead + Jr teach), but implementation tasks can run in parallel (Lead on mechanics, Jr on UI).

---

### Pattern 2: Refactor a Component

```yaml
analysis:
  - name: "Map current state & risks"
    routing: Lead dev
    blocking: [planning]
    verify: "Risk list document exists; all edge cases identified"

  - name: "Design new structure"
    routing: Lead dev → Pair teach Jr
    blocking: [refactoring]
    verify: "Design document approved; migration strategy clear"

refactoring:
  - name: "Refactor core logic"
    routing: Lead dev or Pair
    depends_on: [analysis]
    verify: "Unit tests pass (>90% coverage), no console errors"

  - name: "Update dependent code"
    routing: Jr dev
    depends_on: [refactoring]
    verify: "Dependent imports resolved, typings updated"

testing:
  - name: "Add tests for new structure"
    routing: Jr dev or Pair
    depends_on: [refactoring]
    verify: "Integration tests pass, no regressions"

  - name: "Performance validation"
    routing: Lead dev
    depends_on: [refactoring]
    verify: "No performance regressions vs. baseline"
```

**Parallelization**: refactoring and dependent-code-updates can't truly overlap, but testing can start as soon as core refactoring is testable.

---

### Pattern 3: Integrate an External System

```yaml
research:
  - name: "Research system & APIs"
    routing: Lead dev (or Jr dev + Lead review)
    blocking: [design, spike]
    verify: "API documentation reviewed; 3+ integration points identified"

  - name: "Spike: Build proof-of-concept"
    routing: Lead dev or Pair
    depends_on: [research]
    blocking: [planning]  # Blocks final planning until spike validates feasibility
    verify: "POC code works; can [core integration task] succeed?"

planning:
  - name: "Design integration approach"
    routing: Lead dev
    depends_on: [spike]
    blocking: [implementation]
    verify: "Design doc approved; error handling strategy defined"

implementation:
  - name: "Implement integration points"
    routing: Lead dev (complex) or Pair (less complex pieces)
    depends_on: [planning]
    verify: "Unit tests pass; can call system without errors"

  - name: "Add error handling & retry logic"
    routing: Jr dev or Pair
    depends_on: [implementation]
    verify: "Error tests pass; various failure modes handled"

testing:
  - name: "Integration & edge case testing"
    routing: Jr dev or Pair
    depends_on: [implementation]
    verify: "Integration tests pass; system behaves on network failures, timeouts"
```

**Key**: Spike happens early and is a blocker—it validates the whole approach before committing.

---

## Dependency Relationships

Use these to show which tasks can run in parallel:

### Hard Block
Task B absolutely cannot start until Task A finishes.
```
Example: Can't implement feat UI until schema is designed
A (Design schema) → B (Implement UI)
```

### Parallelizable  
Tasks can partially overlap or run fully in parallel.
```
Example: Lead can do mechanics while Jr does UI (same track)
Mechanics | UI (independent, same sprint)

Example: Jr populates content while Lead validates
Content population | Validation (can overlap; validation just needs early samples)
```

### Nice-to-Have
Task B runs better if A is done first, but doesn't strictly require it.
```
Example: Integration tests are better written by whoever did implementation,
but Jr dev can write them from the spec if needed
Implementation → (nice to have) Integration Tests
```

---

## For Your 3-Person Team

**Setup**: 1 Lead dev + 2 Jr devs

**Resource Model**:
- **Lead dev**: Handles complex decisions, teaches jr devs, reviews
- **Jr dev #1 & #2**: Can both work on separate tasks simultaneously
- **Pair**: Lead + 1 Jr dev on high-teaching-value or complex tasks

**Typical Allocation**:

| Scenario | Lead | Jr #1 | Jr #2 |
|----------|------|-------|-------|
| Add content type | Design (1d) + Review (0.5d) | UI/Mechanics assist (2d) | Content + Tests (2d) |
| Refactor component | Refactor core (1.5d) + Design (0.5d) | Update dependents (1d) | Tests (1d) |
| Complex integration | Design + Spike (1.5d) + Impl (1d) | Error handling (1d) | Testing (1d) |

**Parallel Work Example**:
```
Task: Feat System (Phase 5)

Day 1:
  [Lead dev] Design schema
  [Jr dev #1] Learn requirements, assist with design
  [Jr dev #2] (blocked, waits for design)

Day 2-3:
  [Lead dev] Implement mechanics engine
  [Jr dev #1] Implement UI sheet
  [Jr dev #2] Start content population (if design complete)

Day 4:
  [Lead dev] Review, documentation
  [Jr dev #1] Help with content
  [Jr dev #2] Write integration tests

Result: Work done faster because jr devs aren't blocked waiting for lead
```

---

## Invocation & Output

### Standard Decomposition
```
@planning Plan [feature or phase]
```

**Output**:
- Task list with routing
- Dependency diagram
- Parallelization visualization
- Success criteria per task
- Recommended 3-person allocation

### For Complex Unknowns
```
@planning-researcher Analyze what patterns exist for [topic]
```

Before decomposing novel work, understand what's already been done.

### For Deep Dependency Analysis
```
@planning-decomposer Show me what must happen before [task]
```

Understand if a task is truly independent or has hidden dependencies.

### For Risk Assessment
```
@planning-validator What could go wrong with this approach?
```

Identify blockers or high-risk assumptions before starting.

---

## Example: Planning Phase 5 Feats

### Your question
"What does Phase 5 involve? Can we parallelize? Who does what?"

### Step 1: Run planning agent
```
@planning Plan Phase 5 Feats
```

### Step 2: Read the output
```
Phase 5: Feats — Task Breakdown

Research & Setup (Lead only)
  ✓ R1: Analyze existing feat patterns [Lead] → "Can explain 3+ patterns"
  ✓ R2: Design feat schema [Lead → Pair teach Jr] → "Schema doc approved"
  
Implementation (Parallel possible)
  → I1: Feat mechanics engine [Lead] depends R2 → "Tests >85%"
  ✓ I2: Feat sheet UI [Jr or Pair] depends R2 → "Renders 5+ feats"
  
Scale & Content (Parallel possible)
  ✓ C1: Populate feats [Jr] depends I1, I2 → "200+ feats in compendium"
  ✓ T1: Integration tests [Jr or Pair] depends I1 → "Tests pass"
  
Parallelization:
  R1, R2 sequential (Lead + Jr teaching)
  I1 | I2 can overlap (Lead handles mechanics, Jr handles UI)
  C1 | T1 can overlap (One Jr populates, other Jr tests)
```

### Step 3: Make allocation decision
```
Day 1-2 (Research):
  Lead → Design schema (1.5 days)
  Jr-1 → Assist + learn (shadow)

Day 3-5 (Implementation):
  Lead → Feat mechanics (2 days)
  Jr-1 → Feat sheet UI (2 days, parallel with Lead)
  Jr-2 → NOT YET (waiting for impl to finish)

Day 6 (Content):
  Lead → Review
  Jr-1 → Content population
  Jr-2 → Integration tests (parallel)

Day 7 (Validation):
  Lead → Final review + PR
```

**Result**: 7 calendar days instead of ~12 sequential days

---

## Success Criteria Template

Use this in your CHECKLIST_TEMPLATE.md:

```markdown
### Task: [Name]
- **Routing**: [Lead / Jr / Pair / Flexible]
- **Depends on**: [Other tasks]
- **Blocked by**: [Other tasks]
- **Success**: [Concrete, testable condition]
  - Example: "Search `export.*FeatSheet` matches `src/sheet/FeatSheet.tsx`"
  - Example: "Test `test:feats::stacking` passes"
  - Example: "Feat compendium has 200+ valid entries"
- **Owner**: [ assigned during execution ]
- **Estimate**: [optional — user preference, not required]
```

---

## Key Differences from Old System

| Old | New |
|-----|-----|
| "This is a 5-phase project" | "Here are the concrete tasks" |
| "This will take 40 hours" | "Lead does X, Jr does Y, this is parallelizable" |
| "Critical path: 16 days" | "With 2 jr devs + lead, 4-5 days" |
| "Broad acceptance criteria" | "Concrete verify steps anyone can run" |
| "Modes: Quick / Standard / Deep / Spike" | "Just plan the work, adjust depth as needed" |

**Bottom line**: Focus on *what needs to happen* and *who should do it*, not on *how long it takes*.

---

## Getting Help

| You want... | You do... |
|-------------|----------|
| Plan this feature | `@planning Plan [feature]` |
| Understand current patterns | `@planning-researcher What patterns exist for [topic]?` |
| Deep dive on risks | `@planning-validator What could go wrong with [approach]?` |
| See task dependencies | `@planning-decomposer Show me what must happen before [task]` |

---

## Questions?

Common questions:

**Q: "How long will this take?"**  
A: Planning tells you who does what and what can run in parallel. From there, you know calendar time = effort/parallelalism. For a 3-person team with 2 independent jr devs, most features take 3-7 days calendar time vs. 10+ days if sequential.

**Q: "My task isn't clearly parallelizable?"**  
A: Run `@planning-decomposer` to explore what could be split. Sometimes a task can be split into independent pieces (e.g., schema design vs. impl, UI vs. mechanics).

**Q: "Do I need to track effort?"**  
A: Not required. Planning focuses on task structure and skill assignment. If you want effort estimates, you can add them, but the system doesn't require them.

**Q: "The plan doesn't match reality?"**  
A: That's normal—adjust as you go. The goal isn't perfect predictions but clear task visibility and parallelization opportunities.
