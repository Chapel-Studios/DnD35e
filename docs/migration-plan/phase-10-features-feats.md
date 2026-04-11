# Phase 10: Features & Feats (POC)

**Status**: 📋 Outlined (Feat types, EffectTriggers, passive/toggle/trigger patterns)

> **Milestone**: POC  
> **Dependencies**: Phase 5, Phase 8 (Action System)  
> **Goal**: A `feat` item type using the Material AE pattern. POC implements three feats proving all three effect pipelines: **Weapon Focus** (passive AE → attack bonus), **Power Attack** (per-attack toggle → PreRollDialog slider), and **Cleave** (EffectTrigger → bonus action on kill). These three prove the full feat → action system integration.

> **Action System note**: Feats modify actions via three mechanisms defined in Phase 8 (§18.10): (1) Material AE changes targeting action fields, (2) toggles that add PreRollDialog options, (3) EffectTriggers that grant/modify actions on events (onKill, onCrit, etc.).

---

## 10.1 Feat Item Type

```
FeatSystemModel extends ItemSystemModelBase
├── featType: 'feat' | 'classFeat' | 'trait' | 'racial' | 'spellSpecialization'
├── activation: { type: 'passive' | 'free' | 'swift' | 'move' | 'standard' | 'fullRound', cost: number }
├── uses: { value: number, max: number, per: 'day' | 'encounter' | 'week' | 'unlimited' } | null
├── prerequisites: string (human-readable)
├── source: string (book reference)
└── (passive bonuses generated as AE changes in prepareDerivedData)
```

## 10.2 Feat as Effect Source

When a feat is on an actor, its passive bonuses follow the Material pattern:
- Feat's `prepareDerivedData()` generates system changes targeting the ACTOR
- Changes include bonus type for stacking rules
- Applied during actor's `applyActiveEffects()` phase
- Example: Weapon Focus generates `{ key: 'system.weaponFocus.longsword', mode: ADD, value: 1, bonusType: 'untyped' }`

**Conditional bonuses** (e.g., "+2 attack when flanking") are stored but flagged with a condition. These are **not applied during data prep** — they're checked at roll time in the attack dialog. This is a precursor to the predicate system that may evolve later.

## 10.3 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/feat/` — Feat class, data model, sheet |
| Create | Vue components for feat sheet |
| Modify | Actor sheet — Features tab listing feats by type |
| Modify | `system.json` — register feat type |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 10 has not started)

### ❌ Not Started (All Tasks for Phase 10)

**Feat Data Model & Schema:**
- [ ] Create `src/entities/items/feat/FeatSystemModel.mts` extending ItemSystemModelBase
- [ ] Define schema: featType (StringField with choices: 'feat', 'classFeat', 'trait', 'racial', 'spellSpecialization')
- [ ] Define schema: activation (SchemaField with type + cost for activated feats, or null for passive)
- [ ] Define schema: uses (SchemaField with value, max, per: 'day'|'encounter'|'week'|'unlimited', or null for unlimited)
- [ ] Define schema: prerequisites (StringField, human-readable text e.g. "Str 15, Cleave")
- [ ] Define schema: source (StringField, book reference e.g. "PHB p. 92")
- [ ] Add `identifiedName` and `unidentifiedName` fields (Dnd35eField pattern, though feats are always identified)
- [ ] Add flag: conditional bonuses (array) for future predicates — store conditions like "flanking" without applying in prep
- [ ] Add field: feat components/tags for filtering: ['weapon', 'combat', 'teamwork', 'leadership'] (stub, optional)
- [ ] Test: FeatSystemModel instantiation
- [ ] Test: Schema validation (activation required if feat is activated, uses.per must match enum)

**Feat Item Class:**
- [ ] Create `src/entities/items/feat/ItemDnd35eFeat.mts` extending ItemDnd35e
- [ ] Override `prepareDerivedData()` to generate passive bonuses as AE changes (Material pattern)
- [ ] Implement `buildChanges()` method following Material pattern: generate system changes for passive effects
- [ ] For Weapon Focus: if feat has `targetWeapon` property, generate `{ key: 'system.attacks.[weapon].attackBonus', mode: ADD, value: 1, bonusType: 'untyped' }`
- [ ] Support conditional bonus storage: parse condition string (e.g. "flanking", "against humanoids") and flag for roll-time evaluation
- [ ] Store condition in: `system._conditionalBonuses` array with {condition: string, change: Change}
- [ ] Implement roll-time condition checking: pass to PreRollDialog for player to declare if conditions met
- [ ] Get feat prerequisites: return string from `system.prerequisites`
- [ ] Test: Feat generates expected AE changes
- [ ] Test: Conditional bonuses stored correctly
- [ ] Test: Feat can be added to actor's items list

**Feat Sheet (Vue Component):**
- [ ] Create `src/vue/components/sheets/FeatSheetDnd35e.vue` extending base item sheet
- [ ] Implement tabs: Details, Prerequisites, Description, Advanced
- [ ] **Details tab**: Show feat type dropdown, activation type/cost for activated feats, uses value/max/per
- [ ] **Prerequisites tab**: Rich text editor for prerequisites, tags for filtering (optional feature for future)
- [ ] **Description tab**: Rich text editor for feat description
- [ ] **Advanced tab**: Conditional bonuses list editing (text field per condition), any feat-specific flags
- [ ] Implement i18n for all labels: featType, activation, uses, prerequisites
- [ ] Add formgroup fields for numeric inputs (cost, uses value/max)
- [ ] Add dropdown for activation type
- [ ] Add tag selector for feat type (optional UI enhancement)
- [ ] Test: Feat sheet renders all tabs
- [ ] Test: Can edit feat properties
- [ ] Test: Changes persist when saved

**Three POC Feats - Weapon Focus:**
- [ ] Create template/content: Weapon Focus feat configuration
- [ ] Implement Weapon Focus with data: { featType: 'feat', activation: null (passive), targetWeapon: 'longsword' }
- [ ] Weapon Focus generates AE change: `{ key: 'system.attacks.longsword.attackBonus', mode: ADD, value: 1, bonusType: 'untyped' }`
- [ ] Test: Add Weapon Focus (Longsword) to fighter actor
- [ ] Test: Attack with longsword rolls at +1 bonus (visible in chat card)
- [ ] Test: Attack with other weapon does NOT get bonus
- [ ] Test: Disable Weapon Focus → bonus removed

**Three POC Feats - Power Attack:**
- [ ] Create template/content: Power Attack feat configuration
- [ ] Implement Power Attack with data: { featType: 'feat', activation: null (passive = always available toggle) }
- [ ] Power Attack integrates into PreRollDialog: adds PA slider for per-attack use
- [ ] Modify PreRollDialog to check actor's feats for 'Power Attack': if present, show PA slider
- [ ] PA slider: range 0 to actor.system.bab, tradeoff 1 attack = 1 damage (1H), 1 damage (2H normal), or 1.5 damage (2H with specific feats)
- [ ] Test: Fighter has Power Attack feat
- [ ] Test: Open PreRollDialog before attack → PA slider appears
- [ ] Test: Use slider to trade -2 attack for +4 damage
- [ ] Test: Chat card shows adjusted attack bonus and damage
- [ ] Test: Fighter without Power Attack → slider doesn't appear
- [ ] Test: Can disable feat to hide slider

**Three POC Feats - Cleave:**
- [ ] Create template/content: Cleave feat configuration
- [ ] Implement Cleave with data: { featType: 'feat', activation: null (passive trigger) }
- [ ] Cleave creates EffectTrigger: { event: 'onKill', grantAction: {type: 'free', restriction: 'melee adjacent'} }
- [ ] Integrate EffectTrigger into ActionExecutionEngine: listen for onKill event during attack chain
- [ ] When onKill fires and Cleave is active: grant 1 free melee attack action to HUD
- [ ] Free action appears in HUD with label "Cleave (free)"
- [ ] Restrict cleave to melee attacks only: action available only if previous attack was melee
- [ ] Restrict to adjacent targets: only show available targets adjacent to killed target
- [ ] Test: Fighter with Cleave kills enemy
- [ ] Test: Free attack action appears immediately in HUD
- [ ] Test: Execute free attack against different adjacent enemy
- [ ] Test: Second kill triggers another Cleave (chain)
- [ ] Test: Fighter without Cleave → no free attack on kill

**Feat Sheet Component Integration:**
- [ ] Embed FeatSheetDnd35e in item sheet registration
- [ ] Register with CONFIG.Item.documentClasses
- [ ] Add feat icon/image support (placeholder image path)
- [ ] Import feat sheet into registry so feat items display custom sheet
- [ ] Test: Open feat item → shows custom sheet, not generic item sheet
- [ ] Test: Edit feat fields → persists

**Actor Features Tab Integration:**
- [ ] Modify ActorSheetDnd35e Features tab
- [ ] List all feat items owned by actor
- [ ] Group feats by type: Feats, Class Features, Racial Abilities, Traits
- [ ] Show feat name, activation type (passive/free/swift/standard), prerequisites
- [ ] Add drag-and-drop from compendium to add feats
- [ ] Show delete button to remove feat from actor
- [ ] Show enable/disable toggle for each feat
- [ ] If feat has uses, show "Uses: X/Y per day"
- [ ] Support filtering by type: dropdown to show only specific feat categories
- [ ] Test: Add feat to actor → appears in Features tab
- [ ] Test: Tab groups feats correctly by type
- [ ] Test: Enable/disable feat
- [ ] Test: Delete feat from tab
- [ ] Test: Drag-drop compendium feat to actor

**Conditional Bonus Roll-Time Integration:**
- [ ] Modify PreRollDialog to check for conditional bonuses
- [ ] Get actor's feats with conditional bonuses
- [ ] For each conditional bonus, add checkbox: "Flanking?" / "Bonus from X?"
- [ ] If player checks box, include conditional bonus in attack roll
- [ ] Track which conditionals were applied in roll data for chat card
- [ ] Display applied conditionals in chat card details
- [ ] Test: Feat with conditional "+2 attack when flanking"
- [ ] Test: Open PreRollDialog, see checkbox for "Flanking"
- [ ] Test: Check box → bonus applied to roll
- [ ] Test: Don't check box → bonus not applied
- [ ] Test: Chat card shows "Flanking bonus applied" in details

**System Registration & Config:**
- [ ] Register feat item type in `system.json`: register under Item.types with sheet subclass path
- [ ] Add to CONFIG.Item.documentClasses: feat → ItemDnd35eFeat
- [ ] Add to CONFIG.DND35E.itemTypes: display name, icon, default settings
- [ ] Create compendium pack stub: `dnd35e.feats` (deferred to Phase 4 population, Phase 26 browser)
- [ ] Add i18n keys: featType values ('feat', 'classFeat', 'trait', 'racial')
- [ ] Add i18n keys: activation types ('passive', 'free', 'swift', 'move', 'standard', 'fullRound')
- [ ] Add i18n keys: uses per ('day', 'encounter', 'week', 'unlimited')
- [ ] Update en.json with all new keys
- [ ] Test: system.json loads without error
- [ ] Test: feat type selectable in item creation
- [ ] Test: Default settings apply to new feats

**Localization & i18n:**
- [ ] Add i18n key structure: dnd35e.feats.* for feat labels
- [ ] Add i18n key: dnd35e.itemTypes.feat
- [ ] Add i18n keys for all feat-related labels (prerequisites, source, activation, uses, featType)
- [ ] Add i18n keys for feat names (Weapon Focus, Power Attack, Cleave, etc.)
- [ ] Update en.json with all keys
- [ ] Test: Feat sheet renders with localized labels

**Comprehensive Testing:**
- [ ] Unit test: FeatSystemModel instantiation with various activation types
- [ ] Unit test: buildChanges() generates correct AE changes for Weapon Focus
- [ ] Unit test: Conditional bonus storage and retrieval
- [ ] Integration test: Create fighter with Weapon Focus (Longsword)
- [ ] Integration test: Roll attack with weapon → +1 bonus from feat visible in chat
- [ ] Integration test: Fighter with Power Attack → PreRollDialog shows PA slider
- [ ] Integration test: Use PA slider → attack & damage adjust correctly
- [ ] Integration test: Fighter with Cleave → kill enemy → free attack granted
- [ ] Integration test: Execute Cleave free attack → second kill triggers another
- [ ] Integration test: Feat sheet opens and edits correctly
- [ ] Integration test: Actor Features tab lists feats, groups by type, allows add/remove
- [ ] Integration test: Disable feat → bonuses removed from attack roll
- [ ] Integration test: Enable feat → bonuses reapplied
- [ ] Integration test: Feat with conditional bonus + checkbox in dialog
- [ ] Edge case: Actor with multiple Weapon Focus feats (same weapon) → stacking rules apply
- [ ] Edge case: Multiple feats granting Power Attack-like mechanics → UI shows all
- [ ] Edge case: Cleave without melee weapon equipped → action not available
- [ ] Edge case: Cleave against immune/unhittable target → kill not detected
- [ ] Smoke test: Add feat, remove feat, edit feat, update actor → no console errors
- [ ] Smoke test: Full combat round with feats (PA used, feat bonuses applied) → no errors
- [ ] Performance test: Actor with 10+ feats, feat bonuses calculated < 50ms

**Documentation & User Guides:**
- [ ] Document three POC feats: Weapon Focus, Power Attack, Cleave
- [ ] Document how feat sheet works and how to create new feats
- [ ] Create journal entry: "Using Feats & Fighting Styles" (basic guide for players)
