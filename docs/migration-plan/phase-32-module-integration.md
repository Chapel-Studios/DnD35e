# Phase 32: Module Integration Testing

**Status**: � Rough Sketch (400+ item checklist, compatibility matrix, testing)

> **Milestone**: Post-Release  
> **Dependencies**: Phase 27 (Content Migration)  
> **Goal**: Ensure the dnd35e system works seamlessly with popular community modules. Test compatibility, identify breaking points, and provide integration guidance or patches for module authors. Build a module compatibility matrix and best-practices guide.

---

## 32.1 Why Module Integration Matters

The D&D 3.5e community relies on popular modules for:
- **Combat enhancements**: Initiative trackers, mass roll integrations
- **Character management**: Sheet enhancements, auto-leveling, item management
- **Content expansion**: Compendium additions, homebrew tools
- **Utility**: Macro libraries, automation frameworks, dice rollers

Without testing, users hitting module conflicts will blame the system. Early integration testing builds trust and gives module authors time to update.

---

## 32.2 High-Priority Modules to Test

Target **minimum 10-15 modules**, focusing on:

### Combat & Initiative
- **Combat Utility Belt** — rolls, macros, combat features
- **Turn Marker** — initiative visualization
- **Polyglot** — language/communication system

### Item & Sheet Management
- **Tidy5e Sheets** or similar — custom sheet extensions
- **Better Rolls** — damage/attack roll display (may conflict with our stacking history)
- **Item Piles** — loot distribution

### Content & Compendium
- **Level Up!** — compendium browser
- **Furnace** — macro/data management
- **SimpleCalendar** — tracking

### Utility & Quality of Life
- **Monk's Little Details** — UI improvements
- **FXMaster** — visual effects
- **D&D Beyond Importer** (if applicable)
- **Bluetooth Dice** (Pixel/Chessex/etc.) — physical Bluetooth dice integration

### Avoid Initially
- Modules that override core preparation pipelines (risky in Phase 32)
- Incompatible system replacements

---

## 32.3 Integration Testing Process

### Pre-Testing
1. Document baseline system behavior (actor prep, item prep, AE stacking)
2. Create test scenarios:
   - Simple combat with no modules
   - Same combat with each module enabled individually
   - Combinations of high-risk modules

### Testing Workflow
```
For each module:
  1. Enable module alone
  2. Create test character (Fighter level 5)
     - Add weapon with material
     - Add feat (from Phase 10)
     - Add active effect (from Phase 28 buffs)
  3. Test scenarios:
     - Sheet opens without error
     - Preparation completes (no errors in console)
     - Stacking history is accurate
     - Actions/attacks work
     - Chat cards render correctly
  4. Log findings:
     - ✅ COMPATIBLE — no issues
     - ⚠️ PARTIAL — minor issues, workarounds available
     - ❌ INCOMPATIBLE — breaks core functionality
```

### Conflict Resolution Matrix

| Module | Issue | Severity | Resolution | Status |
|--------|-------|----------|-----------|--------|
| Better Rolls | Bonus display conflicts with stacking history | Medium | Provide integration hook | ⏳ |
| Tidy5e | Sheet data binding mismatch | Low | Document compatible version | ⏳ |
| ... | ... | ... | ... | ... |

---

## 32.4 Integration Points to Document

### For Module Authors
Create a guide covering:

#### 1. **Stacking History Access**
```typescript
// Modules that display bonuses should check system._stackingHistory
const weapon = actor.items.find(i => i.type === 'weapon');
const history = weapon.system._stackingHistory;
history.forEach(fieldHistory => {
  console.log(`${fieldHistory.field}:`);
  fieldHistory.applied.forEach(app => console.log(`  + ${app.source}: ${app.value}`));
  fieldHistory.ignored.forEach(ign => console.log(`  - ${ign.source}: ${ign.reason}`));
});
```

#### 2. **Active Effect Compatibility**
- Active effects use `Dnd35eEffectChangeData` with `bonusType` field
- `buildChanges()` is called during prep — effects must not break this
- History tracking must be preserved; don't mutate `system._stackingHistory` directly

#### 3. **Sheet Hooks**
Phases where modules can safely hook:
- `prepareBaseData()` — add new fields
- `prepareDerivedData()` — after prep completes
- Update hooks — for reactive UI

#### 4. **Compendium Integration**
- Items imported from compendium get `system.sourceId` flavor flag
- Modules updating/re-importing should respect source tracking
- Use Phase 4 UUID helpers for compendium lookups

---

## 32.5 Create Integration Guide

Document:
- **Known Compatible Modules** — list with versions tested
- **Known Incompatible Modules** — list with explanations + workarounds
- **Integration Patterns** — best practices for extending dnd35e via modules
- **Hook Reference** — all Foundry hooks that dnd35e respects
- **Common Pitfalls** — what NOT to do (e.g., "don't mutate item.system directly during prep")

---

## 32.6 Provide Integration Helpers

Create `src/modules/moduleIntegration.mts` with utilities for module authors:

```typescript
// For modules that need to read/extend stacking
export function getStackingHistory(item: Dnd35eItem, field: string) {
  return item.system._stackingHistory?.find(h => h.field === field);
}

// For modules that need to inspect AE changes safely
export function inspectActiveEffectChanges(effect: Dnd35eActiveEffect) {
  if (effect.system.buildChanges) {
    return effect.system.buildChanges();
  }
  return [];
}

// For modules that need compendium UUID resolution
export async function resolveCompendiumItem(uuid: string) {
  return fromCompendiumUuid(uuid); // Uses Phase 4 helpers
}
```

Export these as `game.dnd35e.modules.*` so modules can access safely.

---

## 32.7 Module Feedback Loop

- **Create a forum/GitHub discussion** for module authors to report compatibility issues
- **Provide patch templates** for common conflicts
- **Tag modules with compatibility** in the Module Browser
- **Monthly review** of new modules against compatibility matrix

---

| Create | `docs/MODULE_COMPATIBILITY.md` — matrix of tested modules + status |
| Create | `src/modules/moduleIntegration.mts` — helper utilities |
| Create | `src/types/moduleIntegration.d.ts` — TypeScript definitions |
| Create | Test suite: `test/modules/` — integration tests for each high-priority module |
| Modify | `system.json` — optional: add moduleArt compatibility flags if needed |
| Document | Release notes — link to MODULE_COMPATIBILITY.md |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 32 has not started)

### ❌ Not Started (All Tasks for Phase 32)

**Module Selection & Prioritization:**
- [ ] Identify target modules (15+ high-priority):
  - **Combat & Initiative**: Combat Utility Belt, Turn Marker, Polyglot
  - **Item Management**: Tidy5e Sheets, Better Rolls, Item Piles
  - **Content**: Level Up!, Furnace, SimpleCalendar
  - **Utility**: Monk's Little Details, FXMaster, Bluetooth Dice
  - Add 3-5 more based on community survey
- [ ] For each module:
  - Get latest version (as of test date)
  - Document authors and links
  - Identify what it modifies (sheets, actors, items, hooks)
- [ ] Rank by risk:
  - High-risk: modifies core prep mechanisms, overrides sheets
  - Medium-risk: modifies UI/display only
  - Low-risk: utility/chat macros
- [ ] Test plan: Start with low-risk, move to high-risk
- [ ] Test: Module list finalized

**Baseline Testing Setup:**
- [ ] Create test world: "Module Integration Tests"
- [ ] Create baseline test character: Level 5 Fighter
  - STR 16, DEX 12, CON 14, INT 10, WIS 13, CHA 11
  - Equipment: Longsword, plate armor, shield
  - Feat: Power Attack
  - Spell (if caster)-: None (Fighter)
  - Has one Active Effect: +1 to damage (bonus buff)
  - Skills: some ranks in key skills
- [ ] Create baseline test scenario:
  - 3 goblins (level 1, HP 5 each)
  - Fighter attacks first goblin with Power Attack
  - Record: attack roll, damage roll, bonus calculations
- [ ] Document baseline behavior:
  - Combat duration
  - Bonus stacking history accuracy
  - Chat card rendering
  - Character sheet data binding
  - No console errors
- [ ] Screenshot all baseline data for comparison
- [ ] Test: Baseline scenario runs without errors

**Module Integration Testing Process (Per Module):**
- [ ] Create testing template/checklist for each module:
  - Module name, version, author, link
  - Installation: easy, requires config, complex
  - Conflicts or issues identified
  - Workarounds available
  - Compatibility: ✅ COMPATIBLE, ⚠️ PARTIAL, ❌ INCOMPATIBLE
  - Affected features (from Phase 20 list): combat, sheets, items, etc.
  - Test date and tester name
- [ ] Setup phase:
  - Enable module only (no other modules)
  - Restart world/reload
  - Check console: any errors on load?
- [ ] Character sheet test:
  - Open baseline party character
  - Sheet should render without errors
  - All fields visible and editable as expected
  - Scroll through all tabs
  - Check: does module modify layout? UI breaking?
- [ ] Preparation test:
  - Load character sheet
  - Monitor console
  - Should complete without errors
  - Bonus calculations should be correct
  - Stacking history should be populated
- [ ] Action test:
  - Execute baseline scenario (3 goblins fight)
  - Roll attack with Power Attack modifier
  - Verify: bonuses apply correctly (+2 BAB +4 STR +2 Power Attack +1 buff = +9)
  - Verify: stacking history shown in chat
  - Verify: damage roll includes all bonuses
- [ ] Chat rendering test:
  - Chat cards should display module-enabled
  - No layout breaking
  - Images should load
  - Buttons should work (if module adds any)
- [ ] Data persistence test:
  - Make change to character (edit note, add item, change AC)
  - Save and close world
  - Reopen world with module
  - Verify: changes persisted
  - Verify: module features still work
- [ ] Performance test:
  - Time sheet open: should be < 500ms
  - Time combat resolution: < 2 seconds
  - Check: FPS drops, performance issues
- [ ] Logging:
  - Document all findings
  - Screenshot any issues
  - Record console errors
  - Note: behavior changes
- [ ] Test: Module integration testing complete

**Module Conflict Categories & Resolutions:**
- [ ] **Stacking History Conflicts** (affects: Combat Utility Belt, Better Rolls)
  - Conflict: Module displays bonus info, but doesn't respect system._stackingHistory
  - Symptom: Bonuses shown incorrectly, stacking ignored
  - Resolution: Create integration hook, provide API for module to access stacking
  - Action: Update helper utilities in moduleIntegration.mts
- [ ] **Sheet Data Binding Conflicts** (affects: Tidy5e Sheets, sheet extensions)
  - Conflict: Custom sheet modifies data binding, breaks our reactive properties
  - Symptom: Data doesn't update when changed
  -Resolution: Document compatible data binding patterns, provide examples
  - Action: Create MODULE_INTEGRATION.md guidelines
- [ ] **Item Preparation Conflicts** (affects: Item management modules)
  - Conflict: Module modifies item prep during `prepareDerivedData()`
  - Symptom: Item system.bonuses corrupted, stacking breaks
  - Resolution: Provide hooks for safe modification, document phase access
  - Action: Add helper methods to moduleIntegration.mts
- [ ] **Active Effect Hook Conflicts** (affects: Effect manager modules)
  - Conflict: Module mutates ActiveEffect data unsafely
  - Symptom: AE bonuses don't apply, stacking lost
  - Resolution: Provide safe AE mutation API
  - Action: Create Dnd35eActiveEffect wrapper helpers
- [ ] **Chat Card Rendering Conflicts** (affects: Chat enhancements modules)
  - Conflict: Module overrides chat template, loses bonus display
  - Symptom: Stacking history not shown, just final result
  - Resolution: Provide template partial for bonus display
  - Action: Create reusable template for stacking history
- [ ] **Compendium Lookup Conflicts** (affects: Level Up!, compendium modules)
  - Conflict: Module caches compendium items, doesn't respect updates
  - Symptom: Changes to SRD items don't appear
  - Resolution: Document versioning & caching patterns
  - Action: Provide API for invalidating caches

**Conflict Resolution Matrix (Document):**
- [ ] Create `docs/MODULE_CONFLICTS.md` (internal working document)
- [ ] Table format for each module:
  - Module name, version
  - Known conflicts (❌ incompatibility found)
  - Known issues (⚠️ partial compatibility)
  - Workarounds (if any)
  - Status (needs patch, patch available, version update required)
  - Recommended version
  - Author contacted? (Y/N)
- [ ] Fill in during testing phase
- [ ] Examples:
  ```
  | Better Rolls | 1.3.2 | Bonus display shows final only, not history | Medium | Patch available | 1.3.2+ | Y |
  | Tidy5e Sheets | 0.6.1 | Some sheet tabs don't render correctly | Low | Use 0.6.0 or wait for update | 0.6.0 | Y |
  ```
- [ ] Test: Matrix comprehensive and accurate

**Module Integration API (Helper Utilities):**
- [ ] Create `src/modules/moduleIntegration.mts`
- [ ] Implement utility functions for module authors:

**Stacking History Access:**
```typescript
export function getStackingHistory(item: Dnd35eItem, fieldName: string) {
  return item.system._stackingHistory?.find(h => h.field === fieldName);
}

export function formatStackingHistory(item: Dnd35eItem, fieldName: string): string {
  // Returns formatted string: "+2 (BAB +1, Feat +1)"
  const history = getStackingHistory(item, fieldName);
  if (!history) return "";
  return history.applied.map(a => `+${a.value} (${a.source})`).join(", ");
}
```

**Active Effect Inspection:**
```typescript
export function getActiveEffectChanges(effect: Dnd35eActiveEffect) {
  if (effect.system.buildChanges) {
    return effect.system.buildChanges();
  }
  return effect.changes || [];
}

export function isBonusType(changeKey: string): boolean {
  // Check if this change applies a stacking bonus
  return changeKey.includes('bonusType');
}
```

**Compendium Utilities:**
```typescript
export async function resolveCompendiumItem(uuid: string) {
  return fromCompendiumUuid(uuid);
}

export function getSourceCompendia(itemType: string): Compendium[] {
  // Return all dnd35e official packs of type
  return game.packs.filter(p => 
    p.metadata.system === 'dnd35e' && p.metadata.type === itemType
  );
}
```

**Item Preparation Safety:**
```typescript
export function onItemPrepareData(item: Dnd35eItem, callback: () => void) {
  // Call callback AFTER prepareDerivedData completes
  // Ensures stacking history is ready
  Hooks.on('dnd35e.itemPrepared', (item) => callback());
}
```

- [ ] Export all as `game.dnd35e.modules.*`
- [ ] Add TypeScript definitions (see below)
- [ ] Test: All helpers functional

**Module Integration TypeScript Definitions:**
- [ ] Create `src/types/moduleIntegration.d.ts`
- [ ] Define interfaces for module type hints:
  ```typescript
  interface StackingHistoryEntry {
    field: string;
    applied: StackingEntry[];
    ignored: IgnoredEntry[];
  }
  
  interface StackingEntry {
    source: string;
    value: number;
    bonusType: string;
  }
  
  interface IgnoredEntry {
    source: string;
    reason: "duplicate-bonus-type" | "lower-value" | "other";
  }
  ```
- [ ] Define module helpers namespace:
  ```typescript
  namespace game.dnd35e.modules {
    function getStackingHistory(item, fieldName): StackingHistoryEntry;
    function getActiveEffectChanges(effect): EffectChangeData[];
    ...
  }
  ```
- [ ] Test: Definitions compile without TypeScript errors

**Module Integration Tests (Automated):**
- [ ] Create test suite: `test/modules/`
- [ ] Test file: `test/modules/moduleIntegration.test.ts`
- [ ] For each high-priority module:
  - Unit test: Can load module without crashing
  - Can enable module in test world
  - Baseline character sheet opens
  - Baseline fight scenario completes
  - Combat results match expected values
- [ ] Example test:
  ```typescript
  test('Combat Utility Belt compatible', async () => {
    // Enable CUB module
    await enableModule('combatUtilityBelt');
    
    // Create test character
    const fighter = await createTestFighter();
    
    // Run attackroll
    const result = await fighter.rollAttack('longsword');
    
    // Verify no console errors
    expect(result.success).toBe(true);
    
    // Verify bonus stacking history
    expect(result.stacking).toBeDefined();
  });
  ```
- [ ] Run tests: `npm test -- modules`
- [ ] All tests should pass (or mark expected failures)
- [ ] Test: Module tests comprehensive

**Module Compatibility Documentation:**
- [ ] Create `docs/MODULE_INTEGRATION.md`:
  - **Integration Guide for Module Authors**
  - **Quick Start**: "How to ensure your module is compatible"
  - **Stacking History Integration** section:
    - Explain `system._stackingHistory` structure
    - Show example code to display stacking
    - Link to helpers
  - **Active Effect Extension** section:
    - Explain `Dnd35eEffectChangeData`
    - Show how to safely add/modify AE
    - Link to helpers
  - **Sheet Hook Safety** section:
    - Which hooks are safe for modules (prepareBaseData, prepareDerivedData, etc.)
    - Which hooks NOT to use (setProperty on system during prep)
    - Examples of SAFE vs UNSAFE modifications
  - **Compendium Testing** section:
    - How to ensure compendium imports work
    - UUID persistence
    - Source ID tracking
  - **Common Pitfalls** section:
    - "Don't mutate actor.system.bonuses during prep" (causes loss of history)
    - "Don't override prepareEmbeddedDocuments" (can break system hooks)
    - "Don't assume Phase 0 has completed" (don't rely on calculations in prep)
  - **API Reference** section:
    - Full list of game.dnd35e.modules.* helpers
    - TypeScript definitions
    - Examples of using each helper
  - **Request Integration**: "Is your module breaking? File an issue with [repo]"
- [ ] Create `docs/MODULE_COMPATIBILITY.md`:
  - **Matrix Table**: module name, version, status, notes
  - **Compatibility Status Levels**:
    - ✅ COMPATIBLE — no issues, fully supported
    - ⚠️ PARTIAL — works but minor issues or workarounds needed
    - ❌ INCOMPATIBLE — breaks core features
    - 🟡 TESTING — not yet tested
  - Example table:
    ```
    | Module | Version | Status | Notes |
    |--------|---------|--------|-------|
    | Combat Utility Belt | 1.3.2 | ✅ | Full compatibility |
    | Better Rolls | 1.3.2 | ⚠️ | Requires patch for stacking display |
    | Tidy5e Sheets | 0.6.1 | ⚠️ | Use 0.6.0 recommended |
    ```
  - **System Requirements** section: Foundry version, dnd35e version
  - **Installation Instructions**: How to install/enable modules safely
  - **Recommended Modules** list: Best modules for D&D 3.5e
  - **Known Incompatibilities** section: What NOT to use
  - **Community Contributions**: How to report compatibility issues
  - Updated: monthly or when new module found incompatible
- [ ] Test: Docs comprehensive and accurate

**Module Feedback Loop Setup:**
- [ ] Create discussion forum or GitHub issue template:
  - Module name and version
  - Issue description
  - Expected behavior
  - Actual behavior
  - Steps to reproduce
  - System version, Foundry version, other modules enabled
- [ ] Assign module compatibility owner (dev or community lead)
- [ ] Process:
  - Issue filed → categorized
  - If system bug: assign to dev
  - If module bug: notify author with reproduction steps
  - If incompatible: add to compatibility matrix with workaround
  - Monthly review meeting
- [ ] Test: Feedback loop functional

**Module Author Communication:**
- [ ] Contact top 10 module authors preemptively:
  - "We're releasing dnd35e system. Your module might benefit from updates."
  - Share integration guide
  - Ask: "Would you test compatibility?"
  - Offer: "We can help identify issues"
  - Provide: links to API helpers
- [ ] Host "Module Integration Office Hours":
  - Recurring meeting for module authors
  - Share testing results
  - Discuss compatibility patterns
  - Answer questions
- [ ] Test: Authors respond positively

**System Manifest Flags (Optional):**
- [ ] Add to `system.json`:
  ```json
  "compatibility": {
    "minimum": "11.0",
    "verified": "11.305",
    "maximum": "12.0"
  },
  "modules": {
    "compatible": ["module-id-1", "module-id-2"],
    "incompatible": ["module-id-x"]
  }
  ```
- [ ] Update on each release
- [ ] Test: Manifest loads without errors

**Release Notes Integration:**
- [ ] In system release notes:
  - Link to MODULE_COMPATIBILITY.md
  - Highlight: "X modules tested and compatible"
  - Warning: "Y modules have known issues, see compatibility guide"
  - Encourage: "Test your favorite modules, report issues"
- [ ] Version updates:
  - If new module conflicts found: note in patch release
  - If patch for module provided: mention in changelog
- [ ] Test: Release notes clear

**Localization & i18n:**
- [ ] Module integration doesn't affect i18n


**Comprehensive Testing:**
- [ ] Smoke test: All 15 high-priority modules
  - Load with each module: no errors
  - With all together: no conflicts
  - Character sheet, inventory, combat work
- [ ] Integration test: Stacking history with each module
  - Module enabled
  - Attack roll with 5+ bonuses
  - History displays correctly in chat
- [ ] Integration test: Active Effects with each module
  - Module enabled
  - Apply buff effect
  - Effect bonuses apply correctly
  - No stacking corruption
- [ ] Integration test: Compendium drag-drop with each module
  - Module enabled
  - Drag item from compendium
  - Item added to inventory correctly
  - Source tracking preserved
- [ ] Edge case: Multiple modules enabled
  - Enable 5 modules together
  - Character sheet loads
  - Combat works
  - No crashes or console errors
- [ ] Edge case: Disabled module, then re-enable
  - Disable high-priority module
  - Character sheet loads (fallback to system default sheet)
  - Re-enable module
  - Custom sheet applies
  - Data intact
- [ ] Performance test: Module load time
  - First load with all 15 modules: < 5 seconds
  - Reload: < 2 seconds
  - No FPS drops during combat
- [ ] Regression test: Baseline scenario (no modules)
  - Fighter vs. 3 goblins still works after all testing
  - No system corruption

**Documentation & Handoff:**
- [ ] Create final MODULE_COMPATIBILITY.md for public distribution
- [ ] Create internal notes for next testing cycle
- [ ] Create known issues list for module authors
- [ ] Create recommendations for community:
  - "Start with these 5 modules"
  - "Avoid these 3 modules until updated"
  - "Test your own modules!"
- [ ] Timeline for future re-testing: every X months or on new Foundry release
- [ ] Assign future owner: who maintains compatibility matrix?

---

## 32.9 Success Criteria

✅ **10+ major modules tested** and documented  
✅ **0 critical conflicts** that break core functionality  
✅ **Integration guide published** and linked from system README  
✅ **Module authors have clear patterns** to follow  
✅ **Module compatibility matrix** maintained and updated regularly  
✅ **Community confidence** — reports from beta testers of successful module usage

---

## 32.10 Deferred to Future Phases

- **Automated compatibility checker** — a tool that scans modules for red flags
- **Module conflict resolver UI** — in-app visualization of conflicts + suggestions
- **Forge module hosting** — distribute dnd35e-compatible modules alongside system
