# Phase 12: Classes (POC)

**Status**: 📋 Outlined (Class progression, multiclass stacking, bonus feats)

> **Milestone**: POC  
> **Dependencies**: Phase 4 (Compendium Foundation), Phase 11 (Races)  
> **Goal**: A `class` item type with level progression. Classes grant features at specific levels, contribute to BAB, saves, HD, and skill points. Shares the Grant System with races (Phase 11).

> **Action System note**: BAB progression from class levels drives the IterativeAttackGenerator (Phase 8 §18.4) — the number of iterative attacks in a full attack is computed from total BAB. Save progression determines `#self.saves.*` values used in maneuver defense and save-based action checks.

---

## 12.1 Class Item Type

```
ClassSystemModel extends ItemSystemModelBase
├── classType: 'base' | 'prestige' | 'npc' | 'racial' | 'minion' | 'template'
├── level: number (current level in this class)
├── hd: string (hit die: 'd4' | 'd6' | 'd8' | 'd10' | 'd12')
├── bab: 'low' | 'med' | 'high'
├── saves: { fort: 'low' | 'high', ref: 'low' | 'high', will: 'low' | 'high' }
├── skillPointsPerLevel: number
├── classSkills: string[]
├── spellcasting: SpellcastingProgression | null (details in Phase 16)
├── grantedFeatures: GrantedFeature[] (reuses Grant System from Phase 13)
└── source: string
```

## 12.2 Multi-Classing

- Actor can have multiple class items
- Total character level = sum of all class levels
- BAB = sum of per-class BAB at each class's level
- Saves = sum of per-class save progressions
- HP = sum of per-class HD rolls or averages (configurable via health settings)

## 12.3 Level-Up Flow

1. Player increases a class item's level (or adds a new class at level 1)
2. System checks `grantedFeatures` for any at the new level that aren't yet granted
3. Granted features are created on the actor
4. HP increase: roll or average HD + CON mod (game setting controls which)
5. Skill points added: `skillPointsPerLevel + INT mod`
6. BAB, saves recalculated in `prepareDerivedData()`

## 12.4 Skills System (Expanded)

Now that classes define class skills and skill points:

```
ActorSystemModel.skills: Record<SkillKey, SkillData>
SkillData:
├── ranks: number
├── classSkill: boolean (derived: true if ANY class item lists this skill)
├── miscBonus: number (from AE changes)
├── ability: AbilityKey
├── armorCheckPenalty: boolean (affected by ACP from equipment)
└── total: number (derived: ranks + ability mod + (classSkill && ranks > 0 ? 3 : 0) + misc - ACP)
```

## 12.5 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/class/` — Class class, data model, sheet |
| Expand | Grant system — level-gated grants, level-down removal |
| Expand | Actor `prepareDerivedData()` — BAB, saves, HD, skill points from classes |
| Expand | Actor data model — skills with full SkillData |
| Create | `src/constants/skills.mts` — all 40+ D&D 3.5 skills |
| Modify | `system.json` — register class type |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 12 has not started)

### ❌ Not Started (All Tasks for Phase 12)

**Skills Constants:**
- [ ] Create `src/constants/skills.mts` file
- [ ] Define all 36 D&D 3.5e skills with metadata: { key, name, ability, armored?, trained?, description }
- [ ] Skills: Appraise, Balance, Bluff, Climb, Concentration, Craft (×5), Decipher Script, Diplomacy, Disable Device, Disguise, Escape Artist, Forgery, Gather Information, Handle Animal, Heal, Hide, Intimidate, Jump, Knowledge (×8), Listen, Move Silently, Perform (×5), Profession (×5), Ride, Search, Sense Motive, Sleight of Hand, Speak Language, Spellcraft, Spot, Survival, Swim, Tumble, Use Magic Device, Use Rope
- [ ] Mark which skills are armored (affected by armor check penalty): Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Sleight of Hand, Swim, Tumble, Use Rope
- [ ] Mark which skills require training to use at all (Disable Device, Heal, Profession, Spellcraft, Use Magic Device, Knowledge variants)
- [ ] Export as CONFIG.DND35E.skills
- [ ] Test: All skills accessible via constant lookup
- [ ] Test: Ability associations correct (Jump = STR, Listen = WIS, etc.)

**Class Data Model & Schema:**
- [ ] Create `src/entities/items/class/ClassSystemModel.mts` extending ItemSystemModelBase
- [ ] Define schema: classType (StringField with choices: 'base', 'prestige', 'npc', 'racial', 'minion', 'template')
- [ ] Define schema: level (NumberField, min 1, max 20, initial 1)
- [ ] Define schema: hd (StringField with choices: 'd4', 'd6', 'd8', 'd10', 'd12')
- [ ] Define schema: bab (StringField with choices: 'low', 'med', 'high' → maps to ×3/4, ×1, ×1 BAB progression)
- [ ] Define schema: saves (SchemaField with fort/ref/will, each choice: 'low'|'high' → maps to ×1/3 or ×1/2 progression)
- [ ] Define schema: skillPointsPerLevel (NumberField, typical: 2-8)
- [ ] Define schema: classSkills (ArrayField of StringField, autocomplete from skills constants, e.g. ["Appraise", "Balance", ...])
- [ ] Define schema: spellcasting (SchemaField or null for Phase 16, stub for now)
- [ ] Define schema: grantedFeatures (ArrayField reusing GrantedFeature with level gating)
- [ ] Define schema: source (StringField for book reference)
- [ ] Add `identifiedName` and `unidentifiedName` fields
- [ ] Test: ClassSystemModel instantiation
- [ ] Test: Schema validation

**Class Item Class:**
- [ ] Create `src/entities/items/class/ItemDnd35eClass.mts` extending ItemDnd35e
- [ ] Override `prepareDerivedData()`: generate class contribution to actor BAB, saves, HD
- [ ] Implement `getBabProgression()`: method returning BAB contribution for this class's level
  - Low BAB: +3, +6, +9, +12, +15, +18, ... (each +3 per 4 levels)
  - Med BAB: +1, +2, +3, +4, +5, +6, ... (each +1 per level)
  - High BAB: +1, +2, +3, +4, +5, +6, ... (same as med for base class, prestige adjusts)
- [ ] Implement `getSaveProgression(save)`: method returning save contribution for save type
  - Low: +1, +1, +1, +1, +2, +2, +2, ... (every 3 levels +1)
  - High: +2, +2, +3, +3, +4, +4, +5, ... (every 2-3 levels pattern)
- [ ] Implement `getHitDiceCount()`: return level (number of dice rolled/averaged)
- [ ] Implement `getSkillPointsForLevel(level)`: return skillPointsPerLevel + INT mod passed from actor
- [ ] Store class contribution to actor as "class BAB +X", "class Save +Y" etc via event or temporary storage
- [ ] Handle multiclass: each class item contributes independently, actor sums them
- [ ] Test: Fighter (high BAB) at level 5 → BAB +5
- [ ] Test: Cleric (med BAB) at level 5 → BAB +3
- [ ] Test: Rogue (level 5) at level 5 → BAB +3
- [ ] Test: Fighter/Cleric multiclass → BAB contributions stack correctly

**Class Sheet (Vue Component):**
- [ ] Create `src/vue/components/sheets/ClassSheetDnd35e.vue` extending base item sheet
- [ ] Implement tabs: Details, Features, Skills, Description
- [ ] **Details tab**: Show classType dropdown, level input/slider, HD dropdown, BAB choice, save choices, skillPointsPerLevel
- [ ] Display BAB/save progression table: show progression from level 1→20 with current level highlighted
- [ ] **Features tab**: List grantedFeatures with level gate (show which level feature is granted)
- [ ] Add/remove buttons for features
- [ ] Drag-drop support for feat UUIDs into features list
- [ ] **Skills tab**: Checkbox list of class skills (from skills constants), can check/uncheck to mark as class skill
- [ ] **Description tab**: Rich text editor for class description/lore
- [ ] Implement i18n for all labels
- [ ] Test: Class sheet renders all tabs
- [ ] Test: Can edit class properties
- [ ] Test: BAB/save progression table displays correctly
- [ ] Test: Can add/remove feature grants
- [ ] Test: Class skills selection works

**Grant System Expansion - Level-Gated Grants:**
- [ ] Modify `src/helpers/grants.mts` (from Phase 11)
- [ ] Extend GrantedFeature interface: add optional `level` field for class level when feature is granted
- [ ] Implement `grantFeaturesForLevel(actor, classItem, level)`: Promise<Item[]>
  - Filter grantedFeatures by level === parameter level
  - Grant only new ones (not already granted)
  - Return created items
- [ ] Implement `revokeAllGrantsForClass(actor, classItem, downToLevel)`: Promise<void>
  - For all grantedFeatures with level > downToLevel, revoke them
  - Delete associated items from actor
- [ ] Implement multiclass-aware revocation: if revoking a Fighter class, only remove Fighter-granted features, keep Cleric features
- [ ] Handle bonus feats: Fighters get bonus feats at every odd level (Phase 10 Feat system handles the template, this just grants at correct level)
- [ ] Test: Add Fighter class at level 1 → feature at level 1 granted
- [ ] Test: Level up Fighter to level 5 → feature at level 5 granted, earlier ones still present
- [ ] Test: Remove Fighter class → all granted features removed
- [ ] Test: Add Fighter level 3, Add Cleric level 3 → both feature sets co-exist
- [ ] Test: Level up Cleric to 5 → Cleric features updated, Fighter features unchanged

**Actor Class Support & Multi-Classing:**
- [ ] Modify ActorDnd35e to support multiple class items (unlike race, can have many)
- [ ] Implement `getClasses()`: returns array of class items on actor
- [ ] Implement `getTotalLevel()`: sums all class item levels
- [ ] Allow multiple class items on actor (remove the single-race-only enforcement, but keep it active to prevent double-adding same class)
- [ ] On class item add/level change: trigger level-up flow
- [ ] On class item remove: trigger level-down flow
- [ ] Test: Add one class → actor shows level 1
- [ ] Test: Level up to 5 → actor shows level 5
- [ ] Test: Add second class at level 1 → total level 6
- [ ] Test: Remove class → appropriate level removed

**Level-Up Pipeline:**
- [ ] Create `src/entities/actor/LevelUpManager.mts` or handle in ActorDnd35e
- [ ] Detect class item level increase (compare current level to previous)
- [ ] For each level gained:
  - Increment HP: roll +CON mod (or average)
  - Grant features for that level
  - Grant skill points: skillPointsPerLevel + INT mod
  - Update actor with new HP, skill point pool
- [ ] Provide UI notification: "Level up! You gained 2 feat. 2 skill points, and 8 HP"
- [ ] For level decrease (if allowed): reverse steps (delete features, remove HP)
- [ ] Test: Level Fighter from 4 to 5 → HP increases, features granted, skill points added
- [ ] Test: Level up to 6 → another 5+ points gained

**Actor Data Model - Skills Expansion:**
- [ ] Modify ActorSystemModel.skills from stub to full SkillData
- [ ] Define SkillData schema: 
  - ranks (NumberField, 0-max based on level)
  - classSkill (BooleanField, derived: true if any class item lists this skill OR actor has trait granting it)
  - miscBonus (NumberField for AE modifiers)
  - ability (StringField, derived: which ability this skill uses)
  - armorCheckPenalty (BooleanField, true if affected by armor ACP)
  - total (NumberField, derived formula)
- [ ] Populate `system.skills` with all 36 D&D 3.5e skills during actor creation
- [ ] Implement skill total calculation: `ranks + ability mod + (classSkill && ranks > 0 ? 3 : 0) + misc bonus - armor check penalty`
- [ ] Make total derived during `prepareDerivedData()`: each skill recalculates
- [ ] Test: Actor with 2 ranks in Climb (class skill) with STR +3 → total 2 + 3 + 3 = 8
- [ ] Test: 1 rank in non-class skill with WIS +2 → total 1 + 2 = 3 (no +3)
- [ ] Test: Armor check penalty applied to armored skills

**Prepare Derived Data - BAB, Saves, Skills Calculation:**
- [ ] Modify Actor `prepareDerivedData()` implementation
- [ ] Calculate total BAB: sum of all class item `getBabProgression()` calls
- [ ] Store in `system.attributes.bab.total`
- [ ] Calculate save totals:
  - For each save (fort, ref, will): base + ability mod + class contributions + AE bonuses
  - Store in `system.saves.[save].total`
- [ ] Calculate skill class skill status: for each skill, if any class has it as class skill, set `system.skills.[skill].classSkill = true`
- [ ] Calculate each skill's total (already defined above)
- [ ] Store results in actor.system for UI consumption
- [ ] Test: Fighter level 5 → BAB +5
- [ ] Test: Rogue level 5 → BAB +3
- [ ] Test: Fighter/Rogue MC level 5/5 → BAB +8 (5+3)
- [ ] Test: Skills recalculate when class added/removed

**Actor Sheet - Combat Tab with BAB/Saves/Skills:**
- [ ] Add Combat tab to actor sheet (stub in Phase 5, expand here)
- [ ] Display: Total BAB (highlighted), per-class breakdown
- [ ] Display: All saves (fort, ref, will) with base + mod total
- [ ] Display: Per-class BAB contribution showing class name + contribution
- [ ] Test: Fighter/Cleric MC shows both class BAB contributions

**Actor Sheet - Skills Tab:**
- [ ] Create/expand Skills tab in actor sheet Vue component
- [ ] Display all 36 skills in list
- [ ] For each skill: show ranks (editable), ability icon, class skill checkbox (checked if class skill, disabled for editing), total
- [ ] Show armor check penalty indicator if applicable
- [ ] Mark skills with red if trained-only but ranks = 0
- [ ] Support editing skill ranks (increase/decrease buttons or number input)
- [ ] Show remaining skill points from level(s) available to spend
- [ ] Add allocation interface: pick skills to add ranks to, confirm to spend points (or allow free-form rank assignment if DM setting)
- [ ] Test: Rogue with 5 points available → add 3 to Climb, 2 to Escape Artist
- [ ] Test: Class skill shows +3, non-class doesn't
- [ ] Test: Armor with ACP shows ACP reduction on armored skills

**Health Management & HD Rolling:**
- [ ] Create `src/entities/actor/HealthManager.mts` or handle in LevelUpManager
- [ ] On level-up: prompt for HP gain: "Roll HD or use average?"
- [ ] Roll mode: roll d{HD} + CON mod (minimum 1 HP per level)
- [ ] Average mode: use `(max die + 1) / 2 + CON mod` (minimum 1)
- [ ] Configurable via system setting: `healthGainMethod` ('roll' | 'average')
- [ ] Add new HP to actor current HP
- [ ] Show in UI: "+8 HP (rolled 6 + 2 CON)"
- [ ] Test: Level up Fighter → roll d10 + CON mod, added to current HP
- [ ] Test: Average mode → 5.5 + 2 = 7 (or 8 after rounding)

**Skill Point Pool Management:**
- [ ] Track `system.skillPoints.remaining` on actor (total available to allocate)
- [ ] On class add at level 1: grant `skillPointsPerLevel + INT mod`
- [ ] On level-up: add `skillPointsPerLevel + INT mod` per new level
- [ ] On multiclass: add new class's starting skill points at level 1
- [ ] Spend points when assigning ranks to skills
- [ ] Warn if trying to spend more points than available
- [ ] Allow respec: GM can reset skill points and let player re-allocate
- [ ] Test: Rogue with 4 skill points/level + INT +2 = 18 points at level 1, can allocate to skills
- [ ] Test: Level to 2 → +6 points available
- [ ] Test: Attempt to spend more than available → warning
- [ ] Test: Multiclass Fighter/Rogue → Fighter points + Rogue points combined

**POC Classes - Fighter:**
- [ ] Create Fighter template with standard D&D 3.5e specs:
  - classType: 'base'
  - level: 1 (will be updated as player levels)
  - hd: 'd10'
  - bab: 'high'
  - saves: {fort: 'high', ref: 'low', will: 'low'}
  - skillPointsPerLevel: 2
  - classSkills: ['Climb', 'Handle Animal', 'Intimidate', 'Jump', 'Ride', 'Swim']
  - grantedFeatures: [Bonus Feats at levels 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
- [ ] Create compendium entry or populate via script
- [ ] Test: Add Fighter to character → level tracking, HP, skill points, BAB work

**POC Classes - Cleric:**
- [ ] Create Cleric template:
  - classType: 'base'
  - hd: 'd8'
  - bab: 'med'
  - saves: {fort: 'high', ref: 'low', will: 'high'}
  - skillPointsPerLevel: 2
  - classSkills: ['Concentration', 'Craft (any)', 'Diplomacy', 'Heal', 'Knowledge (arcana)', 'Knowledge (history)', 'Knowledge (religion)', 'Profession (any)', 'Spellcraft']
  - grantedFeatures: [Channel Energy at 1st, etc. - stubs for Phase 16+]
- [ ] Test: Add Cleric to character

**POC Classes - Rogue:**
- [ ] Create Rogue template:
  - classType: 'base'
  - hd: 'd6'
  - bab: 'low'
  - saves: {fort: 'low', ref: 'high', will: 'low'}
  - skillPointsPerLevel: 8 (highest in game)
  - classSkills: [all skills related to deception/stealth]
  - grantedFeatures: [Sneak Attack (damage scaling by level), Evasion, etc. - stubs for PhaseX]
- [ ] Test: Add Rogue to character → high skill points per level visible

**Prestige Class Support (Stub for Phase X):**
- [ ] Define prestige class structure (classType: 'prestige')
- [ ] Prestige class requires: base class prerequisites, feat prerequisites (store as string)
- [ ] Stub validation: "Cannot add prestige class without meeting prerequisites"
- [ ] Allow adding prestige class if player accepts responsibility (GM override or validation skipping)
- [ ] Test: Try to add prestige class → shows prerequisites required
- [ ] Test: Can add anyway (stub validation)

**Monster/NPC Class Support (Stub for Phase X):**
- [ ] Define NPC class structure (classType: 'npc')
- [ ] NPC classes can have racial HD modifications (e.g. a dragon with 15 racial HD + 3 NPC class levels)
- [ ] Stub: "NPC classes reserved for future implementation"

**Multiclass BAB Stacking:**
- [ ] Implement full multiclass BAB rules:
  - Fighter 5/Rogue 3: Fighter AAB +5 + Rogue BAB +1 = +6 (and iteratives +1, -4, -9)
  - High/High stack normally: +5 + +3 + +1 from second (if lower BAB at same level)
  - High/Med/Low: all contribute independently
- [ ] Verify iterative attack generation works with combined BAB
- [ ] Test: Fighter 5/Wizard 5 (med BAB) → BAB +8 total → iteratives +8, +3, -2
- [ ] Test: Phase 8 action system uses total BAB correctly

**System Registration & Config:**
- [ ] Register class item type in `system.json`
- [ ] Add to CONFIG.Item.documentClasses: class → ItemDnd35eClass
- [ ] Add to CONFIG.DND35E.itemTypes: class with display name, icon
- [ ] Export BAB/save progression tables to CONFIG for lookup
- [ ] Create compendium pack stub: `dnd35e.classes` (populated in Phase 26)
- [ ] Add i18n keys: dnd35e.itemTypes.class, dnd35e.classTypes.*, dnd35e.skills.*
- [ ] Add i18n keys for BAB/save progression descriptions
- [ ] Update en.json

**Localization & i18n:**
- [ ] Add i18n keys: dnd35e.classes.* for standard classes (Fighter, Cleric, Rogue, wizard, etc.)
- [ ] Add i18n keys: dnd35e.skills.* for all skills
- [ ] Add i18n keys: skill abilities and descriptors
- [ ] Add i18n keys: classSheet.* for UI labels
- [ ] Update en.json

**Comprehensive Testing:**
- [ ] Unit test: BAB progression calculation (Fighter high, Cleric med, Rogue low)
- [ ] Unit test: Save bonus calculation for each save type
- [ ] Unit test: Skill total calculation (ranks + ability + class bonus + ACP)
- [ ] Unit test: Multi-class BAB stacking (Fighter 5 + Rogue 3 → +8)
- [ ] Integration test: Create character with Fighter class → level 1, BAB +1, HP 10+CON
- [ ] Integration test: Level Fighter to 5 → BAB +5, HP 40+CON (4×10-level average or rolled)
- [ ] Integration test: Add Rogue level 3 → total level 8, BAB +8, skill points increase dramatically
- [ ] Integration test: Remove Rogue class → BAB back to +5, skill points recalculated
- [ ] Integration test: Fighter gets bonus feat at levels 1, 3, 5 → features granted correctly
- [ ] Integration test: Cleric channel energy stub at level 1 → feature created on actor
- [ ] Integration test: Class skills for Rogue marked correctly, skill total formula includes +3
- [ ] Integration test: Level-up: 1→2 adds HP, skill points, features for level 2
- [ ] Integration test: Full combat: Fighter level 5 vs Goblin, BAB +5 correctly generates iteratives
- [ ] Edge case: Level 20 character → BAB capped correctly (Fighter +20)
- [ ] Edge case: Negative INT modifier → skill points can go as low as 1/level
- [ ] Edge case: Fighter/Fighter MC (add same class twice?) → allow or prevent? Clarify intent
- [ ] Edge case: Prestige class added at level 1 (validation skipped) → works but shows warning
- [ ] Smoke test: Complete character creation: race + Fighter + Cleric levels + feats + skills → no console errors
- [ ] Smoke test: Full party combat with multiple level/class combinations → no conflicts
- [ ] Performance test: 30 skills recalculated on actor update < 100ms
- [ ] Performance test: 4-class multiclass character all class contributions calculated < 200ms

**Documentation & User Guides:**
- [ ] Document three POC classes: Fighter, Cleric, Rogue
- [ ] Document multiclassing mechanics and BAB stacking
- [ ] Document skill system and class skills
- [ ] Document level-up process
- [ ] Create journal entry: "Character Classes & Levels"
- [ ] Create journal entry: "Multiclassing Guide"
