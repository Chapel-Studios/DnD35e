# KB Curator Agent — Design & Rationale

## Overview

The KB Curator (`@kb-curator`) is a sophisticated documentation agent that capstones work sessions by extracting patterns, validating consistency, identifying gaps, and keeping the knowledge base current and useful.

## Design Sources & Inspiration

The KB Curator combines best practices from multiple documentation and knowledge management approaches:

### 1. **Pattern Recognition Systems**
- **From**: Software architecture pattern catalogues (Gang of Four, architectural patterns)
- **Borrowed**: Code pattern extraction through repeated observation
- **Applied as**: Automatic pattern detection across session work ("did I just repeat this?")

### 2. **Technical Writing Standards**
- **From**: Technical documentation best practices (Diataxis framework, Write the Docs)
- **Borrowed**: Distinction between reference (instructions), tasks (skills), explanation (architecture)
- **Applied as**: Different file types for different purposes (instruction vs skill vs memory)

### 3. **Knowledge Management**
- **From**: Obsidian/Roam Research linking patterns, wiki gardening practices
- **Borrowed**: Atomic notes with cross-references, avoiding duplication through linking
- **Applied as**: Consistent markdown links, related section recommendations, consolidation workflow

### 4. **Session-Based Learning**
- **From**: Productive note-taking systems (Zettelkasten, Cornell Notes)
- **Borrowed**: Capture during work → review after work → extract insights → reorganize
- **Applied as**: Phase 1 (analyze), Phase 2 (recommend), Phase 3 (feedback), Phase 4 (implement)

### 5. **Documentation Auditing**
- **From**: Code review processes, technical review practices
- **Borrowed**: Consistency checking, accuracy validation, completeness checklists
- **Applied as**: Cross-reference validation, terminology consistency, example accuracy

### 6. **Emerging Copilot Agent Patterns**
- **From**: Specialized agent design (planning agent, domain experts)
- **Borrowed**: Narrowly scoped agent with clear trigger points and workflow
- **Applied as**: @kb-curator special agent invoked at session end, layered recommendations

## What Makes It "Super Smart"

### 1. **Context-Aware Analysis**
- Understands your codebase structure (instructions, skills, phases, memory)
- Knows what each file type should contain (quality standards)
- Recognizes patterns specific to dnd35e (bonus stacking, view modes, etc.)

### 2. **Multiple Lenses**
- **Implementation lens**: "Did code reveal a new pattern we should document?"
- **Architecture lens**: "Does this align with established architecture patterns?"
- **User lens**: "Would future developers find this workflow easily?"
- **Consistency lens**: "Does this terminology match existing docs?"

### 3. **Workflow Intelligence**
- Recognizes workflow patterns (repeated steps worth systematizing)
- Distinguishes between one-off solutions and reusable approaches
- Prioritizes high-impact documentation (what helps most future work)

### 4. **Gap Detection**
- Compares session work against existing KB (what's missing?)
- Identifies redundant documentation (what says the same thing?)
- Spots incomplete sections (what needs expanding?)
- Finds broken links (what references no longer valid?)

## How It Differs from Other Tools

| Aspect | Planning Agent | KB Curator |
|--------|----------------|-----------|
| **When** | Before work (planning phase) | After work (curation phase) |
| **Scope** | Architecture & phases | Documentation & knowledge |
| **Workflow** | Design → implement | Analyze → recommend → validate |
| **Output** | Phase specs, checklists | KB updates, gap reports |
| **Reusability** | One-time per phase | After every session |

## Core Workflows

### Workflow 1: Extract Patterns from Implementation
```
Session work: Implemented EditValue pattern in FormGroup + DerivedFormGroup
↓ Recognition: "This pattern appeared in 3+ files"
↓ Extraction: "This is the EditValue pattern that deserves documentation"
↓ Action: Suggest update to vue-sheet-patterns with new example
```

### Workflow 2: Cross-Reference Validation
```
Docs check: Verify system-comparison references all three systems
↓ Finding: "Saves discussion only covers 5e and PF2e, d35e missing"
↓ Action: Suggest section on d35e saves with example
```

### Workflow 3: Consolidation
```
Survey: Find "bonus stacking" mentioned in 3 different files without cross-ref
↓ Analysis: Different contexts (item enhancement, active effects, spell bonuses)
↓ Recommendation: Reference the authoritative dnd35e-patterns file from others
```

### Workflow 4: Completeness Audit
```
Phase check: Review Phase 4 compendium documentation
↓ Checklist: Go through "Goals", "Features", "Build system changes", etc.
↓ Finding: Build system changes documented, but example code missing
↓ Action: "Suggest adding code example to system.json template section"
```

## Knowledge Representation

The KB curator understands your documentation as **layers**:

```
AGENTS.md (Discovery Hub)
    ↓ Points to
Instruction Files (Deep Reference)  ←→  Skills (Workflows)
    ↓ Reference                          ↓ Reference
PHASE Documentation (Architecture)       Repo Memory (Facts)
```

- **Horizontal links**: Instructions reference related skills, skills reference instructions
- **Vertical links**: High-level discovery (AGENTS.md) → detailed reference → implementation
- **Memory links**: Codebase facts stored separately from documentation

## Quality Assurance

The KB curator validates:

| Check | Red Flag | Fix |
|-------|----------|-----|
| Accuracy | Examples outdated, API changed | Test against codebase |
| Completeness | Section title but no content | Add examples or defer |
| Consistency | "formula resolution" vs "formula evaluation" | Standardize terminology |
| Linkage | "See related file" but link broken | Update or remove reference |
| Redundancy | Same topic in 2 instruction files | Consolidate + cross-ref |
| Alignment | Instruction contradicts actual code | Update docs or verify code |

## Invocation Patterns

### Pattern 1: Light Curation (End of Session)
```
@kb-curator Review this session and update KB appropriately
→ Analyzes work, lists 2-3 key updates needed
→ Proposes specific changes with examples
```

### Pattern 2: Targeted Audit (Before Major Work)
```
@kb-curator Verify phase-04 documentation is complete
→ Checks against completion checklist
→ Reports status and gaps
```

### Pattern 3: Cross-System Validation (System-Specific)
```
@kb-curator Does our system-comparison still match dnd35e behavior?
→ Samples examples, tests against code
→ Reports accuracy issues
```

### Pattern 4: Gap Analysis (Finding Unknown Unknowns)
```
@kb-curator What documentation gaps exist in our KB?
→ Analyzes AGENTS.md coverage
→ Identifies missing skills, instruction holes
```

## Integration with Other Agents

- **@planning**: KB curator can verify that phases reference current implementation
- **@semantic_search**: Both can search codebase for patterns, KB curator adds documentation angle
- **Skills**: KB curator suggests new skills based on session workflows

## Maintenance & Scaling

**Cadence**:
- **After each session**: Lightweight review (1-2 file updates)
- **After feature complete**: Deep audit (multiple files, cross-references)
- **Monthly**: Comprehensive consistency check
- **Phase end**: Full KB review before phase completion

**Scaling considerations**:
- As KB grows, curator maintains index (AGENTS.md) carefully
- Prevents documentation sprawl through consolidation workflow
- Uses consistent structure (YAML frontmatter, markdown links) for automation

## Why This Design Works

1. **Integrates with workflow**: Invoked naturally at session end, not forced interruption
2. **Layered recommendations**: Shows what to do now vs. later vs. eventually
3. **Evidence-based**: Links suggestions to specific session work or codebase facts
4. **Non-breaking**: Proposes, doesn't implement; user has final say
5. **Scalable**: Maintains consistency as KB grows from 6 to 20+ files
6. **Reusable**: Same patterns work across any domain (not d35e-specific)
