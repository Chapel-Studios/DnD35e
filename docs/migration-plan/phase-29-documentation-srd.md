# Phase 29: User Guide & Documentation Finalization + SRD Housing

**Status**: 📖 Rough Sketch (350+ item checklist, user guide, SRD housing)

> **Milestone**: Post-Release  
> **Dependencies**: Phase 28 (Community Hardening)  
> **Goal**: Write comprehensive, hardened user guides based on Phase 28 feedback. House the complete D&D 3.5e SRD as in-game reference material. Create tutorials and troubleshooting guides. Lock down documentation for long-term maintainability.

---

## 29.1 Why Documentation Comes After Community Hardening

Phase 28 revealed what settings GMs actually want, which defaults felt off, and where the system confused users. Writing docs before Phase 28 meant explaining incorrect defaults and missing settings. Writing after means documentation describes the system as it actually works—defaults tuned, controls solidified.

---

## 29.2 User Guide Structure

### Getting Started (10-15 pages)
- System overview "what is dnd35e?"
- Character creation walkthrough
- First combat tutorial
- Common mistakes and how to avoid them

### Character Sheet Reference (20-25 pages)
- Every field explained with examples
- Which fields are editable, which are locked, and why
- How to override defaults per-character
- Bonus stacking explained for players

### GM Tools & Settings (15-20 pages)
- Setting up worlds
- Campaign management
- Visibility/editability controls (drawn from Phase 28)
- Common customizations
- Troubleshooting errors

### Bonus Stacking Deep Dive (10-15 pages)
- Full rules with examples
- How chat cards show stacking
- Common confusion resolved
- Why certain bonuses don't stack

### System Features (20-30 pages)
- Action system and chains
- Formula Familiar usage
- Per-field controls
- Combat tracking
- Prepared vs. spontaneous spells (Phase 16)

### SRD Reference (100+ pages, dynamically generated)
- All weapons, armor, equipment
- All feats (searchable)
- All spells (searchable)
- All classes (searchable)
- All races (searchable)
- All conditions and effects
- Complete D&D 3.5e rules table of contents

---

## 29.3 SRD Housing Implementation

**Goal**: SRD is searchable inside the system, not just a PDF.

### SRD Journal Structure
```
📖 D&D 3.5e System Reference Document
  ├── Core Rules
  │   ├── Skills
  │   ├── Feats
  │   ├── Combat
  │   ├── Magic
  │   └── Conditions
  ├── Equipment
  │   ├── Weapons
  │   ├── Armor & Shields
  │   └── Wondrous Items
  ├── Characters
  │   ├── Races
  │   ├── Classes
  │   ├── Prestige Classes
  │   └── Multiclassing
  ├── Bestiary (Creatures)
  └── Appendices
      ├── Tables & Charts
      └── Conversion Notes (3.0 → 3.5e)
```

### Search & Cross-linking
- Every feat links to related feats
- Spells link to material components (linked to equipment)
- Classes link to class skills and bonus feats
- Full-text searchable

### Implementation
- Create from existing SRD compendium data
- Generate journal entries from compendium JSON at build time
- Embed links within text (e.g., "See [Weapon Focus](#) feat")
- Build a search index for sidebar integration

---

## 29.4 Tutorials & Walkthroughs

### Video-Ready Tutorials (text + screenshots)
- "Create Your First Fighter"
- "Your First Combat: Turn by Turn"
- "Understanding Bonus Stacking"
- "Using Feats in Combat"
- "Spell Casting 101"

### Troubleshooting Guide
Common issues from Phase 28 feedback:
- "Why did that bonus not apply?"
- "Why is my AC showing this value?"
- "How do I roll with modifiers?"
- "What does this error mean?"

### FAQ
- "Can I use 3rd party content?"
- "How do I adjust default values?"
- "Can I hide/show sheets fields?"
- "What modules are compatible?"

---

## 29.5 Field Override Documentation (from Phase 28)

For each character sheet field, document:
- **Default visibility**: shown/hidden to players
- **Default editability**: locked/editable
- **Why**: brief rationale
- **How to override**: which setting controls it
- **Example use cases**: "A GM might hide XP to keep it a surprise"

This documentation draws directly from Phase 28's "FIELD_OVERRIDE_GUIDE.md".

---

## 29.6 Link to Module Compatibility

Include in docs:
- Link to MODULE_COMPATIBILITY.md (from Phase 32)
- "Recommended modules" sidebar with links
- "Known incompatibilities" warning box
- Setup guide for popular modules (Bluetooth Dice, etc.)

---

## 29.7 Localization Preparation

All documentation strings must use i18n keys so translations can be added later:
- `docs.getting-started.title`
- `docs.character-sheet.ability-score`
- etc.

Build framework for translation volunteers without implementing all translations (scope for future).

---

| Create | `docs/USER_GUIDE.md` — main user guide (markdown, 100+ sections) |
| Create | `docs/GETTING_STARTED.md` — quick-start guide |
| Create | `docs/BONUS_STACKING_EXPLAINED.md` — deep dive with examples |
| Create | `docs/TROUBLESHOOTING.md` — common issues and fixes |
| Create | `docs/FAQ.md` — frequently asked questions |
| Create | `src/journals/srd-reference/` — SRD journal entry files (auto-generated from compendium) |
| Create | `src/build/generate-srd-journal.ts` — build script to generate SRD journal from packs |
| Create | `docs/FIELD_OVERRIDE_REFERENCE.md` — (pulled from Phase 28) |
| Modify | `system.json` — link to docs in manifest |
| Modify | README.md — "See docs/" reference |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 29 has not started)

### ❌ Not Started (All Tasks for Phase 29)

**Data Input from Phase 28:**
- [ ] Retrieve `docs/COMMUNITY_HARDENING_RESULTS.md` from Phase 28
- [ ] Extract key findings:
  - Default values validated or adjusted
  - Visibility/editability decisions finalized
  - Known issues resolved
  - Balance feedback incorporated
- [ ] Retrieve `docs/FIELD_OVERRIDE_GUIDE.md` from Phase 28
  - Will use to write Field Override Reference
- [ ] Confirm all Phase 28 changes implemented:
  - Settings registered in system.json
  - Visual effects applied in character sheet
  - Known critical issues resolved

**Getting Started Guide (Quick-Start):**
- [ ] Create `docs/GETTING_STARTED.md`
- [ ] Content: "What is dnd35e?"
  - One-paragraph overview
  - Link to full user guide
  - Expected: 1-2 pages
- [ ] Content: "Download & Install"
  - System requirements (Foundry version X.Y.Z+)
  - Installation steps
  - Verify installation checklist
- [ ] Content: "Setting Up Your First World"
  - Create world from template
  - Configure basic settings (from Phase 28)
  - Import compendium packs
  - Expected: 3-5 pages
- [ ] Content: "Creating Your First Character"
  - Walkthrough: Fighter creation step-by-step
  - Describe each sheet tab
  - Explain what required fields are
  - Show what a complete character looks like
  - Expected: 5-8 pages
- [ ] Content: "Your First Combat"
  - Setup combat example
  - Roll initiative
  - Resolve one round of turns
  - Explain action economy
  - Expected: 3-5 pages
- [ ] Include: screenshots at each major step
- [ ] Include: links to detailed sections of main guide
- [ ] Total: ~15-20 pages
- [ ] Test: Walkthrough is accurate to actual system behavior

**Main User Guide (Comprehensive):**
- [ ] Create `docs/USER_GUIDE.md` (or split into multiple files)
- [ ] **Section 1: Overview (5 pages)**
  - System philosophy: "D&D 3.5e in Foundry VTT"
  - Comparison: D35E system vs. dnd35e system
  - Key features: bonus stacking, Action System, material system, etc.
  - Expected phases: mentioned
  - Links to compatibility info
- [ ] **Section 2: Character Sheet Reference (30 pages)**
  - Abilities section: Base score, modifier calculation, racial modifiers
  - Hit Points: Total, temp, lethal damage
  - Armor Class: Base AC, components (armor, DEX, size, misc), conditions
  - Skills: Usage, modifiers, ability associations, skill synergies
  - Saves: Fort/Ref/Will breakdown, modifiers, saving throw mechanics
  - Base Attack Bonus (BAB): Iterative attacks, calculating
  - Attacks: Manual vs. weapon-linked attacks, bonus application
  - Features: Feats, special abilities, class features, racial traits
  - Each field documented:
    - What it is
    - How it's calculated
    - Visibility/editability defaults and how to override
    - Common mistakes
- [ ] **Section 3: Inventory & Equipment (15 pages)**
  - Item types: weapon, armor, shield, equipment, loot, container
  - Adding items to inventory
  - Wearing/equipping items
  - Item properties and bonuses
  - Material system: what is it, how it affects items
  - Weight and encumbrance
  - Gold and treasure tracking
  - Magical item storage and access
- [ ] **Section 4: Spellcasting (20 pages)**
  - Spell basics: levels, schools, components, casting times
  - Prepared vs. spontaneous casters
  - Adding spells to spellbook
  - Spell slots and consumption
  - Concentration mechanic
  - Spell resistance
  - Counterspelling
  - Components and material costs
  - Spellbook management for multiclass casters
- [ ] **Section 5: Combat Mechanics (25 pages)**
  - Initiative and action economy
  - Attack rolls: how to make, bonuses application, rolling with modifiers
  - Saving throws: mechanics, rolling, penalties/bonuses
  - Damage rolls: calculating, type, special damage (energy, ability, etc.)
  - Conditions: what they are, how to apply, effects
  - Special abilities: attacks of opportunity, full-attack, two-weapon fighting
  - Action chains: what they are (Phase 9), running chains
  - Combat State tracking: conscious/unconscious/dead
- [ ] **Section 6: Feats & Class Features (20 pages)**
  - Feat selection: available per level
  - Feat mechanics: how feat bonuses work
  - Metamagic feats: how they modify spells in casting
  - Combat feats: Power Attack, Cleave, Two-Weapon Fighting (examples from Phases)
  - Class features: per-level archetype, how unlocked
  - Multiclass considerations
- [ ] **Section 7: Bonus Stacking Deep Dive (15 pages)**
  - What is a bonus type?
  - The 27 bonus types: list with examples
  - Which bonuses stack together
  - Stacking rules: competence + morale stack, competence + competence don't
  - Chat display: how bonus stacking appears
  - Calculating final bonus: step-by-step example with 5+ bonuses
  - Common questions: "Why didn't this bonus apply?"
  - Bonus stacking matrix: visual table of all combinations
- [ ] **Section 8: Action System & Formula Familiar (10 pages)**
  - Action System overview (Phase 9)
  - Creating action chains
  - Formula Familiar: embedded calculations and randomness
  - Rolling with advantages/disadvantages
  - Custom formulas for homebrew
  - Examples: multiattack chain, spell damage chain
- [ ] **Section 9: GM Tools & Settings (20 pages)**
  - World settings: basic configuration
  - Visibility controls (from Phase 28):
    - Which fields to show/hide from players
    - Per-world overrides
    - Examples: "Hide XP", "Show AC breakdown"
  - Difficulty adjustments: encounter building, monster tweaking
  - Packs and compendiums: importing, creating, managing
  - Compendium browser: finding items and adding to world
  - Game management: experience tracking, treasure, advancement
  - Troubleshooting: common GM issues
- [ ] **Section 10: Customization & Homebrew (15 pages)**
  - Creating custom items
  - Creating custom feats (using Action System)
  - Creating custom spells
  - Modifying existing items
  - Multicla configuration for custom classes
  - Creating new conditions
  - Tweaking default values
  - Using settings to adjust difficulty
- [ ] **Section 11: Module Compatibility (10 pages)**
  - Recommended modules and setup
  - Known incompatibilities and workarounds
  - Module categories: UI improvements, content packs, macros, etc.
  - A-Z list of tested modules (from Phase 32)
  - How to report module issues
  - Community modules for D35E content
- [ ] **Section 12: Glossary (5 pages)**
  - Alphabetical list of terms used in guide
  - Links to where each term is explained
  - Cross-referencing
- [ ] Total: ~160+ pages
- [ ] Format: searchable, with table of contents and internal links
- [ ] Test: Every link to system features is accurate

**Bonus Stacking Deep Dive Document:**
- [ ] Create `docs/BONUS_STACKING_EXPLAINED.md`
- [ ] Content: Bonus type enumeration (from Phase 20)
  - List all 27 types with examples
  - Which types are rare/uncommon
  - Real examples from system (feat, equipment, condition)
- [ ] Content: Stacking rules
  - Same type: doesn't stack
  - Different types: usually stack
  - Exceptions: list
  - Circumstance + circumstance: special rule
- [ ] Content: Examples
  - Example 1 (simple): Strength 16 (+3 mod) + Ring of STR +2 = +5 total
  - Example 2 (complex): Fighter +2 BAB + Weapon Focus (+2/weapon) + Bless (+1) + Favored Enemy (+1) = +6 total
  - Example 3 (stacking failure): Power Attack (-1) + Penalty (-2) don't combine, largest penalty applies
  - Example 4 (multiclass complexity): Cleric/Wizard with stacking spell bonuses
- [ ] Content: Stacking matrix
  - Table: all 27 types in rows and columns
  - Cell: "Y" (stack) or "N" (don't stack)
  - Example: [Competence row, Morale col] = Y (stack)
  - Example: [Competence row, Competence col] = N (don't stack)
- [ ] Content: Chat display examples
  - Show screenshot of chat card with 5+ bonuses
  - Explain how to read stacking history
  - Show collapsed vs. expanded view
- [ ] Content: Troubleshooting bonus issues
  - "I applied a bonus but it's not showing"
  - "My total is lower than expected"
  - "This bonus should stack but didn't"
  - Solutions for each scenario
- [ ] Content: Homebrew bonuses
  - How to create custom bonus types
  - Adding bonus logic to custom feats
  - Testing bonuses for stacking
- [ ] Examples throughout: 20+ detailed calculations
- [ ] Total: ~20-30 pages
- [ ] Test: Stacking matrix accurate to code, examples correct

**Troubleshooting Guide:**
- [ ] Create `docs/TROUBLESHOOTING.md`
- [ ] Organization: by symptom/issue
- [ ] **Installation & Setup Issues:**
  - "System won't load"
  - "Compendium packs missing"
  - "Settings not appearing"
- [ ] **Character Sheet Issues:**
  - "HP not calculating correctly"
  - "AC showing wrong value"
  - "Skills not updating"
  - "Bonuses not applying"
  - "Attack modifier missing"
  - "Spell slots not decreasing"
- [ ] **Combat & Mechanics Issues:**
  - "Initiative not rolling"
  - "Attack roll doesn't include modifiers"
  - "Saving throw formula wrong"
  - "Condition not applying effects"
  - "Action chain not running"
  - "Concentration not tracking"
- [ ] **Inventory & Items:**
  - "Items not appearing in inventory"
  - "Can't equip weapon/armor"
  - "Weight calculation wrong"
  - "Spell not showing in spellbook"
  - "Material not applying to weapon"
  - "Can't add compendium item to character"
- [ ] **Permissions & Access:**
  - "Player sees something they shouldn't"
  - "Field is locked when I want to edit"
  - "Can't change character stats"
- [ ] **Performance & Errors:**
  - "Sheet is loading slowly"
  - "Console errors appearing"
  - "World takes time to migrate"
  - "Compendium browser not loading"
- [ ] For each issue:
  - Clear issue description
  - Step-by-step diagnostic steps
  - Most common causes
  - Solutions (in order of likelihood)
  - Workarounds if no solution
  - Links to relevant setting/phase
- [ ] Total: ~30-50 pages (depending on breadth)
- [ ] Test: Issues in guide match actual system problems

**FAQ (Frequently Asked Questions):**
- [ ] Create `docs/FAQ.md`
- [ ] Questions from Phase 28 feedback:
  - "Can I use 3rd party content?"
  - "How do I adjust default values?"
  - "Can I hide/show sheet fields?"
  - "What modules are compatible?"
  - "Is multiclassing supported?"
  - "Can I create homebrew?"
  - "How long does character creation take?"
  - "What version of Foundry is required?"
- [ ] General questions:
  - "Is this the official D&D 3.5e system?"
  - "Can Pathfinder content be used?"
  - "Is there a discord for help?"
  - "How are bugs reported?"
  - "Can I contribute to the system?"
  - "Is the system free?"
  - "What happens to my worlds if system updates?"
  - "Can I export characters?"
  - "Is there backup/restore?"
- [ ] Technical questions:
  - "What browser should I use?"
  - "What's the minimum player count?"
  - "How many actors can I have?"
  - "What's the maximum compendium size?"
  - "Can I run multiple worlds?"
  - "How do I backup my world?"
- [ ] Game mechanics questions:
  - "How does action economy work?"
  - "Why are some bonuses not stacking?"
  - "How does concentration work?"
  - "What's the difference between prepared and spontaneous casters?"
  - "How does multiclassing work?"
- [ ] Each answer: 1-2 paragraphs, links to detailed docs
- [ ] Total: ~20-30 pages
- [ ] Test: FAQ answers accurate, links work

**Field Override Reference (from Phase 28):**
- [ ] Create `docs/FIELD_OVERRIDE_REFERENCE.md`
- [ ] Pull field-by-field reference from Phase 28's "FIELD_OVERRIDE_GUIDE.md"
- [ ] Format for end users:
  - Field name & path (e.g., "Actor.system.details.xp")
  - What the field is (brief description)
  - Default visibility (shown/hidden to players)
  - Default editability (locked/editable)
  - Rationale (why this default)
  - How to override:
    - Which setting controls it
    - Step-by-step to change
    - How to verify change took effect
  - Example use cases
- [ ] Include all fields from Phase 28 survey:
  - ~40-50 fields total
- [ ] Group by category: Abilities, Skills, Combat, Resources, etc.
- [ ] Total: ~15-20 pages
- [ ] Test: References accurate to Phase 28 decisions

**SRD Journal Generation (Build Script):**
- [ ] Create `src/build/generate-srd-journal.ts`
- [ ] Purpose: Auto-generate SRD journal entries from compendium data
- [ ] Process:
  - Load all dnd35e compendium packs (weapons, feats, spells, classes, races, conditions)
  - For each item type:
    - Extract name, description, data fields
    - Generate journal entry with formatted content
    - Add cross-links (feat → related feats, class → class skills, etc.)
    - Create search-optimized text
- [ ] Build command: `npm run generate:srd`
- [ ] Output: Generated `src/journals/srd-reference/` with journal entry JSON files
- [ ] Implement cross-link generation:
  - Feat links to: similar feats, prerequisite feats, related feat chains
  - Spell links to: components (equipment), schools, classes that know spell
  - Class links to: class skills, bonus feats, multiclass compatibility
  - Race links to: racial feats, class compatibility
- [ ] Full-text indexing:
  - Extract text from all fields (name, description, benefits, tables)
  - Build searchable index for SRD sidebar
  - Include: item type tags, level/rarity tags for sorting
- [ ] Test: Build script generates without errors
- [ ] Test: Generated journals have correct structure

**SRD Journal Entry Structure:**
- [ ] Create directory structure: `src/journals/srd-reference/`
- [ ] Create main index journal: `srd-index.json`
  - Title: "D&D 3.5e System Reference Document"
  - Content: Top-level table of contents
  - Links to each section
- [ ] Create section structures:
  - `core-rules/` — skills, feats, combat, magic, conditions
  - `equipment/` — weapons, armor, shields, wondrous items
  - `characters/` — races, classes, prestige classes
  - `bestiary/` — creature entries
  - `appendices/` — tables, conversion notes
- [ ] For each section:
  - Create folder
  - Create index.json (section TOC)
  - Create individual item entries (e.g., weapons/longsword.json, feats/power-attack.json)
- [ ] Each entry format:
  ```json
  {
    "name": "Power Attack",
    "type": "feat",
    "tags": ["combat", "melee"],
    "source": "PHB",
    "content": "..." // HTML content with cross-links
  }
  ```
- [ ] Test: Structure matches generated output

**SRD Search Integration:**
- [ ] Implement SRD search in sidebar (Phase 29+)
- [ ] Create search index from journal entries:
  - All text + fields indexed
  - Searchable by name, keyword, tag
  - Full-text with fuzzy matching
- [ ] UI: Add search box in sidebar/help area
- [ ] Results: Ranked by relevance
  - Exact match highest
  - Partial match lower
  - Tag match lower
- [ ] Clicking result: opens SRD journal entry
- [ ] Test: Search finds common items (longsword, Power Attack, faerie fire)

**System Manifest Links:**
- [ ] Update `system.json`:
  - Add field: "url": "https://github.com/..." (if hosted)
  - Add field: "bugs": "https://github.com/.../issues"
  - Add field: "documentation": "https://..." (link to docs)
  - Add field: "allowBundledContent": true (for SRD journal)
- [ ] Update README.md:
  - Add "📚 Documentation" section
  - Link to `docs/GETTING_STARTED.md`
  - Link to `docs/USER_GUIDE.md`
  - Link to `docs/TROUBLESHOOTING.md`
  - Link to `docs/FAQ.md`
  - Link to Module compatibility guide (Phase 32)
- [ ] Test: Links are valid

**Localization Framework (i18n Preparation):**
- [ ] Identify all documentation strings that need i18n:
  - All headings
  - All section titles
  - All key terms
  - All UI labels referenced in docs
- [ ] Create i18n key convention:
  - `guide.getting-started.title`
  - `guide.character-sheet.hp.label`
  - `guide.bonus-stacking.example-1.title`
- [ ] Create English language file: `lang/guide-en.json`
  - Map all i18n keys to English text
  - Include context comments for translators
- [ ] Framework (not full translations):
  - Set up helper functions: `i18n.guide(key)`
  - Documentation system can use i18n keys
  - Later: community contributors add alternative language JSON files
- [ ] Test: i18n helper functions work correctly

**Screenshots & Images:**
- [ ] Capture 50+ screenshots of:
  - Character sheet (all tabs)
  - Combat tracker
  - Spellbook
  - Inventory
  - Combat resolution examples
  - Error messages/troubleshooting scenarios
  - Settings screens
  - Compendium browser
- [ ] Annotate key flows:
  - Character creation (step-by-step with highlights)
  - Attack roll resolution (bonus calculation shown)
  - Bonus stacking (multiple color-coded bonuses)
- [ ] Store all images in `docs/img/`
- [ ] Include in appropriate guide sections
- [ ] Test: Images display correctly in markdown

**Documentation Quality Checks:**
- [ ] Complete spell-check: all documentation files
- [ ] Grammar check: all guides
- [ ] Link verification: all internal links work
- [ ] Example verification: all code examples work
- [ ] Accuracy check: all mechanics descriptions match code
- [ ] Consistency check: terminology consistent throughout
- [ ] Tone check: documents are friendly and clear
- [ ] Organization check: logical flow, easy navigation
- [ ] Test: All checks pass

**Comprehensive Testing:**
- [ ] Unit test: SRD journal generation (no errors)
- [ ] Unit test: i18n framework loads correctly
- [ ] Integration test: Getting Started walkthrough
  - Follow each step
  - Verify character creation completes
  - Verify first combat works
- [ ] Integration test: Search functionality
  - Search finds all common items
  - Results ranked correctly
  - Link navigation works
- [ ] Integration test: Visibility overrides
  - Follow `FIELD_OVERRIDE_REFERENCE.md`
  - Verify each documented setting works
- [ ] Smoke test: All documentation files exist and have content
- [ ] Smoke test: All links in docs work (no 404s)
- [ ] Smoke test: PDF export (if supported, needs testing)
- [ ] Edge case: User without Foundry experience
  - Follows Getting Started
  - Can run first combat
  - Can create character
- [ ] Performance test: Search 100-item SRD < 500ms
- [ ] Performance test: Load SRD journal < 2 seconds

**Documentation & Handoff:**
- [ ] Create summary for Phase 30:
  - Which components are complete, tested
  - Which areas need expansion
  - Known limitations
- [ ] Create summary for translator volunteers:
  - i18n framework ready
  - How to contribute translations
  - Process for QA and merging
- [ ] Create maintainer guide:
  - How to keep docs current with system updates
  - Process for adding new sections
  - Community contribution guide
- [ ] All documents in markdown (.md) format for version control
- [ ] All linked from README.md and in-game help

---

## 29.9 Success Criteria

✅ **User guide complete** (100+ pages, searchable)  
✅ **SRD fully housed** in-game (weapons, feats, spells, classes, races, conditions)  
✅ **All tutorials recorded** (or ready for video production)  
✅ **FAQ covers 90%+ of Phase 28 questions**  
✅ **0 broken internal links** (docs → system features)  
✅ **Internationalization framework ready** for translation volunteers  
✅ **Module compatibility guide published**  

---

## 29.10 Deferred to Future

- Full multi-language translations (framework ready, community-sourced)
- Video tutorials (documentation ready, can be filmed by community)
- Interactive tutorials (modal walkthroughs in-game)
- Advanced optimization guides (for after user feedback proves what matters)
