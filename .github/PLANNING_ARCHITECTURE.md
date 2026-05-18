# Planning System Architecture Overview

## Agent Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  User: "Plan Phase 5 Feats"                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─→ DIRECT ROUTE ─────────────────────┐
                     │   @planning Plan [topic]             │
                     │   → Comprehensive planning            │
                     │   → User-guided phases 1-2           │
                     │   → Automated phases 3-5             │
                     │                                       │
                     └─→ ORCHESTRATOR ROUTE ──────────────┐ │
                         @planning-orchestrator Plan [...]  │ │
                         → Fully automated                  │ │
                         → User input only for spec        │ │
                         → Produces complete plan            │ │
                         └─ Coordinates Five Specialized Phases
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
    │ Phase 1        │ │ Phase 2        │ │ Phase 3        │
    │ RESEARCH       │ │ SPECIFICATION  │ │ DECOMPOSITION  │
    │                │ │                │ │                │
    │ @planning-     │ │ (User          │ │ @planning-     │
    │ researcher     │ │ interaction)   │ │ decomposer     │
    │                │ │                │ │                │
    │ Tool: read     │ │ Tool: memory   │ │ Tool: memory   │
    │ Tool: search   │ │ Tool: reason   │ │ Tool: reason   │
    │                │ │                │ │                │
    │ Output:        │ │ Output:        │ │ Output:        │
    │ Patterns       │ │ Acceptance     │ │ DAG + Waves    │
    │ Constraints    │ │ Criteria       │ │ Effort Est.    │
    │ Prerequisites  │ │ Scope          │ │ Critical Path  │
    │ Unknowns       │ │ Dependencies   │ │ Risk Flags     │
    └────────────────┘ │ Assumptions    │ └────────────────┘
         ↓             └────────────────┘         ↓
         Gate: Complete?    Gate: Clear?   Gate: Atomic & Parallelizable?
         │                  │              │
         ├─── YES ──────┬───┴──────────────┴───┐
         │              │                      │
         └── NO ────→ Ask for clarification    │
                       (Loop back)              │
                                                ▼
                         ┌────────────────┐ ┌────────────────┐
                         │ Phase 4        │ │ Phase 5        │
                         │ RISK ANALYSIS  │ │ VALIDATION     │
                         │                │ │ & GATING       │
                         │ @planning-     │ │                │
                         │ validator      │ │ @planning-     │
                         │ (Phase 4 mode) │ │ validator      │
                         │                │ │ (Phase 5 mode) │
                         │ Output:        │ │                │
                         │ Risk Matrix    │ │ Output:        │
                         │ Mitigations    │ │ Checklist      │
                         │ Blocker Check  │ │ Capacity Check │
                         │                │ │ Gate Decision: │
                         │                │ │ ✅/⚠️/🛑      │
                         └────────────────┘ └────────────────┘
                                  ↓              ↓
                         Gate: Risks OK?   Gate: Ready?
                                  │              │
                                  └──────┬───────┘
                                         │
                        ✅ PROCEED / ⚠️ CAUTION / 🛑 BLOCKED
                                         │
                                         ▼
                        ┌──────────────────────────────────┐
                        │ Save Complete Plan to Memory     │
                        │ Present Executive Summary        │
                        │ Show Wave Schedule & DAG         │
                        │ List Top Risks & Mitigations     │
                        │ Confirm Gate Decision            │
                        └──────────────────────────────────┘
```

---

## Planning Modes

```
QUICK (30 min)          STANDARD (1-2 hrs)      DEEP (2-4 hrs)          SPIKE (1-2 hrs)
─────────────           ──────────────────      ──────────────          ───────────────
Research                Research                Research                Deep Research
  │                       │                       │                       │
  ├→ Estimate           ├→ Specification        ├→ Specification        ├→ POC Design
  │                       │                       │                       │
  └→ Gate                ├→ Decomposition        ├→ Decomposition        ├→ Risk Check
     │                     │                       │                       │
     Output:              ├→ Risk Analysis        ├→ Risk Analysis        └→ Go/No-Go
     ✓ Outline           │                       ├→ Alternatives           Recommendation
     ✓ Rough timeline      ├→ Validation          ├→ Threat Model
     ✓ Top 3 risks         │                       ├→ Resilience
     ✓ Wave sketch         Output:                ├→ Validation
                           ✓ DAG with waves        │
     Confidence:          ✓ Effort estimates       Output:
     High for known       ✓ Risk matrix            ✓ Exhaustive analysis
     patterns             ✓ Critical path          ✓ Multiple scenarios
                          ✓ Gate decision          ✓ Rollback strategies
                                                  ✓ Threat modeling
                          Confidence:
                          Medium—                 Confidence:
                          comprehensive           High—
                                                 thorough exploration
```

---

## Phase Outputs (Saved to Session Memory)

```
[topic]-research.md
├─ Current System State
├─ Key Patterns (reusable)
├─ Constraints & Prerequisites
└─ Unknowns for Specification Phase

[topic]-specification.md
├─ Business Goal / User Intent
├─ Acceptance Criteria (executable)
├─ Scope: In-Phase vs. Defer
├─ Hard Dependencies
└─ Assumptions & Constraints

[topic]-decomposition.md
├─ Task List (atomic)
├─ DAG (dependency graph)
├─ Wave Schedule (1..N waves)
├─ Critical Path Analysis
├─ Effort Estimates (Task × Confidence)
└─ Parallelization Opportunities

[topic]-risk-register.md
├─ Risk Inventory (ranked by severity)
├─ Risk Matrix (Impact × Probability)
├─ Mitigation Strategies
└─ Blocker Risk Check

[topic]-gate-decision.md
├─ Validation Checklist Results
├─ Go/No-Go Decision (with conditions)
├─ Early Warning Signals
├─ Next Steps & Escalation Path
└─ Confirmation of Readiness

[topic]-full-plan.md (Optional composite summary)
└─ Executive overview of all above
```

---

## Invocation Quick Reference

```
NEW PLANNING
─────────────────────────────────────────────────────────
@planning Plan [topic]
  → Standard mode, full 5-phase pipeline

@planning Plan [topic] with quick
  → Fast estimate (30 min)

@planning Plan [topic] with deep
  → Exhaustive analysis (2-4 hrs)

@planning Spike: [question]?
  → Research-focused discovery

@planning-orchestrator Plan [topic] with standard
  → Hands-off automated planning


RESUME EXISTING PLAN
─────────────────────────────────────────────────────────
@planning Resume from Phase [N] using [topic]
  → Jump to specific phase with prior results

@planning Clarify specification for [topic]
  → Adjust Phase 2 and regenerate downstream


SPECIALIZED SUBAGENTS (Manual)
─────────────────────────────────────────────────────────
@planning-researcher [analysis task]
  → Phase 1 read-only codebase analysis

@planning-decomposer Build DAG for [topic]
  → Phase 3 task breakdown and scheduling

@planning-validator Assess risks in [topic]
  → Phase 4 risk analysis

@planning-validator Validate [topic] for gates
  → Phase 5 go/no-go decision
```

---

## Executable Acceptance Criteria Example

```yaml
Before (Prose):
─────────────────────────────────────────
"Feat system must work with 200+ feats"

After (Executable):
─────────────────────────────────────────
Acceptance Criteria:
  ✓ Criterion: Sheet loads 200+ feats quickly
    Verification: Measure sheet_render_time < 500ms
    Status Check: grep "performance.feat" test:feat:sheet
    Why: Player-facing performance is critical
  
  ✓ Criterion: All 200+ feats in compendium
    Verification: feat-pack.entries.length == 200+
    Status Check: node scripts/verify-feat-count.js
    Why: Content completeness gate
  
  ✓ Criterion: Feat interactions resolve correctly
    Verification: test:feats::mechanics passes
    Status Check: npm test -- --grep "feat.*interaction"
    Why: Core game mechanics must work

Benefits:
  • No ambiguity about "works"
  • Tests are verification method
  • Anyone can check status anytime
  • Builds into CI/CD pipeline
```

---

## Wave Schedule Visual Example

```
Task               Duration  Wave  Dependencies
──────────────────────────────────────────────────────
R1 Research          3h      1     —
R2 Schema Design      2h      1     —
S1 Setup             1h      1     —
                     ──
                     6h       Shortest wave = 3h (R1)
                                      ↓ GATE: Schema approved
I1 Mechanics         4h      2     R2
I2 Sheet View        3h      2     R2
I3 Authoring         2h      2     S1
                     ──
                     9h       Bottleneck = 4h (I1)
                                      ↓ GATE: Prototype working
C1 Content           8h      3     I3
T1 Unit Tests        3h      3     I1
T2 Integration       2h      3     I2
                     ──
                     13h      Limiting factor = 8h (C1)
                                      ↓ GATE: All tests green
D1 Documentation     2h      4     All above
Q1 QA                2h      4     All above
                     ──
                     4h       No parallelization
                                      ↓ GATE: Release approved


Timing Analysis:
─────────────────────────────────────────
Sequential (1 person):     28 hours = 4 weeks (7 days × 4h/day)
Parallel (4 people):       28 ÷ 4 = 7h effective / wave
Calendar time:             4 waves × 1 day/wave = 4 days actual
Speedup:                   4 weeks / 4 days = 7x faster

Wave Duration (with buffer):
  Wave 1 (max 3h): 4 hours wall time
  Wave 2 (max 4h): 4 hours wall time
  Wave 3 (max 8h): 8 hours (C1 full-time, others finish early)
  Wave 4 (max 4h): 4 hours wall time
  
Real calendar: ~3-4 days with proper coordination
```

---

## Integration Points

```
┌─────────────────────────────────────────────────────────┐
│ PLANNING SYSTEM                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Input: User request                                   │
│         Phase documentation                           │
│         Codebase patterns & constraints               │
│                                                         │
│  Processing: Research → Specify → Decompose →         │
│              Analyze Risks → Validate & Gate           │
│                                                         │
│  Output: Complete plan with:                           │
│    • DAG of dependencies                              │
│    • Wave schedule for parallelization                │
│    • Risk matrix with mitigations                     │
│    • Executable acceptance criteria                    │
│    • Go/no-go decision with conditions                │
│    • Session memory checkpoints                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ INTEGRATION WITH EXECUTION                             │
├─────────────────────────────────────────────────────────┤
│  • Wave schedule guides team parallelization           │
│  • Risk log drives early warning system                │
│  • Acceptance criteria feed into test suite            │
│  • Checkpoints enable progress tracking                │
│  • Gate decision blocks/unblocks start                 │
│                                                         │
│ Then: Execute using phase tasksbased on decomposition  │
│       Track progress against criteria                  │
│       Update risk log weekly                           │
│       Resume/adapt if assumptions change               │
└─────────────────────────────────────────────────────────┘
```

---

**Architecture Complete**: 5 specialized agents + orchestrator + comprehensive guide + integration points with execution workflows.

Ready for first planning session ✅
