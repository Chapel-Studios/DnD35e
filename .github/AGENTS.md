# D&D 3.5e System — Custom Agents

Custom agents and skills for D&D 3.5e system planning, architecture, and knowledge curation.

## Core Agents

### planning
**When to use**: Break down phases into concrete tasks, identify what work can happen in parallel, and route tasks by skill level (lead dev, jr dev, pair).

**Capabilities**:
- **Task decomposition**: Break phases into atomic, bounded, verifiable tasks
- **Parallelization analysis**: Show which tasks are independent and can run simultaneously
- **Skill-based routing**: Recommend whether a task is good for lead dev, jr dev, pair, or flexible
- **Dependency mapping**: Clarify what must complete before what
- **Acceptance criteria**: Define how to verify each task is done

**Invoke**: 
- Basic planning: `@planning Plan Phase 5 Feats`
- Decompose with analysis: `@planning Break down feat content authoring into parallel tracks`

**Output**: Task breakdown with parallelization diagram, dependency map, and skill routing recommendations

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
- Consolidate redundant documentation
- Capture verified codebase knowledge in repository memory
- Suggest phase-specific audits before starting new work

**Invoke**: Type `@kb-curator` at session end or for specific audits:
- Light curation: `@kb-curator Review this session and update KB appropriately`
- Phase audit: `@kb-curator Validate Phase 4 documentation is complete`
- Asset review: `@kb-curator Review the 6 new instruction files for consistency`
- Gap analysis: `@kb-curator What documentation gaps exist in our KB?`

**See also**: `.github/agents/kb-curator.agent.md` for "Curation in Action" concrete example

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

---

## Instruction Files

Instruction files auto-load when you edit matching files, providing quick reference without context switching.

### foundry-data-fields
**Auto-loads on**: DataModel or Schema files

**Covers**: Field types (NumberField, StringField, etc), hierarchy, options, common patterns

**Quick mental model**: Foundry fields are hierarchical validators + storage. Understand SchemaField nesting, Dnd35eField wrapping, and special field types (FormulaFamiliar, etc).

### dnd35e-patterns
**Auto-loads on**: Component or DataModel files in d35e system

**Covers**: Component composition chains, data model organization, formula resolution, Active Effects, Identified/Unidentified pattern, bonus stacking

**Quick mental model**: Build features by composing mixins → DataModel → Store → Sheet. Each layer handles one responsibility.

### vue-sheet-patterns
**Auto-loads on**: `.vue` files

**Covers**: Sheet view modes (edit/view + identified/unidentified), EditValue pattern, field permissions, FormGroup base, control button styling

**Quick mental model**: Sheets have two independent axes. Store getters handle view mode logic. FormGroups accept effective values, know about source values for editing.

### formula-familiar
**Auto-loads on**: Formula-related files

**Covers**: FormulaFamiliar API, formula syntax (dice + references), scope objects, evaluation patterns, caching, error handling

**Quick mental model**: FormulaFamiliar stores formula strings that parse once then evaluate with scope. Never cache results—formulas are already cached internally.

### dnd35e-field
**Auto-loads on**: Compound field or Dnd35eField usage

**Covers**: Dnd35eField structure, unidentified overrides, field permissions (visibility/editability), view-aware getters, FormGroup integration

**Quick mental model**: Dnd35eField wraps values with metadata (real + override values, permissions). Store getters handle view mode logic. Always use getViewAwareFieldValue for display.

### form-groups
**Auto-loads on**: FormGroup or sheet component files

**Covers**: FormGroup base component, FormGroupSection, specialized components (Number, String, Select, RichText, Tags), composition patterns, permission-aware rendering

**Quick mental model**: All FormGroups inherit from base class. Sections auto-hide when invisible. Use EditValue pattern to handle view modes correctly.

---

## Planning Context

All planning agents and skills understand:
- ✅ **Phase 1-4 specs**: Architecture, material system, grants, compendiums (Phase 4 PLANNED)
- ✅ **Established patterns**: Build system (template + Vite), content authoring (CSV → Macro → Transform), infrastructure (origin tracking, UUID helpers)
- ✅ **Deferred work**: Why certain features are planned for Phase 26+ instead of earlier
- ✅ **Dependencies**: Which phases enable which other phases

---

## Planning Documents

- **Roadmap**: `docs/migration-plan/README.md` — Full system roadmap through Phase 28
- **Phase Specs**: `docs/migration-plan/phase-NN-*.md` — Individual phase specifications with checklist
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
- Phase 5-32: 📋 Planned (see `docs/migration-plan/README.md`)
- Instruction Files: 6 ✅ (foundry-data-fields, dnd35e-patterns, vue-sheet-patterns, formula-familiar, dnd35e-field, form-groups)
- Skills: 5 ✅ (phase-planning, phase-reference, foundry-reference, system-comparison, implementation-guide)
- Agents: 2 ✅ (planning, kb-curator)
