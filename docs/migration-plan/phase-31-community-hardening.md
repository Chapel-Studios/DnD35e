# Phase 31: Community Hardening

**Status**: 📖 Rough Sketch (300+ item checklist, feedback collection, balance tuning)

> **Milestone**: Post-Release  
> **Dependencies**: Phase 27 (Content Migration)  
> **Goal**: Gather comprehensive community feedback on system defaults, visibility/editability overrides, and balance. Tune values based on actual play testing. Lock down core settings before documentation finalization.

---

## 28.1 Why Community Hardening First

Release (Phase 27) is technically complete but not battle-tested at scale. Defaults might be wrong. GMs might want visibility controls we didn't anticipate. Players might find combinations that break balance. Phase 28 is about:
- **Collecting feedback** from real GMs running real campaigns
- **Tuning defaults** — ability modifiers, action economy values, feat balance
- **Documenting field overrides** — which stats should GMs be able to hide/show/edit?
- **Finding gaps** — what settings are missing? What controls do you need?
- **Bottom-line**: Make sure the system feels right before we write the final user guide

---

## 28.2 Feedback Collection

Target **100+ active campaign reports** across 4-8 weeks:

### Survey Questions
```
1. What default values feel wrong? (ability modifiers, feat bonuses, etc.)
2. Which fields do you wish you could show/hide?
3. Which fields do players ask to edit that you'd rather lock down?
4. Did bonus stacking make sense? Were there surprises?
5. What settings are missing that would help you run your game?
6. How long did character creation take?
7. Any calculations that felt off or unintuitive?
```

### Canonical Test Scenario
Provide all testers with a standard encounter:
- Level 5 Fighter vs. 3 goblins
- Fighter uses longsword with steel material, has Power Attack and Cleave
- Track feedback on action speed, calculation clarity, bonus accuracy

This gives comparable data: "In 50 test runs, combat took X minutes on average."

---

## 28.3 Default Value Tuning

### Ability Modifier Formula
Current: `floor((score - 10) / 2)`  
Validate: Does this feel right? Should it be `round()`? Report from actual play.

### Attack Bonus Components
Current: BAB + STR mod + feat bonuses + equipment  
Validate: Do bonuses feel balanced? Too many stacking options? Too few?

### Action Economy Values
Validate:
- 5-foot step economy (free? costs move?)
- Number of bonus actions per turn
- Ready action rules
- Feat-granted extra actions

### Damage Values
Possible tuning:
- Material damage bonuses (too high? too low?)
- Feat damage modifiers
- Weapon damage baseline

---

## 28.4 Visibility/Editability Survey

Create a **sheet layout questionnaire**:

**Current Visible Fields:**
- Ability scores (base + mod)
- Hit points
- AC components
- BAB
- Saves
- Skill list

**Ask the community:**
- Should X be hidden from players? (example: XP, encumbrance calculations, DR values)
- Should X be player-editable? (example: notes, alignment, special traits)
- What fields are missing that you wish existed?

### Likely Results to Act On
- **AC breakdown** (armor + DEX + size + misc) — most GMs want this visible but not separately editable
- **Skill total vs. components** — GMs want to see `+5 total (mod +2 + ranks +3)`, not just the final number
- **HP temporary** — players should edit, but total should be locked
- **Initiative bonus** — players might want to edit if homebrew rules change it

---

## 28.5 Community Settings Migration

Based on feedback, create `system.json` settings:

```json
{
  "settings": [
    {
      "key": "characterSheet.showACBreakdown",
      "default": true,
      "scope": "world",
      "type": Boolean
    },
    {
      "key": "characterSheet.playerEditableFields",
      "default": ["notes", "alignment"],
      "scope": "world",
      "type": Array
    },
    {
      "key": "combat.bonusStackingVerbosity",
      "default": "detailed",
      "choices": ["simple", "detailed", "off"],
      "scope": "world",
      "type": String
    }
  ]
}
```

Each setting has a rationale from community feedback.

---

## 28.6 Balance Report

Publish findings:
- **Encounter Time**: "Average encounters took X minutes. Outliers: Y."
- **Bonus Stacking Accuracy**: "In 500 rolls, X% had correct stacking. Errors: [list common mistakes]."
- **Feat Balance**: "Power Attack was used in Y% of full attacks. Cleave triggered Z% of the time."
- **Default Values**: "Ability modifiers feel [right/too high/too low] because [evidence]."

Use this to justify any Phase 29+ changes.

---

## 28.7 Documentation of Field Overrides

Create a reference document:

```
FIELD OVERRIDE GUIDE

system.attributes.ac.normal
  - Visible by default: YES
  - Player editable by default: NO
  - Why: GMs want to see AC, players should not tweak it directly
  - GM can override: Yes (via visibility/editability settings)

system.details.xp.value
  - Visible by default: NO (hidden from players)
  - GM editable by default: YES
  - Why: Only GMs track XP
  - Player-visible override: Not recommended

...
```

This becomes the foundation for Phase 29 (Documentation) field-by-field breakdown.

---

## 28.8 Known Issues Log

If issues are found:
- **Critical** (breaks core functionality): Fix immediately, don't wait for Phase 29
- **Major** (impacts usability): Prioritize for Phase 29
- **Minor** (cosmetic or rare edge cases): Document for Phase 29+

Example:
```
[CRITICAL] Stacking history doesn't render in chat if 10+ bonuses applied
[MAJOR] Visibility setting not persisting on sheet refresh
[MINOR] Able modifier calculation shows 1 decimal place sometimes
```

---

## 28.9 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `docs/COMMUNITY_FEEDBACK_SURVEY.md` — questionnaire template |
| Create | `docs/COMMUNITY_HARDENING_RESULTS.md` — final report (populated after testing) |
| Create | `docs/FIELD_OVERRIDE_GUIDE.md` — per-field visibility/editability rationale |
| Modify | `system.json` — add visibility/editability settings based on feedback |
| Create | Visibility/editability override system in character sheet components |
| Document | Known issues from community testing |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 28 has not started)

### ❌ Not Started (All Tasks for Phase 28)

**Feedback Collection Infrastructure:**
- [ ] Create `docs/COMMUNITY_FEEDBACK_SURVEY.md`:
  - Section 1: Demographic data (campaign type, player count, campaign length)
  - Section 2: Default values evaluation questions
  - Section 3: Visibility/editability survey
  - Section 4: Balance & action economy feedback
  - Section 5: Open-ended comments
  - Include canonical test scenario instructions
- [ ] Survey distribution channels:
  - Email to Foundry module authors (cross-promotion)
  - Post in Foundry community Discord
  - Post in D&D 3.5e communities online
  - Reddit r/FoundryVTT
  - Direct outreach to known D&D 3.5e campaign runners
- [ ] Target: 100+ responses over 4-8 weeks
- [ ] Set up response collection (Google Forms, Typeform, or custom webapp)
- [ ] Test: Survey loads and accepts responses without errors

**Canonical Test Scenario (Standard Encounter):**
- [ ] Create detailed scenario document: `docs/TEST_SCENARIOS.md`
- [ ] Scenario 1: Level 5 Fighter vs. 3 goblins
  - Specify exact weapon (longsword + steel material)
  - Specify exact feats (Power Attack, Cleave)
  - Specify exact AC and goblin stats
  - Specify combat conditions (flanking available, full combat round)
- [ ] Scenario 2: Level 3 Cleric casting buffing spells
  - Specify exact spells (cure light wounds, bless, shield of Faith)
  - Track spell slot consumption
  - Track bonus stacking
- [ ] Scenario 3: Level 7 Wizard with polymorphed companion
  - Test dimension-based calculations
  - Test shape-changed AC/attacks
- [ ] For each scenario:
  - Collect: time to resolve, number of bonus lookups, calculation clarity
  - Provide template for tester feedback
  - Standardize how scenarios are run (same dice rolls? same initiative?)
- [ ] Test: Scenario can be loaded into test world without errors

**Test Scenario Execution Framework:**
- [ ] Create test template: `src/test/scenarios/CanonicalScenarioRunner.mts`
- [ ] Implement `class ScenarioRunner`:
  - Constructor: loads scenario from JSON
  - Property: actor references (fighter, goblins, etc.)
  - Property: startingConditions (positioning, HP, resources)
- [ ] Implement `runScenario()`: executes moves in order, tracks timing
- [ ] Implement `recordMetrics()`: captures combat duration, calculation count, errors
- [ ] Support automated testing: can run scenario 50 times, collect average duration
- [ ] Generate report: "Scenario avg completion: 45 seconds, 12 bonus lookups"
- [ ] Test: Runner executes test scenario without errors

**Canonical Test Execution (Community):**
- [ ] Recruit 50+ testers (same Discord channels as survey)
- [ ] Provide: test scenario file, testing instructions, feedback template
- [ ] Testers run scenario N times, record:
  - Time to complete
  - Clarity of bonus calculations
  - Any confusion or errors
  - Suggestions for improvement
- [ ] Collect all tester feedback
- [ ] Test: Feedback collection system works

**Ability Modifier Formula Validation:**
- [ ] Current implementation: `floor((score - 10) / 2)`
- [ ] Collect feedback: "Does modifier calculation feel right?"
- [ ] Analyze: across 100+ reports, calculate % who question formula
- [ ] Make decision: keep current, change to `round()`, or other?
- [ ] Document decision: rationale, feedback summary, formula finalized in `docs/COMMUNITY_HARDENING_RESULTS.md`
- [ ] Test: Formula applied consistently across all ability scores

**Attack Bonus Components Validation:**
- [ ] Current: BAB + STR mod + feat bonuses + equipment bonuses
- [ ] Collect feedback:
  - "Do attacks feel powerful enough?"
  - "Do you feel like there are too many bonuses stacking?"
  - "Are there bonuses missing?"
- [ ] Analyze:
  - Categorize feedback (balance, clarity, missing features)
  - Calculate average feedback tone (positive, neutral, negative)
- [ ] Make decision: adjust bonus types/values? Expand options?
- [ ] Document in results
- [ ] Test: Attack bonus calculation matches Phase 9 specification

**Action Economy Validation:**
- [ ] Collect feedback on:
  - 5-foot step mechanics (free? too powerful? too weak?)
  - Bonus actions per turn count (too many? too few?)
  - Ready action rules feel balanced?
  - Feat-granted extra actions (AOO, extra attacks from feats) clear?
- [ ] Analyze: compile suggestions and group by theme
- [ ] Make decisions: which values to adjust?
- [ ] Document:
  - Current values
  - Feedback summary
  - Decision to keep/change
- [ ] If changes needed: verify Phase 9 combat tracker reflects new values
- [ ] Test: Action economy rules consistent and documented

**Damage Values Validation:**
- [ ] Collect feedback on:
  - Material damage bonuses feel balanced?
  - Feat damage modifiers appropriate?
  - Baseline weapon damage (d8 longsword, etc.) feel right?
- [ ] For canonical scenario specifically:
  - Collect: average damage per turn by fighter
  - Collect: number of turns to defeat goblins
  - Compare: does ratio feel balanced?
- [ ] Analyze: if damage too high/low, by how much?
- [ ] Make decision: adjust material bonuses, weapon damage, feat bonuses?
- [ ] Document in results
- [ ] If changes needed: update Phase 23 (Enhancements) and weapon templates
- [ ] Test: Damage calculations verify Phase 19/23 values

**Visibility/Editability Survey (Field-by-Field):**
- [ ] Create questionnaire: `docs/VISIBILITY_EDITABILITY_SURVEY.md`
- [ ] For each major field, ask:
  - "Should players see this field?"
  - "Should this field be player-editable?"
  - "Should this be a GM setting (world-level control)?"
- [ ] Fields to survey:
  - Actor.system.details.experience (XP)
  - Actor.system.attributes.hp.value (HP total)
  - Actor.system.attributes.hp.temp (temporary HP)
  - Actor.system.attributes.ac.value (AC total)
  - Actor.system.attributes.ac.full breakdown (armor, dex, size, misc)
  - Actor.system.details.alignment
  - Actor.system.details.notes
  - Skill components (ranks + mod vs. total only)
  - Spell slots (should be hidden per spell level vs. shown as grid?)
  - Gold/treasure values
  - Encumbrance calculation
  - Damage reduction values
  - Resistances/immunities
- [ ] Collect feedback from 50+ testers
- [ ] Test: Survey form validates and saves responses

**Field Override Decision Matrix:**
- [ ] Analyze survey results for each field
- [ ] Create decision matrix: `docs/FIELD_OVERRIDE_GUIDE.md`
- [ ] For each field, document:
  - **Visible by default**: YES/NO (player perspective)
  - **GM-editable by default**: YES/NO
  - **Rationale**: Why this decision?
  - **Feedback percentage**: What % of testers voted for/against?
  - **GM override**: Can a GM change visibility/editability?
  - **Example**: "AC breakdown visible by default, but GM can hide"
- [ ] Example entries:
  - system.attributes.ac.value: Visible YES, Editable NO, Override YES
  - system.details.xp.value: Visible NO, Editable YES (GM only), Override NO
  - system.details.notes: Visible YES, Editable YES, Override YES
  - system.attributes.hp.temp: Visible YES, Editable YES, Override NO
- [ ] Once finalized, hand to Phase 29 for documentation
- [ ] Test: Decision matrix complete and justified

**System Settings for Visibility/Editability:**
- [ ] Add to `system.json` new settings section:
  ```json
  "settings": [
    {
      "key": "characterSheet.showACBreakdown",
      "default": true,
      "scope": "world",
      "type": Boolean,
      "label": "Show AC component breakdown"
    },
    {
      "key": "characterSheet.allowPlayerEditHP",
      "default": true,
      "scope": "world",
      "type": Boolean,
      "label": "Allow players to edit temp HP"
    },
    {
      "key": "characterSheet.showSkillComponents",
      "default": true,
      "scope": "world",
      "type": Boolean,
      "label": "Show skill component breakdown (ranks + mod)"
    },
    {
      "key": "characterSheet.hideXPFromPlayers",
      "default": true,
      "scope": "world",
      "type": Boolean,
      "label": "Hide XP values from players"
    },
    {
      "key": "characterSheet.hideEncumbranceCalc",
      "default": false,
      "scope": "world",
      "type": Boolean,
      "label": "Hide encumbrance calculation details"
    },
    {
      "key": "characterSheet.showDamageReduction",
      "default": true,
      "scope": "world",
      "type": Boolean,
      "label": "Show damage reduction values"
    }
  ]
  ```
- [ ] Create `src/settings/communitySettings.mts`:
  - Register all Phase 28 settings
  - Provide helper functions: `isFieldVisibleToPlayer(fieldPath)`, `isFieldEditable(fieldPath, userRole)`
  - Helper caches settings for performance
- [ ] Test: All settings register and load correctly

**Character Sheet Visibility/Editability Overrides:**
- [ ] Update character sheet Vue components to respect settings:
  - `src/vue/sheets/CharacterSheet.vue`
  - `src/vue/sheets/NPCSheet.vue`
- [ ] For each field, check visibility setting before rendering:
  ```typescript
  if (communitySettings.isFieldVisibleToPlayer(fieldPath)) {
    // render field
  } else {
    // return empty/hidden
  }
  ```
- [ ] For each input, check editability setting before enabling:
  ```typescript
  const isEditable = communitySettings.isFieldEditable(fieldPath, userRole);
  // disable input if not editable
  ```
- [ ] Implement role checks (Player vs. Trusted Player vs. GM)
- [ ] Test: HP visible/editable, XP not visible to players, AC breakdown shows when setting TRUE
- [ ] Test: Changes to settings immediately reflect on open sheets

**Bonus Stacking Clarity (from community feedback):**
- [ ] Collect feedback: "Did bonus stacking make sense?"
- [ ] Analyze: categorize as "confusing", "clear", "too verbose", "not verbose enough"
- [ ] Review Phase 20 bonus stacking implementation:
  - Is stacking history shown in chat?
  - Is calculation breakdown clear in character sheet?
  - Are bonuses labeled with source (feat, equipment, etc.)?
- [ ] If feedback indicates confusion:
  - Make bonuses more verbose?
  - Add explanatory tooltips?
  - Restructure stacking display?
- [ ] Make decision: keep current implementation, enhance clarity, or redesign?
- [ ] Document decision in results
- [ ] If changes needed: update Phase 20 components
- [ ] Test: Bonus stacking displays match decision (10+ bonus scenario)

**Character Creation Time Validation:**
- [ ] Collect feedback: "How long did character creation take?"
- [ ] Analyze: average time, range (min-max), by complexity
- [ ] Collect feedback: "Which parts took longest?"
- [ ] If creation time too high:
  - Identify bottlenecks (feat selection, spell selection, etc.)
  - Prioritize improvements for Phase 29+
- [ ] Document findings: "Average character creation 15 minutes, range 10-25 min"
- [ ] Test: Time character creation in multiple scenarios

**Calculation Clarity & Intuitiveness:**
- [ ] Collect feedback: "Which calculations felt off or unintuitive?"
- [ ] Analyze: group by calculation type (attack, AC, damage, saves, skills)
- [ ] Review top concerns:
  - Do skill calculations show ranks + mod clearly?
  - Is AC breakdown understandable?
  - Are saves formula transparent?
- [ ] Make improvements if needed (add tooltips, restructure display)
- [ ] Document in results
- [ ] Test: Top 5 calculations feel intuitive to test players

**Known Issues Log:**
- [ ] Create `docs/KNOWN_ISSUES.md` or section in results
- [ ] During testing, collect all reported bugs/issues
- [ ] Categorize by severity:
  - **CRITICAL**: Breaks core functionality (e.g., combat doesn't resolve)
  - **MAJOR**: Impacts usability (e.g., setting doesn't persist)
  - **MINOR**: Cosmetic or rare edge cases (e.g., display glitch)
- [ ] For CRITICAL issues: fix before Phase 29
- [ ] For MAJOR issues: prioritize for Phase 29
- [ ] For MINOR issues: document for Phase 29+
- [ ] Format: "[SEVERITY] Brief description — Workaround (if any)"
- [ ] Example:
  ```
  [CRITICAL] Stacking history doesn't render in chat if 10+ bonuses applied
    Workaround: Limited to 5 lines of bonus display, rest collapsed
  [MAJOR] Visibility setting not persisting on sheet refresh after combat
    Workaround: Re-apply setting manually
  [MINOR] Ability modifier calculation shows 1 decimal place (should be none)
    Workaround: None, cosmetic only
  ```
- [ ] Test: All critical issues resolved before end of Phase 28

**Balance Feedback Analysis:**
- [ ] Collect feedback on specific features:
  - "Did any feat combinations feel overpowered?"
  - "Did any feats feel underpowered?"
  - "Did spell balance feel right?"
  - "Did damage/HP balance feel appropriate?"
- [ ] Analyze: which features have most negative feedback?
- [ ] For each concern:
  - Confirm with multiple testers
  - Review Phase design (feat in Phase 11, spell in Phase 16, etc.)
  - Make decision: tweak values, redesign, or document as-intended?
- [ ] Document all balance decisions in results
- [ ] If changes needed: coordinate with relevant phase files
- [ ] Test: Balance feels appropriate in canonical test scenario

**Feedback Categorization Framework:**
- [ ] Create spreadsheet/database to track all feedback:
  - Feedback ID
  - Category (design, balance, UI/UX, bug, feature request, other)
  - Subcategory (specific feature)
  - Severity (if bug)
  - Tester name
  - Feedback text
  - Decision made
  - Phase responsible (for fixes/improvements)
- [ ] Implement categorization system:
  - Automated: keyword matching for common categories
  - Manual: final review by PM
- [ ] Generate reports:
  - "Top 10 most common feedback topics"
  - "Distribution by category (bug % vs feature request %)"
  - "Issues resolved vs. deferred"
- [ ] Test: All 100+ feedback items categorized and decisions tracked

**Community Hardening Results Report:**
- [ ] Create final report: `docs/COMMUNITY_HARDENING_RESULTS.md`
- [ ] Sections:
  1. Executive summary (key findings, decisions made)
  2. Feedback collection metrics (100+ reports, X% completion rate)
  3. Canonical test scenario results (average duration, variance)
  4. Ability modifier decision (keep floor, change to round, etc. with justification)
  5. Attack bonus feedback summary
  6. Action economy validation (values confirmed or adjusted)
  7. Damage values decision
  8. Visibility/editability matrix (finalized)
  9. Character creation time analysis
  10. Calculation clarity feedback
  11. Known issues classification
  12. Featured balance concerns and resolutions
  13. Community consensus points (universal agreement items)
  14. Deferred items (nice-to-have features for Phase 29+)
- [ ] Include:
  - Percentage of testers per decision
  - Representative quotes from feedback
  - Rationale for each decision
  - Reference to relevant phases (Phase 9 for action economy, etc.)
- [ ] Appendix: Full feedback spreadsheet (anonymized)
- [ ] Test: Report objective, data-driven, complete

**Feedback Loop to Phase Owners:**
- [ ] For each decision requiring changes:
  - Notify responsible phase owner
  - Provide specific change request
  - Link to relevant feedback
  - Coordinate timing (Phase 29 vs. Phase 29+)
- [ ] Example: "Phase 9 action economy: 87% feedback supports current 5-foot step rules, keep as-is"
- [ ] Example: "Phase 23 enhancements: Weapon material bonuses slightly high per feedback (avg complaint), reduce by 1-2 points and test in Phase 29"
- [ ] Test: All change requests received and acknowledged by phase owners

**Localization & i18n:**
- [ ] Add i18n: Settings labels for all new visibility/edit settings
- [ ] Add i18n: Help text for each setting
- [ ] Add i18n: "Show AC Breakdown", "Hide XP from Players", etc.
- [ ] Update en.json with all new i18n keys
- [ ] Test: All settings display in correct language

**Comprehensive Testing:**
- [ ] Unit test: communitySettings helper functions
  - `isFieldVisibleToPlayer(fieldPath)` returns correct boolean
  - `isFieldEditable(fieldPath, userRole)` checks role correctly
- [ ] Integration test: Visibility setting applied on character sheet
  - Set "hideXPFromPlayers" TRUE
  - Load player character
  - Verify XP field not rendered
- [ ] Integration test: Editability setting applied
  - Set "allowPlayerEditHP" FALSE
  - Load player character
  - Verify HP input disabled
- [ ] Integration test: Canonical test scenario
  - Run scenario 10 times
  - Average duration matches expected
  - Bonus calculations clear
- [ ] Smoke test: 100+ feedback responses collected without errors
- [ ] Performance test: Settings check doesn't slow down sheet rendering (< 50ms)
- [ ] Edge case: User switches setting mid-session
  - Open sheets update correctly
  - Unsaved field edits respect new setting
- [ ] Edge case: GM setting visibility, then player joins world
  - New player sees correct visibility
- [ ] Edge case: Multiple worlds with different settings
  - Each world respects own settings

**Documentation & User Guides:**
- [ ] Document canonical test scenario: how to run, what to measure
- [ ] Document feedback survey: how to participate
- [ ] Document visibility/editability settings: how to control what players see
- [ ] Document known issues: workarounds for testers
- [ ] Community feedback summary: what the community said and why we made decisions

---

## 28.10 Success Criteria

✅ **100+ reports** from active campaigns  
✅ **Canonical test scenario** completed by 50+ testers with timing data  
✅ **All feedback categorized** (design vs. bug vs. feature request)  
✅ **Default values decision** made (keep or tune?)  
✅ **Visibility/editability matrix** finalized  
✅ **Known issues prioritized** (critical vs. major vs. minor)  
✅ **Community consensus** documented and justified  

---

## 28.11 Timeline

- **Week 1**: Release survey + canonical test scenario
- **Weeks 2-6**: Active collection + spot-check reports
- **Week 7**: Analyze all feedback + categorize
- **Week 8**: Implement changes (critical issues), document findings
- **Hand off to Phase 29**: With consolidated feedback and known issues list

---

## 28.12 3-State AE Visibility (from Phase 2 §2.12)

Upgrade from 2-state (hidden/identified) to 3-state (unknown / known-unidentified / identified). Community hardening is the natural fit for UX refinements informed by beta feedback.

- [ ] Define the three visibility states and their semantics
- [ ] Update RenderModeStore and masks to support the third state
- [ ] Community feedback on whether 3-state is needed or confusing

---

## 28.13 Deferred to Phase 29

- Full user guide (waits for Phase 28 feedback)
- Balanced feat recommendations (after Phase 28 balance data)
- Optimized default settings (after Phase 28 tuning)
