# Phase 11: Races

**Status**: 📋 Outlined (Grant system, ability adjustments, racial traits)

> **Milestone**: POC  
> **Dependencies**: Phase 4 (Compendium Foundation), Phase 10 (Features & Feats)  
> **Goal**: A `race` item type (separate from class, but sharing the Grant System). Grants ability adjustments, size, speed, and racial traits/feats. Race is a simpler version of class — it uses the same grant infrastructure but without level-based progression.

> **Action System note**: Size from race affects `#self.size.attackMod` and `#self.size.grappleMod` used in action formulas. Speed determines the movement budget for TurnActionBudget (Phase 9). Racial feat grants can include combat feats that add EffectTriggers. Grant UUIDs resolve to compendium items via Phase 4 helpers.

---

## 11.1 Race Item Type

```
RaceSystemModel extends ItemSystemModelBase
├── size: SizeCategory
├── speed: { land, climb, swim, fly, burrow }
├── abilityAdjustments: { str, dex, con, int, wis, cha }
├── senses: { darkvision, lowLight, blindsight, tremorsense }
├── languages: string[]
├── racialHD: { hitDie, count } | null (for monstrous races)
├── favoredClass: string | null
├── grantedFeatures: GrantedFeature[]
└── source: string
```

## 11.2 Grant System (First Implementation)

Needed here and reused by classes in Phase 14.

```typescript
interface GrantedFeature {
  uuid: string;           // Compendium UUID of the feat to grant
  level?: number;         // Level at which it's granted (for racial HD / class levels)
  name: string;           // Display name
  granted: boolean;       // Whether it's been created on the actor
  grantedItemId?: string; // ID of the created item (for removal tracking)
}
```

**On race add to actor:**
- For each `grantedFeature` with no level requirement: create the feat on the actor
- Mark as `granted: true`, store `grantedItemId`
- On race removal: remove all granted items

**Limitation: Only one race per actor.** Enforce in actor's item management.

**Racial ability adjustments + size + speed:** Generated as AE changes (Material pattern), applied during actor data prep.

## 11.3 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/race/` — Race class, data model, sheet |
| Create | `src/helpers/grants.mts` — Grant system utility |
| Modify | Actor — enforce single race, apply racial data |
| Modify | `system.json` — register race type |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 11 has not started)

### ❌ Not Started (All Tasks for Phase 11)

**Race Data Model & Schema:**
- [ ] Create `src/entities/items/race/RaceSystemModel.mts` extending ItemSystemModelBase
- [ ] Define schema: size (StringField with SizeCategory choices: Fine, Diminutive, Tiny, Small, Medium, Large, Huge, Gargantuan)
- [ ] Define schema: speed (SchemaField with land, climb, swim, fly, burrow — all numbers representing feet/round)
- [ ] Define schema: abilityAdjustments (SchemaField with str, dex, con, int, wis, cha — all numbers, signed)
- [ ] Define schema: senses (SchemaField with darkvision, lowLight, blindsight, tremorsense — all numbers or booleans for distance/presence)
- [ ] Define schema: languages (ArrayField of StringField for language names like "Common", "Orc", "Draconic")
- [ ] Define schema: racialHD (SchemaField or null, with hitDie type and count — e.g. d8, 3 hit dice)
- [ ] Define schema: favoredClass (StringField referencing standard class name or null)
- [ ] Define schema: grantedFeatures (ArrayField of SchemaField with: uuid, level?, name, granted: boolean, grantedItemId?)
- [ ] Define schema: source (StringField for book reference)
- [ ] Add `identifiedName` and `unidentifiedName` fields (Dnd35eField pattern)
- [ ] Test: RaceSystemModel instantiation with valid data
- [ ] Test: Schema validation (size must be in enum, speed numbers must be ≥ 0, etc.)

**Grant System Utility:**
- [ ] Create `src/helpers/grants.mts` file
- [ ] Implement interface GrantedFeature: {uuid, level?, name, granted, grantedItemId?}
- [ ] Implement `grantFeature(actor, grantedFeature)`: Promise<Item>
  - Fetch item from UUID via compendium helpers (Phase 4)
  - Clone item for actor
  - Store grantedItemId and set granted: true
  - Return created item
- [ ] Implement `revokeFeature(actor, grantedFeature)`: Promise<void>
  - Delete grantedItemId from actor
  - Set granted: false
- [ ] Implement `grantAllFeatures(actor, grantedFeatures, filterByLevel?)`: Promise<Item[]>
  - Iterate grantedFeatures, grant each one matching level filter
  - Return array of created items
- [ ] Implement `revokeAllFeatures(actor, grantedFeatures)`: Promise<void>
  - Iterate grantedFeatures, revoke each one
- [ ] Handle errors: if UUID invalid, log warning but continue (defensive coding)
- [ ] Test: grantFeature with valid UUID → item created on actor
- [ ] Test: revokeFeature → item deleted
- [ ] Test: grantAllFeatures → all items created

**Race Item Class:**
- [ ] Create `src/entities/items/race/ItemDnd35eRace.mts` extending ItemDnd35e
- [ ] Override `prepareDerivedData()` to generate racial bonuses (size, speed, ability adjustments)
- [ ] Implement `buildChanges()` method (Material pattern):
  - Generate AE change for each ability adjustment: `{ key: 'system.abilities.[ability].base', mode: ADD, value: adjustment, bonusType: 'racial'  }`
  - Generate AE change for size: `{ key: 'system.details.size', mode: OVERRIDE, value: 'medium', bonusType: 'untyped' }` (OVERRIDE since size doesn't stack)
  - Generate AE change for speed: `{ key: 'system.attributes.speed.land', mode: OVERRIDE, value: 30 }` (OVERRIDE for movement)
  - Generate AE changes for senses (darkvision distance, etc.) — stub for Phase 20
- [ ] Support racial ability adjustments: STR +2, DEX -2, CON +2, etc.
- [ ] Support size derivation: pass size to token dimension lookup (Phase 6)
- [ ] Support speed variants: land (default), climb, swim, fly (all stored, used when applicable)
- [ ] `getGrantedFeatures()`: return all features in `system.grantedFeatures` array
- [ ] Test: Race generates expected AE changes
- [ ] Test: Ability adjustments correct
- [ ] Test: Size and speed match race definition

**Race Sheet (Vue Component):**
- [ ] Create `src/vue/components/sheets/RaceSheetDnd35e.vue` extending base item sheet
- [ ] Implement tabs: Details, Abilities & Speed, Senses, Languages, Traits, Description
- [ ] **Details tab**: Show size dropdown, favoredClass, racial HD widget (if monstrous race), source
- [ ] **Abilities & Speed tab**: Display ability adjustments (±columns), speed fields for land/climb/swim/fly/burrow
- [ ] **Senses tab**: Darkvision range (number), lowLight/blindsight/tremorsense toggles + ranges (stub for Phase 20)
- [ ] **Languages tab**: List of granted languages, add/remove buttons
- [ ] **Traits tab**: List of grantedFeatures with UUID, level, name, granted status checkbox
- [ ] **Description tab**: Rich text editor for race description/lore
- [ ] Implement i18n for all labels
- [ ] Add form groups for numeric inputs (speed, darkvision range, ability mods)
- [ ] Add dropdown for size selector
- [ ] Add drag-drop support for feat UUIDs: drag feat from compendium into Traits section to auto-add as grantedFeature
- [ ] Test: Race sheet renders all tabs
- [ ] Test: Can edit race properties
- [ ] Test: Changes persist when saved
- [ ] Test: Can add/remove granted features

**Actor Integration - Single Race Enforcement:**
- [ ] Modify ActorDnd35e item management to enforce: max 1 race item per actor
- [ ] On item add: check if item type === 'race' and actor already has a race → show warning dialog: "Actor already has a race. Replace [old race] with [new race]?"
- [ ] If yes: delete old race, add new race
- [ ] If no: cancel addition
- [ ] On actor creation (wizard), only allow 1 race selection
- [ ] Test: Add race to actor → works if no race present
- [ ] Test: Add 2nd race → warning dialog appears, replacement option works
- [ ] Test: Cannot have 2 races

**Race Add to Actor Pipeline:**
- [ ] Modify ActorDnd35e to react to race item addition
- [ ] When race item added: call grantAllFeatures(actor, race.grantedFeatures)
- [ ] Mark race as "granted" (track in race item: granted: true, date)
- [ ] Apply race AE changes: size, speed, ability adjustments (already generated via buildChanges)
- [ ] Update actor.system.details.race with race name
- [ ] Recalculate owner actor's derived data (ability mods, AC, speed, etc.)
- [ ] Test: Add race to actor → abilities update, speed updates, size updates, granted features appear in actor

**Race Remove from Actor Pipeline:**
- [ ] When race item removed: call revokeAllFeatures(actor, race.grantedFeatures)
- [ ] Delete all created feat items
- [ ] Clear race AE changes (automatic via AE system on item delete)
- [ ] Clear actor.system.details.race
- [ ] Recalculate derived data
- [ ] Test: Remove race → granted features deleted, derived stats recalculated

**Race Item Sheet Component Integration:**
- [ ] Embed RaceSheetDnd35e in item sheet registration
- [ ] Register with CONFIG.Item.documentClasses
- [ ] Import race sheet into registry
- [ ] Add race icon (placeholder image)
- [ ] Test: Open race item → shows custom sheet, not generic item sheet
- [ ] Test: Edit race properties → persists

**POC Race Content - Human:**
- [ ] Create template: Human race with standard D&D 3.5e attributes
  - Size: Medium
  - Speed: 30 ft land
  - Ability adjustments: none
  - Bonus feat at 1st level (Phase 14 will implement level-based grants, for now just note the mechanic)
  - Languages: Common
  - Senses: none
  - Racial HD: none
- [ ] Create compendium entry OR populate via script
- [ ] Test: Add Human to fighter → no ability adjustments, 30 ft speed, bonus feat granted (via Phase 10 Feat)

**POC Race Content - Half-Orc:**
- [ ] Create template: Half-Orc
  - Size: Medium
  - Speed: 30 ft
  - Ability adjustments: STR +2, INT -2, CHA -2
  - Languages: Common, Orc
  - Senses: darkvision 60 ft
  - Racial features: Intimidating (racial bonus on Intimidate checks)
- [ ] Test: Add Half-Orc → abilities adjusted, darkvision granted, intimidate bonus visible

**POC Race Content - Halfling:**
- [ ] Create template: Halfling
  - Size: Small
  - Speed: 20 ft
  - Ability adjustments: DEX +2, STR -2
  - Languages: Common, Halfling
  - Senses: none
  - Racial features: +2 racial bonus on some skills
- [ ] Test: Add Halfling → small size (affects AC, combat rolls), DEX +2 STR -2, speed 20 ft

**System Registration & Config:**
- [ ] Register race item type in `system.json`
- [ ] Add to CONFIG.Item.documentClasses: race → ItemDnd35eRace
- [ ] Add to CONFIG.DND35E.itemTypes: race with display name, icon
- [ ] Create compendium pack stub: `dnd35e.races` (populated in Phase 26)
- [ ] Add i18n keys: dnd35e.itemTypes.race, dnd35e.sizes.*
- [ ] Update en.json
- [ ] Test: system.json loads without error
- [ ] Test: race type available in item creation

**Localization & i18n:**
- [ ] Add i18n keys: dnd35e.races.* for standard races (Human, Halfling, Dwarf, Elf, Half-Elf, Half-Orc, Gnome)
- [ ] Add i18n keys: dnd35e.senses.* (darkvision, lowLight, blindsight, tremorsense)
- [ ] Add i18n keys: dnd35e.languages.* (Common, Orc, Elvish, etc.)
- [ ] Add i18n keys: raceSheet.* for sheet labels
- [ ] Update en.json with all keys

**Comprehensive Testing:**
- [ ] Unit test: RaceSystemModel instantiation with standard races
- [ ] Unit test: buildChanges() generates correct AE changes for Half-Orc abilities
- [ ] Unit test: Size derivation from race → token dimension lookup
- [ ] Unit test: Speed variants (land, climb, swim)
- [ ] Integration test: Create actor, add Human race → no stat changes, bonus feat concept explained
- [ ] Integration test: Add Half-Orc race → STR +2, INT -2, CHA -2 visible in actor stats
- [ ] Integration test: Half-Orc darkvision granted and visible
- [ ] Integration test: Add Halfling race → small size, speed 20 ft, DEX +2
- [ ] Integration test: Remove race → all bonuses and features removed, recalculation correct
- [ ] Integration test: Try to add 2nd race → warning dialog, replacement works
- [ ] Integration test: Race sheet opens, can edit properties, can add/remove grantedFeatures
- [ ] Integration test: Actor sheet Details shows race name after adding race
- [ ] Edge case: Race with no ability adjustments (Human) → no ability changes
- [ ] Edge case: Race with multiple language grants (Half-Elf) → all languages added
- [ ] Edge case: Monstrous race with racial HD (if applicable) → racial HD tracked (not fully implemented POC)
- [ ] Edge case: Race with conditional speed (climb but no swim) → correct fields filled
- [ ] Smoke test: Create character with race, add feats, remove race, re-add different race → no console errors
- [ ] Smoke test: Full character setup: race + class (Phase 12) + feats + equipment → no conflicts
- [ ] Performance test: 5 races with 3+ granted features each, all grants process < 500ms

**Documentation & User Guides:**
- [ ] Document three POC races: Human, Half-Orc, Halfling
- [ ] Document how to create custom races
- [ ] Document grant system mechanics
- [ ] Create journal entry: "Character Races & Abilities"
