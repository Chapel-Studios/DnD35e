# D&D 3.5e System — Custom Agents

Custom agents and skills for D&D 3.5e system planning, architecture, and knowledge curation.

## Core Agents

### planning
**When to use**: Break down phases into concrete deliverables (user-facing stories), identify what work can happen in parallel, and route tasks by skill level (lead dev, jr dev, pair).

**Capabilities**:
- **Deliverable-oriented decomposition**: Group work by user-visible stories, not technical layers
- **UI/UX design inquiry**: Asks about and understands the design before decomposing work
- **Parallelization analysis**: Show which stories are independent and can run simultaneously
- **Skill-based routing**: Recommend whether a task is good for lead dev, jr dev, pair, or flexible
- **Dependency mapping**: Clarify what must complete before what
- **Registration awareness**: Ensures new document subtypes are wired into system.json, registration, and creation dialog
- **Acceptance criteria**: Define how to verify each deliverable is done

**Invoke**: 
- Basic planning: `@planning Plan Phase 5 Feats`
- Decompose with analysis: `@planning Break down feat content authoring into parallel tracks`
- Phase execution: `@planning Review Phase 2 spec and decompose into atomic tasks`

**Output**: Task breakdown with parallelization diagram, dependency map, and skill routing recommendations

**Real-world example** (Phase 2): Planning agent created 12-track decomposition with 3 concurrent streams, skill routing (lead dev 8 tracks, jr dev 4), and critical path identification in one invocation. Output: `phase-02-task-decomposition.md`.

**See also**: 
- `.github/agents/planning-researcher.agent.md` for codebase pattern analysis (optional deep dive)
- `.github/agents/planning-decomposer.agent.md` for detailed DAG building (optional deep dive)
- `.github/agents/planning-validator.agent.md` for risk analysis and validation (optional gating)

### kb-curator
**When to use**: End of session to update documentation, detect and extract patterns, validate consistency, or audit KB completeness.

**Capabilities**:
- Analyze session work to identify patterns worth documenting
- Suggest updates to instruction files with specific examples
- Propose new skills for workflows that emerged
- Validate documentation accuracy against current codebase
- Audit phase documentation completeness and correctness
- Review KB assets (instruction files, skills, agents) for consistency
- Detect gaps in KB coverage
- Check consistency of terminology, cross-references, examples
- Run terminology drift audits against runtime constants/types before final docs
- Add regression guardrails from session mistakes (root cause -> prevention rule)
- Enforce platform-safe command guidance in curation notes (PowerShell vs Unix utilities)
- Consolidate redundant documentation
- Capture verified codebase knowledge in repository memory
- Suggest phase-specific audits before starting new work

**Invoke**: Type `@kb-curator` at session end or for specific audits:
- Light curation: `@kb-curator Review this session and update KB appropriately`
- Phase audit: `@kb-curator Validate Phase 4 documentation is complete`
- Asset review: `@kb-curator Review the 6 new instruction files for consistency`
- Gap analysis: `@kb-curator What documentation gaps exist in our KB?`

**See also**: `.github/agents/kb-curator.agent.md` for "Curation in Action" concrete example

### silversmith
**When to use**: Implement a phase from the migration plan — one checklist item at a time with approval gates between each section. Design-focused, D35E-aware, and pattern-matching.

**Workflow**: Discuss-then-build. At phase start, SilverSmith reads the spec, **asks about UI/UX design for every user-facing feature**, agrees on design and scope. Then executes one checklist item at a time: implement → build clean → report → wait for your Foundry testing → approval → next item.

**Capabilities**:
- **Phase onboarding**: Reads spec + dependencies, surfaces ambiguities, proposes execution order
- **Section execution**: One checklist item per cycle with mandatory `npm run build` verification
- **Design focus**: Visual/UX, component architecture, and data model design equally
- **D35E awareness**: References legacy D35E source for migration decisions (reads via `local.config.json` paths)
- **Pattern matching**: Studies existing codebase patterns before writing new code — asks when patterns conflict
- **Homebrew thinking**: Designs for extensibility — "how would a homebrewer add to this?"
- **Token efficiency**: Delegates to `@kb-curator` to cache discovered Foundry/D35E patterns in compressed-for-AI KB files
- **Subagent delegation**: Uses `@Explore` for codebase research, `@kb-curator` for knowledge capture
- **Progress tracking**: Updates phase checklists and session memory after each approved section

**Invoke**:
- Start a phase: `@silversmith Let's start Phase 6 — Actor Foundation`
- Resume work: `@silversmith Where were we?`
- Continue after approval: `@silversmith Approved, next section`

**Boundary system**:
- **Always do**: Read spec, match patterns, build clean, stop for approval
- **Ask first**: Pattern conflicts, architecture decisions, scope questions, modifying code outside current section
- **Never do**: Skip approval, scope creep, hardcode English, add unplanned features, modify KB files directly

**See also**: `.github/agents/silversmith.agent.md` for full workflow, communication modes, and design principles

---

## Planning Subagents (Optional Deep Dives)

These specialized agents can be invoked directly for specific planning tasks:

### planning-researcher
**When to use**: Understand current codebase patterns, existing implementations, and constraints before planning. Helps identify reusable patterns and design decisions.

**Produces**: Research findings (patterns found, constraints, prerequisites, unknowns)

**Invoke**: `@planning-researcher Analyze current feat system patterns` or `@planning-researcher What patterns exist for [feature]?`

### planning-decomposer
**When to use**: Build detailed dependency graphs, clarify task ordering, and show parallelization opportunities. Useful for complex features with many interconnected tasks.

**Produces**: Dependency graph with tasks, dependencies, and parallelization analysis

**Invoke**: `@planning-decomposer Build task graph for feat content authoring` or `@planning-decomposer What must complete before [task]?`

### planning-validator
**When to use**: Identify risks, blockers, and capacity constraints. Validate that a plan is feasible before committing to it.

**Produces**: Risk assessment, mitigation strategies, go/no-go recommendation

**Invoke**: `@planning-validator Validate Phase 5 plan for blockers` or `@planning-validator What could go wrong with [approach]?`

---

## Skills

### phase-planning
**When to use**: Improving planning documentation—consolidating sections, updating checklists, extracting patterns, clarifying decisions.

**Capabilities**:
- Identify redundancy and ambiguity in phase documents
- Suggest consolidation strategies with exact edits
- Reorganize for better clarity
- Update completion checklists to match progress
- Extract reusable patterns across phases
- Add cross-references between phases
- Run anti-regression checks for terminology drift and claim accuracy after implementation-heavy sessions

**Invoke**: Type `/phase-planning` or describe the documentation improvement needed

### phase-reference
**When to use**: Looking up which phase covers a feature, tracking progress, understanding dependencies.

**Capabilities**:
- Find phases covering specific mechanics or content
- Show phase status and approximate scope
- Explain dependencies between phases
- Map features to their phase location

**Invoke**: Type `/phase-reference` (e.g., "What phase covers undead resistances?")

### foundry-reference
**When to use**: Querying Foundry VTT API, understanding data structures, learning methods and events.

**Capabilities**:
- Explain Document types, DataModels, and DataFields
- Show common API patterns (create, update, query, delete)
- Document hooks and events
- Clarify data layer organization

**Invoke**: Type `/foundry-reference` (e.g., "How do I listen to item updates?")

### system-comparison
**When to use**: Comparing how 5e, PF2e, and D&D 3.5e handle similar mechanics or porting features.

**Capabilities**:
- Compare ability scores, attack bonuses, saves, resistances
- Show feat/spell differences between systems
- Explain item rarity and scaling differences
- Help port features from one system to another

**Invoke**: Type `/system-comparison` (e.g., "How do 5e and 3.5e handle resistances?")

### implementation-guide
**When to use**: Step-by-step workflows for adding item types, mechanics, compendium entries, or features.

**Capabilities**:
- Walk through adding new item types (schema → sheet → registration)
- Show how to implement mechanics (design → schema → UI → testing)
- Explain compendium entry workflows
- Provide implementation checklists

**Invoke**: Type `/implementation-guide` (e.g., "How do I add a new item type?")

### e2e-testing
**When to use**: Adding a new Playwright E2E spec, or deciding between unit and E2E coverage for a behavior.

**Capabilities**:
- Decision matrix for unit vs E2E test selection
- Step-by-step workflow for writing a new spec (selectors → helpers → assertions → run)
- Reference list of existing helpers and which pattern each demonstrates
- Troubleshooting recipes for the three recurring pitfalls (overlay interception, blur commit, view-mode-conditional DOM)
- Naming conventions for specs and helpers

**Invoke**: Type `/e2e-testing` (e.g., "How do I add an E2E for the inventory drag-drop?")

---

## Instruction Files

Instruction files auto-load when you edit matching files, providing quick reference without context switching.

### foundry-data-fields
**Auto-loads on**: DataModel or Schema files

**Covers**: Field types (NumberField, StringField, etc), hierarchy, options, common patterns

**Quick mental model**: Foundry fields are hierarchical validators + storage. Understand SchemaField nesting, `useDnd35eField()` override defaults, `withFamiliar()` familiar metadata, and special field types (PriceField, FormulaField, etc).

### dnd35e-patterns
**Auto-loads on**: Component or DataModel files in d35e system

**Covers**: Component composition chains, data model organization, formula resolution, Active Effects, identifiable/secret display behavior, bonus stacking

**Quick mental model**: Build features by composing mixins → DataModel → Store → Sheet. Each layer handles one responsibility.

### vue-sheet-patterns
**Auto-loads on**: `.vue` files

**Covers**: Sheet view modes (`edit`/`play`/`true`), EditValue pattern, field permissions, FormGroup base, control button styling

**Quick mental model**: Sheets use a unified 3-state mode model. Store getters handle view-aware values. FormGroups use source values only in edit mode.

### formula-familiar
**Auto-loads on**: Formula-related files

**Covers**: FormulaFamiliar API, formula syntax (dice + references), scope objects, evaluation patterns, caching, error handling

**Quick mental model**: FormulaFamiliar stores formula strings that parse once then evaluate with scope. Never cache results—formulas are already cached internally.

### dnd35e-field
**Auto-loads on**: Field permissions, view-aware getters, or field override usage

**Covers**: Field permissions (visibility/editability), field override cascade, view-aware getters, FormGroup integration

**Quick mental model**: Field permissions live in `flags.dnd35e.fieldOverrides` and cascade parent-to-child with most-restrictive-wins. Use store getters (`getViewAwareFieldValue`, `getSourceProperty`) for all field access in sheet components.

### form-groups
**Auto-loads on**: FormGroup or sheet component files

**Covers**: FormGroup base component, FormGroupSection, specialized components (Number, String, Select, RichText, Tags), composition patterns, permission-aware rendering

**Quick mental model**: All FormGroups inherit from base class. Sections auto-hide when invisible. Use EditValue pattern to handle view modes correctly.

### e2e-testing
**Auto-loads on**: `tests/e2e/**`

**Covers**: Helper inventory, stable selector strategy (`data-field-path`, `title` attr, never localized text), world-isolation idioms (`clearWorld` + `closeAllSheets`), the three recurring pitfalls (overlay interception, `Tab`-not-`blur()` commits, view-mode-conditional DOM), authentication via `storageState`, programmatic document creation patterns, unit-test companion guidance.

**Quick mental model**: Drive documents through Foundry's API, assert on stable hooks, never inline what a helper already does. Localized text and `input.blur()` are footguns; `dismissOverlays` + `data-field-path` + `Tab` + `expect.poll` are the idioms.

---

## Planning Context

All planning agents and skills understand:
- ✅ **Phase 1-4 specs**: Architecture, material system, grants, compendiums (Phase 4 PLANNED)
- ✅ **Established patterns**: Build system (template + Vite), content authoring (CSV → Macro → Transform), infrastructure (origin tracking, UUID helpers)
- ✅ **Deferred work**: Why certain features are planned for Phase 26+ instead of earlier
- ✅ **Dependencies**: Which phases enable which other phases

---

## Planning Documents

- **Roadmap**: `docs/migration-plan/roadmap.md` — Full system roadmap through Phase 28
- **Phase Specs**: `docs/migration-plan/<wave>/phase-NN-*.md` — Individual phase specifications with checklist
- **Quick Reference**: At-a-glance status and common planning questions (in progress)

---

## Getting Started

Choose the right tool for your task:

### Architecture & Planning
```
@planning Design Phase 5: I want to add feat support with SRD content
```

### Development Work (Implementation, Fixes, Features)
- Edit code → Instruction files auto-load (`vue-sheet-patterns`, `dnd35e-patterns`, etc)
- Ask `/foundry-reference` for API help
- Ask `/system-comparison` when porting from 5e/PF2e
- Ask `/implementation-guide` for step-by-step workflows
- Ask `/e2e-testing` when adding test coverage for a user-visible behavior

### End of Session (Knowledge Base Curation)
```
@kb-curator Review this session and update KB appropriately
```

The KB curator will:
- Identify patterns worth documenting
- Suggest instruction file updates
- Propose new skills for workflows
- Validate documentation accuracy
- Report gaps and inconsistencies

### Session-Specific Audits
```
@kb-curator Check if vue-sheet-patterns has complete EditValue documentation
@kb-curator Is system-comparison still accurate for active effects?
@kb-curator What codebase patterns did we discover today?
```

Use Case Examples:
- **After implementing new feature**: KB curator identifies patterns to document in instructions
- **After fixing bugs**: KB curator suggests error patterns to add to related instruction file
- **Before starting new phase**: KB curator validates prerequisite phase docs are up-to-date
- **Monthly maintenance**: KB curator audits all docs for accuracy and consistency

---

## Status

- Phase 1-2: ✅ Complete
- Phase 3 (Localization): 🟡 75% — LOCALIZATION_PREFIXES, lang files, FormGroup auto-labels done; CONFIG pre-localization & hardcoded string audit remain
- Phase 4: ✅ Complete
- Phase 5-32: 📋 Planned (see `docs/migration-plan/roadmap.md`)
- Instruction Files: 7 ✅ (foundry-data-fields, dnd35e-patterns, vue-sheet-patterns, formula-familiar, dnd35e-field, form-groups, e2e-testing)
- Skills: 6 ✅ (phase-planning, phase-reference, foundry-reference, system-comparison, implementation-guide, e2e-testing)
- Agents: 2 ✅ (planning, kb-curator)
