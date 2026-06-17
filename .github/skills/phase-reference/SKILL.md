---
name: phase-reference
description: "Look up planning phases, track progress, and understand phase dependencies. Find which phase covers a feature or system."
---

# Phase Reference Skill

## Using This Skill

Ask questions like:
- "What phase covers weapon enchantments?"
- "Where are companion NPCs planned?"
- "What's the status of spellcasting?"
- "How many phases until compendium is done?"

This skill helps you:
- **Find phases** covering specific features
- **Track progress** from Phase 1 (Foundation) to Phase 32 (Final Polish)
- **Understand dependencies** between feature areas
- **Plan implementation** based on phase roadmap

## Source of Truth

**For the dnd35e system**, all phase information lives in **[docs/migration-plan/roadmap.md](../../docs/migration-plan/roadmap.md)**.

This is the authoritative reference for:
- All 32 phases (POC, Beta, Release, Post-Release)
- Current status and completion percentages
- Dependencies and milestones
- Detailed specs in `phase-NN-*.md` files

This skill provides guidance on *how to use* phases to plan work. Don't copy phase names or status from here — **always check docs/migration-plan/ for the canonical list**.

## Quick Concept: How Phases Work

The dnd35e roadmap breaks D&D 3.5e system implementation into major deliverables:

**Early phases** build POC fundamentals:
- Foundation (weapons, active effects, i18n)
- Core mechanics (actors, tokens, rolls, actions)
- Combat & validation

**Mid phases** expand to coverage:
- All item types (equipment, spells, consumables, natural attacks)
- All actor types (advanced NPCs, companions)
- Full spell/psionics/enhancement systems

**Late phases** polish & release:
- Compendium management & browser
- Content migration from legacy system
- Community hardening & documentation
- 3rd-party integration

## Finding a Feature's Phase

**Step 1**: Open [docs/migration-plan/roadmap.md](../../docs/migration-plan/roadmap.md) (single source of truth)

**Step 2**: Use Ctrl+F to search the phase table for your feature name. Example: "Where should I add channel resistance for undead?"

→ Search "resistance" or "undead" in the table
→ Found in Phase 20 (Buffs & Conditions Full) or Phase 25 (Natural & Special Attacks)
→ Read the detailed spec in the corresponding `phase-NN-*.md` file

**Step 3**: Check dependencies (also in README.md) to understand prerequisites

## Phase Document Structure

Each phase in `docs/migration-plan/` has:

**In roadmap.md table**:
- Phase number and name
- Current status (✅ Complete, 🔶 In Progress %, 📋 Outlined, 📖 Rough Sketch)
- Dependencies (which phases must be done first)
- Milestone (POC / Beta / Release / Post-Release)

**In phase-NN-*.md file** (detailed spec):
- **Goals**: What the phase accomplishes
- **Features**: Specific mechanics, data models, item types
- **Dependencies**: Prerequisite phases with rationale
- **Implementation notes**: Architecture decisions and patterns
- **Scope notes**: What's included vs. deferred

**Dependency graph**: `roadmap.md` includes a DAG showing which phases unlock which. Plan parallel work by following this graph.

## Related Skills

- **foundry-reference**: API details for building features
- **system-comparison**: How 5e vs pf2e vs d35e handle similar features
- **implementation-guide**: Step-by-step for bringing phase goals to code

## How to Request Help

When asking about a feature:

**Good**: "Phase 5 covers spellcasting. I'm implementing prepared spells and need to know the structure."

**Better**: "What phase covers spell effects? I need to know where to add spell resistance."

**Best**: "I'm implementing channel resistance for undead. What phase covers monster features? How does d35e handle energy resistances compared to 5e?"
