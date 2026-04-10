---
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

## Quick Phase Overview

### Foundation & Infrastructure (1-4)
- **Phase 1**: Data model foundation, item/actor schemas
- **Phase 2**: Core mechanics (abilities, skills, feats)
- **Phase 3**: Combat system (attacks, AC, saves)
- **Phase 4**: Compendium foundation, data packing

### Magic & Special Abilities (5-10)
- **Phase 5**: Spellcasting basics, spell slots, prepared spells
- **Phase 6**: Spell effects and application
- **Phase 7**: Magical items and item properties
- **Phase 8**: Active effects, condition system
- **Phase 9**: Special abilities, class features
- **Phase 10**: Monster/NPC special attacks

### Advanced Features (11-16)
- **Phase 11**: Multiclassing & prestige classes
- **Phase 12**: Experience & leveling
- **Phase 13**: Companion animals, cohorts, followers
- **Phase 14**: Crafting & enchanting
- **Phase 15**: Scripted events & automation
- **Phase 16**: Encumbrance & inventory management

### Content & Balance (17-22)
- **Phase 17**: Expanded content (creatures, NPCs)
- **Phase 18**: Campaign tools (encounter builders)
- **Phase 19**: Rules variants & optional mechanics
- **Phase 20**: Monster manual compendium completion
- **Phase 21**: Spell compendium completion
- **Phase 22**: Item compendium completion

### Polish & Integration (23-28)
- **Phase 23**: Performance optimization
- **Phase 24**: Module integration
- **Phase 25**: Migration tools for existing campaigns
- **Phase 26**: Accessibility features
- **Phase 27**: Theming & customization
- **Phase 28**: Documentation & tutorials

### Release & Maintenance (29-32)
- **Phase 29**: Beta testing & community feedback
- **Phase 30**: Release candidate & final bugs
- **Phase 31**: Official v1.0 release
- **Phase 32**: Post-release maintenance

## Phase Status

| Range | Status |
|-------|--------|
| 1-4 | **COMPLETE** ✅ |
| 5-10 | **PLANNED** ⏳ |
| 11-32 | **NOT STARTED** ⏵ |

## Finding a Feature's Phase

**Example**: "Where should I add channel resistance for undead?"

→ Look in planning phase documents for "undead" or "resistance"
→ Likely in Phase 7-8 (Magic/Special Abilities) or Phase 10 (Monster Features)
→ Check `phase-XX-*.md` files for details

## Phase Document Structure

Each phase has:
- **Goals**: What gets done
- **Features**: Specific items, mechanics, data models
- **Dependencies**: What must be done first
- **Implementation notes**: How to build it

Example: `phase-05-spellcasting.md` covers:
- Spell slot system
- Spell preparation
- Spell casting mechanics
- Spell effects application

## Related Skills

- **foundry-reference**: API details for building features
- **system-comparison**: How 5e vs pf2e vs d35e handle similar features
- **implementation-guide**: Step-by-step for bringing phase goals to code

## How to Request Help

When asking about a feature:

**Good**: "Phase 5 covers spellcasting. I'm implementing prepared spells and need to know the structure."

**Better**: "What phase covers spell effects? I need to know where to add spell resistance."

**Best**: "I'm implementing channel resistance for undead. What phase covers monster features? How does d35e handle energy resistances compared to 5e?"
