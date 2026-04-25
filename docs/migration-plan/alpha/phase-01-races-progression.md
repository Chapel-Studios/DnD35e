# Phase 8: Races

**Status**: 📋 Outlined (Grant system, ability adjustments, racial traits, progression component)

> **Milestone**: POC  
> **Dependencies**: Phase 4 (Compendium Foundation), Phase 10 (Features & Feats)  
> **Goal**: A `race` item type that owns **innate identity** (creature type, natural armor, senses, immunities) and optionally embeds a **Progression** component for monstrous racial HD. Standard races (Human, Elf) have no progression. Monstrous races (Dragon) embed a progression that appears alongside class progressions in the level-up UI. Shares the Grant System and Progression Component with Phase 12 (Classes).

> **Action System note**: Size from race affects `#self.size.attackMod` and `#self.size.grappleMod` used in action formulas. Speed determines the movement budget for TurnActionBudget (Phase 9). Racial feat grants can include combat feats that add EffectTriggers. Grant UUIDs resolve to compendium items via Phase 4 helpers.

> **Phase 5 defaults overridden here**: Phase 5 provides `size = medium`, `speed = 30`, `ac.naturalArmor = 0`. This phase modifies those via AE (racial ability adjustments generate AE changes following the Material pattern). Languages and senses (darkvision, low-light, etc.) are also introduced in this phase.

> **Key separation**: Race = innate identity. Progression = earned advancement. A Dragon's breath weapon is a racial trait (innate, scales with total HD via value schedule). A Dragon's d12 HD, good BAB, and good saves are progression features embedded in the race's Progression component. A Human has no progression — just innate traits.

---

## 11.1 Race Item Type

Race owns innate identity. Progression (if any) is a separate embedded component.

```
RaceSystemModel extends ItemSystemModelBase
├── creatureType: string              // "humanoid" | "dragon" | "aberration" | etc.
├── creatureSubtype: string[]         // ["human"] | ["fire"] | etc.
├── size: SizeCategory
├── speed: { land, climb, swim, fly, burrow }
├── abilityAdjustments: { str, dex, con, int, wis, cha }
├── senses: { darkvision, lowLight, blindsight, tremorsense }
├── languages: string[]
├── naturalArmor: number              // natural armor bonus (0 for standard, 2+ for monstrous)
├── favoredClass: string | null
├── grantSchedule: GrantScheduleEntry[]   // racial traits, feats — uses shared grant system
├── progression: ProgressionData | null   // null for standard races, embedded for monstrous
└── source: string
```

### Creature Type Lookup Table

Selecting a creature type auto-fills default progression values from a lookup table. No manual entry for standard types. User can override after selection.

| Creature Type | HD | BAB | Fort | Ref | Will | Skill Pts/HD |
|---------------|-----|-----|------|-----|------|-------------|
| Aberration | d8 | Med | Poor | Poor | Good | 2 |
| Animal | d8 | Med | Good | Good | Poor | 2 |
| Construct | d10 | Med | Poor | Poor | Poor | 2 |
| Dragon | d12 | High | Good | Good | Good | 6 |
| Elemental | d8 | Med | varies | varies | Poor | 2 |
| Fey | d6 | Low | Poor | Good | Good | 6 |
| Giant | d8 | Med | Good | Poor | Poor | 2 |
| Humanoid | d8 | Med | varies | varies | varies | 2 |
| Magical Beast | d10 | High | Good | Good | Poor | 2 |
| Monstrous Humanoid | d8 | High | Poor | Good | Good | 2 |
| Ooze | d10 | Med | Poor | Poor | Poor | 2 |
| Outsider | d8 | High | Good | Good | Good | 8 |
| Plant | d8 | Med | Good | Poor | Poor | 2 |
| Undead | d12 | Low | Poor | Poor | Good | 4 |
| Vermin | d8 | Med | Good | Poor | Poor | 2 |

> **Note**: "varies" entries depend on specific subtypes. The lookup fills the most common default; user adjusts as needed. Elementals use size-based HD in the SRD, but the progression component handles that through its own level count.

## 11.2 Progression Component (Shared with Phase 12)

The Progression is a shared data structure embedded in both Race and Class items. When a race has a progression, it appears alongside class progressions in the level-up UI. The level-up system aggregates ALL progressions from all owned items — no special-casing for race vs class.

```typescript
interface ProgressionData {
  hdSize: number;                     // d4=4, d6=6, d8=8, d10=10, d12=12
  babRate: "high" | "med" | "low";    // Dropdown — auto-generates BAB schedule
  saves: {
    fort: "good" | "poor";            // Dropdown — auto-generates save schedule
    ref: "good" | "poor";
    will: "good" | "poor";
  };
  skillPointsPerLevel: number;        // Base skill points per HD (before INT mod)
  grantSchedule: GrantScheduleEntry[];  // Progression-specific grants (class features, bonus feats)
  classSkills: string[];              // Skills treated as class skills for this progression
  hdOverride: Record<number, 0>;      // Class levels that override the default 1 HD to 0
                                      // (default: {} — every level grants 1 HD).
                                      // Used by monster class progressions where some levels
                                      // grant abilities without a HD. Keys are class levels.
  locked: boolean;                    // If true, actor must complete this progression before
                                      // taking levels in other classes (default: false).
                                      // Monster class racial progressions are typically locked.
}
```

Each progression generates a **stacking class AE** on the actor for BAB and save contributions. BAB and saves are standardized schedules:
- **High BAB**: +1 per level (e.g., Fighter, Dragon)
- **Med BAB**: +0.75 per level rounded down (e.g., Cleric, Aberration)
- **Low BAB**: +0.5 per level rounded down (e.g., Wizard, Fey)
- **Good Save**: +2 at level 1, +1 per 2 levels after
- **Poor Save**: +0 at level 1, +1 per 3 levels after

The AE regenerates when progression level changes. The stacking engine sums all class AEs. Standard vs Fractional BAB is a system setting (see Phase 12 for details).

## 11.3 Grant System (First Implementation)

Needed here and reused by classes in Phase 12.

The grant schedule is a flat array of entries on the item, each specifying a level threshold and a grant action. The `at` field can be a single number or an array for repeated grants:

```typescript
interface GrantScheduleEntry {
  at: number | number[];              // Level(s) at which grant triggers
  type: "grant" | "choice";          // Auto-grant or player choice
  uuid?: string;                     // Compendium UUID (for auto-grant)
  from?: string[];                   // Array of UUIDs (for choice-from-list)
  filter?: Record<string, any>;      // Compendium query (for choice-from-filter)
  name?: string;                     // Display name
}
```

**Grant types:**
- **Auto-grant**: `{ at: 1, type: "grant", uuid: "compendium.dnd35e.racial-traits.darkvision" }` — instantiates compendium item.
- **Choice from list**: `{ at: 1, type: "choice", from: [uuid1, uuid2, uuid3] }` — player picks from specific options.
- **Choice from filter**: `{ at: 1, type: "choice", filter: { type: "feat" } }` — filtered compendium browser (e.g., Human bonus feat).

**Provenance tracking:**
Granted items receive a `grantedBy: { sourceId, level }` field on the owned item. This tracks which race/class granted the item and at what level. Used for removal on race change or level-down. NOT the bond AE pattern — bonds are for frequently changing relationships; `grantedBy` is for stable, infrequent changes.

**On race add to actor:**
- Execute all grant schedule entries with `at: 1` (or no level requirement) for the race's own grants
- If race has a progression, its progression grants are handled during level-up (not on race add)
- Store `grantedBy` on each created item pointing back to the race
- On race removal: find all owned items with `grantedBy.sourceId` matching the race and remove them. If the race had a progression, its level history entries become invalid.

**Limitation: Only one race per actor.** Enforce in actor's item management.

**Racial ability adjustments + size + speed:** Generated as AE changes (Material pattern), applied during actor data prep.

**Racial traits that scale with total HD:** Some racial abilities (size growth, breath weapon damage) scale with `@attributes.hd.total` — these use the value scheduling system (see README cross-cutting concerns). The race grants the trait item at level 1; the trait's own schedule handles scaling. The race doesn't know how the trait scales.

**Natural armor:** The `naturalArmor` field on RaceSystemModel generates an AE change targeting `system.attributes.ac.naturalArmor` with `bonusType: 'natural'`. Stacking follows Phase 2 rules (highest natural armor bonus wins).

## 11.4 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/race/` — Race class, data model, sheet |
| Create | `src/helpers/grants.mts` — Grant system utility (shared with Phase 12) |
| Create | `src/helpers/progression.mts` — Progression component & AE generation (shared with Phase 12) |
| Create | `src/data/creature-types.mts` — Creature type lookup table |
| Modify | Actor — enforce single race, apply racial data |
| Modify | `system.json` — register race type |
| Expand | `CreatureSystemModel` — add `naturalArmor` to AC sub-model, add `languages` ArrayField, add `senses` SchemaField |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 11 has not started)

### ❌ Not Started (All Tasks for Phase 11)

**Race Data Model & Schema:**
- [ ] Create `src/entities/items/race/RaceSystemModel.mts` extending ItemSystemModelBase
- [ ] Define schema: creatureType (StringField with choices from creature type lookup table)
- [ ] Define schema: creatureSubtype (ArrayField of StringField)
- [ ] Define schema: size (StringField with SizeCategory choices: Fine, Diminutive, Tiny, Small, Medium, Large, Huge, Gargantuan)
- [ ] Define schema: speed (SchemaField with land, climb, swim, fly, burrow — all numbers representing feet/round)
- [ ] Define schema: abilityAdjustments (SchemaField with str, dex, con, int, wis, cha — all numbers, signed)
- [ ] Define schema: senses (SchemaField with darkvision, lowLight, blindsight, tremorsense — all numbers or booleans for distance/presence)
- [ ] Define schema: languages (ArrayField of StringField for language names like "Common", "Orc", "Draconic")
- [ ] Define schema: naturalArmor (NumberField, natural armor bonus, 0 for most standard races, 2+ for monstrous races)
- [ ] Define schema: favoredClass (StringField referencing standard class name or null)
- [ ] Define schema: grantSchedule (ArrayField of GrantScheduleEntry — racial traits, feats)
- [ ] Define schema: progression (EmbeddedDataField of ProgressionData or null — null for standard races)
- [ ] Define schema: source (StringField for book reference)
- [ ] Add secret-aware display naming fields/patterns as needed (no wrapper fields)
- [ ] Test: RaceSystemModel instantiation with valid data
- [ ] Test: Schema validation (size must be in enum, speed numbers must be ≥ 0, etc.)
- [ ] Test: Race with no progression (Human) validates correctly
- [ ] Test: Race with progression (Dragon) populates progression from creature type lookup

**Creature Type Lookup Table:**
- [ ] Create `src/data/creature-types.mts` with default progression values per creature type
- [ ] Implement lookup function: given creature type string, return default ProgressionData
- [ ] Handle "varies" entries (elementals, humanoids) with reasonable defaults
- [ ] Test: All 15 creature types return valid defaults

**Progression Component (Shared with Phase 12):**
- [ ] Create `src/helpers/progression.mts` with ProgressionData interface
- [ ] Implement BAB schedule generation from rate dropdown (high/med/low)
- [ ] Implement save schedule generation from rate dropdown (good/poor)
- [ ] Implement class AE generation: given a progression + level, produce a stacking AE with BAB and save changes
- [ ] Implement AE regeneration on level change
- [ ] Test: High BAB at level 5 produces +5
- [ ] Test: Med BAB at level 5 produces +3
- [ ] Test: Good save at level 5 produces +4
- [ ] Test: Multiple progression AEs stack correctly

**Grant System Utility:**
- [ ] Create `src/helpers/grants.mts` file
- [ ] Implement GrantScheduleEntry interface: `{ at, type, uuid?, from?, filter?, name? }`
- [ ] Implement `executeGrant(actor, entry, level)`: Promise<Item> — resolve UUID, create owned item with `grantedBy: { sourceId, level }`
- [ ] Implement `executeChoice(actor, entry, level)`: Promise<Item> — open choice dialog (from-list or from-filter), create chosen item with provenance
- [ ] Implement `executeScheduleForLevel(actor, schedule, level, sourceId)`: Promise<Item[]> — find all entries where `at` matches level, execute each
- [ ] Implement `revokeGrantsForLevel(actor, sourceId, level)`: Promise<void> — find owned items with matching `grantedBy`, remove them
- [ ] Implement `revokeAllGrants(actor, sourceId)`: Promise<void> — remove all items granted by the source
- [ ] Handle `at` as array: when `at` is an array, grant triggers at each specified level
- [ ] Handle errors: if UUID invalid, log warning but continue (defensive coding)
- [ ] Test: executeGrant with valid UUID creates item with provenance
- [ ] Test: revokeGrantsForLevel removes correct items
- [ ] Test: executeScheduleForLevel with `at: [1, 2, 4]` triggers at levels 1, 2, and 4

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
- [ ] Implement `buildChanges()` for natural armor: `{ key: 'system.attributes.ac.naturalArmor', mode: ADD, value: naturalArmor, bonusType: 'natural' }`
- [ ] If race has a progression, delegate progression AE generation to `src/helpers/progression.mts`
- [ ] Test: Race generates expected AE changes
- [ ] Test: Ability adjustments correct
- [ ] Test: Size and speed match race definition
- [ ] Test: Natural armor generates AE change with bonusType 'natural'
- [ ] Test: Monstrous race with progression generates class AE for BAB/saves

**Monstrous Race Progression:**
- [ ] When race with `progression` is added to actor, register it as an available progression in level-up UI
- [ ] Progression appears alongside class progressions — player chooses "Dragon +1 HD" or "Fighter +1 level" at each level-up
- [ ] Progression generates class AE for BAB/saves via shared `src/helpers/progression.mts`
- [ ] On race removal, progression becomes unavailable; existing level history entries referencing it are flagged as warnings
- [ ] Test: Add Dragon race with progression — level-up UI shows "Dragon" as an option
- [ ] Test: Take 3 Dragon HD + 2 Fighter levels — both progressions contribute BAB/saves
- [ ] Test: Remove Dragon race — Dragon level history entries flagged invalid

**Actor Model Expansion (CreatureSystemModel):**
- [ ] Add `naturalArmor` field (NumberField, default 0) to AC sub-model in CreatureSystemModel
- [ ] Add `languages` ArrayField of StringField to CreatureSystemModel
- [ ] Add `senses` SchemaField to CreatureSystemModel: darkvision (NumberField, 0 for none), lowLight (BooleanField), blindsight (NumberField), tremorsense (NumberField)
- [ ] Wire natural armor into AC derivation: `ac.normal += naturalArmor` (doesn't apply to touch AC)
- [ ] Test: Actor with natural armor 2 → AC increases by 2 (normal and flat-footed, not touch)

**Race Sheet (Vue Component):**
- [ ] Create `src/vue/components/sheets/RaceSheetDnd35e.vue` extending base item sheet
- [ ] Implement tabs: Details, Abilities & Speed, Senses, Languages, Traits, Description
- [ ] **Details tab**: Show creature type dropdown (auto-fills progression defaults), creature subtypes, size dropdown, favoredClass, source
- [ ] **Progression tab** (only shown if progression is not null): HD size, BAB rate dropdown, save rate dropdowns, skill points per level, class skills, progression grant schedule
- [ ] **Abilities & Speed tab**: Display ability adjustments (±columns), speed fields for land/climb/swim/fly/burrow
- [ ] **Senses tab**: Darkvision range (number), lowLight/blindsight/tremorsense toggles + ranges (stub for Phase 20)
- [ ] **Languages tab**: List of granted languages, add/remove buttons
- [ ] **Traits tab**: Grant schedule editor — list of GrantScheduleEntry items with add/remove, UUID drag-drop from compendium
- [ ] **Description tab**: Rich text editor for race description/lore
- [ ] Implement i18n for all labels
- [ ] Add form groups for numeric inputs (speed, darkvision range, ability mods)
- [ ] Add dropdown for size selector
- [ ] Add drag-drop support for feat UUIDs: drag feat from compendium into Traits section to auto-add as grant schedule entry
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
- [ ] When race item added: execute all grant schedule entries with `at: 1` (or no level requirement) via `executeScheduleForLevel()`
- [ ] If race has progression, register it as available in level-up system (no auto-leveling)
- [ ] Apply race AE changes: size, speed, ability adjustments (already generated via buildChanges)
- [ ] Update actor.system.details.race with race name
- [ ] Recalculate owner actor's derived data (ability mods, AC, speed, etc.)
- [ ] Test: Add race to actor — abilities update, speed updates, size updates, granted features appear on actor
- [ ] Test: Add monstrous race — progression becomes available for level-up

**Race Remove from Actor Pipeline:**
- [ ] When race item removed: call revokeAllGrants(actor, raceId) to remove all granted items
- [ ] If race had progression, flag any level history entries referencing it as invalid warnings
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

---

## 11.5 GM Use Case: Death Throes (Document Events + Racial Ability)

This example demonstrates how the **Document Event System** (Phase 6, §5.9) enables reactive racial abilities. A Balor's death explosion is a racial trait that subscribes to the `death` event on its owning actor.

### The Scenario

A GM creates a Balor NPC. The Balor has a racial trait "Death Throes" — when it dies, it explodes for 100 points of damage in a 100-foot radius. The GM wants this to happen automatically when the Balor's HP drops to 0, with a chat card announcing the explosion and prompting saves.

### How It Works

1. **Racial trait item**: "Death Throes" is a feat/trait item granted to the Balor by its race's `grantSchedule` at level 1:
   ```json
   { "at": 1, "type": "grant", "uuid": "compendium.dnd35e.racial-traits.balor-death-throes" }
   ```

2. **Event subscription**: In its `_onCreate()` (via the `instantiate` document event), the Death Throes item subscribes to its owning actor's `death` event:
   ```typescript
   // In DeathThroesFeature or a generic trait handler:
   this.parent.events.on('death', async (event) => {
     // event.data: { cause?, attackerId?, damage? }
     const template = await createAreaTemplate({
       type: 'circle', distance: 100, origin: this.parent.token
     });
     await ChatMessage.create({
       content: `${this.parent.name} explodes! All creatures in 100 ft must make a DC 35 Reflex save or take 100 damage.`,
       speaker: ChatMessage.getSpeaker({ actor: this.parent })
     });
   });
   ```

3. **Death trigger**: When the Balor's HP drops to 0, `ActorDnd35e` emits the `death` event (see Phase 6, §5.9). All subscribers fire — the Death Throes handler creates the template and chat card.

4. **No special-casing**: The actor knows nothing about death throes. It just emits `death`. The trait knows nothing about how death is detected. It just listens for the event.

### How Events Are Extended

**System-defined events** (`death`, `instantiate`, `revealSecret`) are emitted by core system code. New events are added when a phase introduces a consumer:

| Phase | New event | Emitter | Example consumer |
|-------|-----------|---------|-----------------|
| Phase 6 | `death`, `instantiate`, `revealSecret` | Actor HP logic, Item._onCreate, Identifiable system | Death throes, item setup, chat notifications |
| Phase 14 | `conditionApplied`, `conditionRemoved` | Condition toggle system | Barbarian Rage auto-ends when unconscious |
| Phase 17 | `spellCast` | Spell action resolution | Counterspell reaction, arcane spell failure |
| Phase 10 | `actionUsed` | Action system | Attacks of opportunity tracking |

**Module/macro-defined events** use namespaced strings — no registration needed:

```javascript
// A macro the GM writes to trigger a cutscene on boss death
const boss = canvas.tokens.get("bossTokenId").actor;
boss.events.once('death', async (event) => {
  // Play dramatic music, show journal entry, advance quest
  await Macro.execute("cutscene-boss-defeat");
});
```

**A racial ability subscribes from the trait's grant**. The grant system (§11.3) creates the trait item on the actor. The trait's `_onCreate()` sets up event listeners. The trait's `_onDelete()` (or `events.clear()` on actor deletion) cleans up.

### Event Subscription UI (Future)

For authored content (compendium traits), the event subscription is code in the trait's class. For GM-created custom traits, a future UI could offer a dropdown of registered events:

- The dropdown is populated from `DocumentEventEmitter.registeredEvents` on the owning actor — showing all event types that currently have at least one subscriber or that the system has emitted before
- The system also maintains a static registry of **well-known event types** with descriptions (e.g., `death: "Fires when the creature's HP drops to the death threshold"`)
- Custom modules extend this registry: `DocumentEventEmitter.registerEventType('myModule.stunned', { label: 'Stunned', description: '...' })`
- This UI is **post-Alpha** — not needed for the code-driven traits in Phases 8–13

### What This Proves (Alpha Value)

- The event system enables decoupled reactive abilities with no special-casing in actor code
- Racial traits can have complex triggered effects that fire at the right moment
- The pattern extends to class features (Paladin's Aura of Courage drops on death), spells (Contingency), items (Cursed items that react to events)
- GMs can write simple macros that hook into the event system without system code changes
- Modules can register their own events and participate in the same infrastructure

### Checklist

- [ ] Verify `death` event emission is wired in `ActorDnd35e` (Phase 6 prerequisite)
- [ ] Create a `TraitEventSubscription` pattern or mixin for trait items that need event listeners:
  - Subscribe in `_onCreate()` (if parent actor exists) or `prepareDerivedData()` (for session-start re-subscription)
  - Unsubscribe in `_onDelete()`
  - Accept event type + handler as configuration
- [ ] Author "Death Throes (Balor)" trait in `packs/_source/racial-traits/` with death event subscription
- [ ] The trait's handler creates an area template + chat card (area template depends on Phase 16; stub with chat-only for Alpha)
- [ ] Test: Add Balor race to actor → Death Throes trait granted → subscribes to death event
- [ ] Test: Reduce Balor HP to 0 → death event fires → Death Throes handler executes → chat card appears
- [ ] Test: Remove Balor race → Death Throes trait removed → death event no longer fires trait handler
- [ ] Test: GM macro subscribes to death with `once()` → fires once, then auto-unsubscribes

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
