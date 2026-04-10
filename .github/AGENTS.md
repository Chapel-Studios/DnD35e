# D&D 3.5e System — Custom Agents

Custom agents and skills for D&D 3.5e system planning and architecture work.

## Planning Agents

### planning
**When to use**: Planning a new phase, refining existing phase design, reviewing architecture, or making cross-phase decisions.

**Capabilities**:
- Synthesize all phase documentation and dependencies
- Ask clarifying questions about scope and approach
- Design comprehensive phase specs with clear goals and implementation steps
- Reference established patterns (build system, content authoring, infrastructure)
- Provide traceoff analysis and identify risks
- Create detailed completion checklists

**Invoke**: Type `@planning` or ask directly (e.g., "Help me design Phase 5: Feats")

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

1. **To plan a new phase**:
   ```
   @planning Design Phase 5: I want to add feat support with SRD content
   ```

2. **To improve planning documentation**:
   ```
   /phase-planning Section 4.2 duplicates section 4.8, consolidate them
   ```

3. **To check system status**:
   - See `docs/migration-plan/README.md` for full roadmap
   - See `docs/migration-plan/phase-04-compendium-foundation.md` for Phase 4 (PLANNED)
