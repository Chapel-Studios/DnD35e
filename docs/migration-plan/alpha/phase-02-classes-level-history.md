# Alpha Phase 2: Classes & Level History

**Status**: 📋 Outlined (Class progression, multiclass stacking, level history, edit rules)

> **Milestone**: Alpha
> **Dependencies**: Phase 7 (Races & Progression)
> **Goal**: A `class` item type that embeds a **Progression** component (shared with Race, defined in Phase 7). Classes are pure grant scheduling + progression. Level history lives on the actor as an immutable ledger. Soft validation with cascading edits. Alpha test class: **Paladin** (Med BAB, Good Fort, Poor Ref/Will, class features via grant schedule — features implemented in Phase 12).

> **Action System note**: BAB progression from class levels drives the IterativeAttackGenerator (Phase 9) — the number of iterative attacks in a full attack is computed from total BAB. Save progression determines `#self.saves.*` values used in maneuver defense and save-based action checks.

> **Paladin over Fighter**: The Paladin proves more architecture than Fighter. Med BAB (+3 at level 5 vs High +5) tests that the system handles non-High BAB correctly. Good Fort + Poor Ref/Will tests mixed save progression. The grant schedule includes class features (Divine Grace, Smite Evil, Lay on Hands, Aura of Courage — implemented in Phase 12) and a spellcasting stub (implemented in Phase 16). Fighter's only interesting feature is bonus combat feats, which the grant schedule already handles.

---

## 8.1 Class Item Type

A class is just a Progression component with metadata. No `level` field on the class item — levels come from counting `levelHistory` entries that reference this class.

```
ClassSystemModel extends ItemSystemModelBase
├── classType: 'base' | 'prestige' | 'npc' | 'minion' | 'monster' | 'template'
├── progression: ProgressionData         // Shared with Race (Phase 11)
│   ├── hdSize: number                   // d4=4, d6=6, d8=8, d10=10, d12=12
│   ├── babRate: 'high' | 'med' | 'low'  // Dropdown
│   ├── saves: { fort, ref, will }        // Each: 'good' | 'poor'
│   ├── skillPointsPerLevel: number
│   ├── grantSchedule: GrantScheduleEntry[]  // Class features, bonus feats
│   ├── classSkills: string[]
│   ├── hdOverride: Record<number, 0>        // Levels that don't grant HD (monster classes)
│   └── locked: boolean                  // Must complete before other classes (monster classes)
├── spellcasting: SpellcastingProgression | null  // Stub for Phase 16
├── prerequisites: PrerequisiteData[]     // Prestige classes — reuses feat prereq system
└── source: string
```

The class's job is **pure grant scheduling** — "what do you get, and when." Class features are self-scaling items: the class grants a Sneak Attack item at level 1 via the grant schedule, and the Sneak Attack item's own `system.schedules` (value scheduling) handles scaling from 1d6 to 2d6 to 3d6, etc. The class doesn't know *how* features scale.

### Classes as AE Generators

Each class generates a **stacking class AE** on the actor for its BAB and save contributions. BAB and saves are standardized schedules selected via dropdown (same as Phase 11's Progression Component):
- **High BAB**: +1 per level
- **Med BAB**: +0.75 per level rounded down
- **Low BAB**: +0.5 per level rounded down
- **Good Save**: +2 at level 1, +1 per 2 levels after
- **Poor Save**: +0 at level 1, +1 per 3 levels after

The AE regenerates when the class's effective level changes (count of `levelHistory` entries). The stacking engine sums all class AEs. Standard BAB = sum of rounded per-class BABs. Fractional BAB (system setting) = sum raw fractional values, round once at the end.

### Grant Schedule Examples

```typescript
grantSchedule: [
  // Auto-grants (Rogue)
  { at: 1, type: "grant", uuid: "compendium.dnd35e.class-features.sneak-attack" },
  { at: 1, type: "grant", uuid: "compendium.dnd35e.class-features.trapfinding" },
  { at: 2, type: "grant", uuid: "compendium.dnd35e.class-features.evasion" },
  // Paladin: class features at specific levels (Alpha test class)
  { at: 1, type: "grant", uuid: "compendium.dnd35e.class-features.smite-evil" },
  { at: 1, type: "grant", uuid: "compendium.dnd35e.class-features.aura-of-good" },
  { at: 2, type: "grant", uuid: "compendium.dnd35e.class-features.divine-grace" },
  { at: 2, type: "grant", uuid: "compendium.dnd35e.class-features.lay-on-hands" },
  { at: 3, type: "grant", uuid: "compendium.dnd35e.class-features.aura-of-courage" },
  { at: 4, type: "grant", uuid: "compendium.dnd35e.class-features.turn-undead" },
  // Fighter: choice of any combat feat at many levels (at is an array)
  { at: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20], type: "choice", filter: { type: "feat", featType: "combat" } },
  // Monk: choice from specific list at level 1
  { at: 1, type: "choice", from: ["uuid-improved-trip", "uuid-stunning-fist", "uuid-improved-grapple"] },
]
```

## 8.2 Multi-Classing

- Actor can have multiple class items
- Total character level = `actor.system.levelHistory.length`
- **Total HD** = count of `levelHistory` entries where `hp.dieSize !== null` (excludes levels where the progression's `hdOverride` set HD to 0). For standard PCs, total HD = total level.
- Each class's effective level = count of `levelHistory` entries referencing that class
- BAB = sum of per-class AE contributions (stacking engine). BAB advances with class level, not HD — a level with `hdOverride: 0` still advances BAB/saves.
- Saves = sum of per-class AE contributions (stacking engine)
- HP = sum of `levelHistory[].hp.rollResult + levelHistory[].hp.conMod` for entries where `dieSize !== null` (levels with HD overridden to 0 contribute 0 HP)
- Fractional BAB (system setting): sum raw fractional values, round once. Standard: sum of floored per-class BAB values.
- **Locked progressions**: If a progression has `locked: true`, the actor should complete it before taking levels in other progressions. Enforced as soft validation (derived warning), not a hard block.

## 8.3 Phase 5 Shell Replacement

Phase 5 provides the following shell/placeholder values. This phase replaces them with real derivations from class item data:

| Field | Phase 5 Shell | Phase 12 Derivation |
|-------|---------------|--------------------|
| `bab` | `0` | Sum of class AE contributions (stacking engine) |
| `saves.*.base` | `0` | Sum of class AE contributions (stacking engine) |
| `hp.max` | `1 x HD + CON mod` (placeholder level=1) | Sum of `levelHistory[].hp.rollResult + levelHistory[].hp.conMod` (HD-granting entries only) |
| `level` (total) | `1` (placeholder) | `actor.system.levelHistory.length` |
| `totalHD` | — | Count of `levelHistory` entries where `hp.dieSize !== null` |

## 8.4 Spellbooks (Class-Driven)

Spellbooks are **class-driven, not actor-common**. D35E put 4 spellbook definitions on `common` — we do NOT repeat this. Instead:

- Each class item with a `spellcasting` progression adds a spellbook to the actor when that class is added
- Spellbooks are keyed by class: `system.spellbooks.[classKey]`
- A wizard/cleric multiclass has two independent spellbooks
- Spell slots, spells known, and casting ability are all driven by the class item's `spellcasting` configuration
- Detailed implementation deferred to Phase 16 (Spells Alpha) / Phase 20 (Spells Full), but the class item schema must include the `spellcasting` stub field

## 8.5 Proficiencies via Grant System

Weapon and armor proficiencies are granted by classes through the grant schedule (Phase 7):

- Proficiencies are class features in compendiums, granted via auto-grant entries in the class's `grantSchedule`
- On class add to actor, proficiencies are granted with `grantedBy` provenance
- Non-proficiency penalties applied via the Action System (Phase 8): -4 attack with non-proficient weapon, spell failure from non-proficient armor

## 8.6 Level-Up Flow

Level-up creates a new `LevelRecord` on the actor's `system.levelHistory` array.

1. Player selects a progression (class or monstrous race) to add a level in. If the progression has `locked: true` and is incomplete, it must be selected (soft validation — warns if skipped).
2. System creates a new `LevelRecord` with `progressionId` pointing to the class/race item
3. HP: The system assumes **1 HD per level** by default. Check the progression's `hdOverride` map for this class level — if overridden to 0: `dieSize` is `null`, `rollResult` stays `null`, `conMod` is `0` — no HP gained. If **normal** (not overridden): die size recorded from progression, roll result is `null` until player explicitly clicks Roll (no auto-roll), **permanent** CON mod snapshot captured (see §12.9).
4. Skill points: If HD is overridden to 0, base skill points = 0 and INT mod snapshot = 0 (no skill points gained). If **normal**: base from progression + **permanent INT mod** snapshot. Allocation map starts empty. See §12.9 for what counts as permanent.
5. Ability score increase: if this is a **total HD milestone** (4th, 8th, 12th, 16th, 20th total HD), prompt for ability choice. Total HD = count of `levelHistory` entries where `hp.dieSize !== null`. See §12.12 for details.
6. Character-level bonus feat: if this is a **total HD milestone** (1st, 3rd, 6th, 9th, ... total HD), execute a `{ type: "choice", filter: { type: "feat" } }` grant. See §12.12 for details.
7. Auto-grants from the progression's `grantSchedule` for this class level are created on the actor with `grantedBy` provenance; IDs recorded in `LevelRecord.grants`
8. Choice grants present the player with selection UI; choices recorded in `LevelRecord.choices`
9. BAB/saves AE regenerates for the class (new effective level count)
10. `prepareDerivedData()` re-derives all stats from the updated level history

## 8.7 Level History Edit Rules

No hard locks. All edits are allowed. The system flags what broke.

- **HP roll**: Explicit click only. `null` until rolled. DM can allow re-roll (edit action on the level record).
- **Skill reallocation**: Player can change skill point allocation at any level. System recalculates total ranks.
- **Ability increase change**: Player can change ability choice at milestone levels.
- **Class change at level N**: Allowed only if no later level uses the same class (prevents "orphaning" downstream same-class levels where you'd need to know which is which). Changing the class removes that level's grants and recordings. The new class's grants for its effective level execute.
- **Downstream invalidation**: If a class at level N is changed, any later level that used the same class becomes **invalid** — its grants, choices, and HP are all flagged as warnings. The player must address each invalid level.
- **Prerequisite violations**: Feats and prestige classes that lose prerequisites are flagged with diagnostic hints (e.g., "Cleave requires Power Attack, which was removed at level 3").
- **Delete level**: Most recent level only. Removes the `LevelRecord`, revokes its grants, recalculates HP/skills.
- **All edits cascade**: Every change triggers `prepareDerivedData()`, re-deriving the full actor state from the ledger.
- **Warnings are derived**: `derived.levelWarnings: ValidationWarning[]` — never persisted, always recomputed.

## 8.8 Skills System

> **Note**: This section covers skills infrastructure introduced with classes. A dedicated Skills phase (inserted after Phase 12) will implement the full skill system with ranks UI, synergies, and skill check actions. Phase 8 introduces a basic skill check (d20 + ability mod only). This phase adds the data model and class-skills derivation.

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

## 8.9 Ability Score Permanence for Snapshots

When snapshotting ability modifiers at level-up (INT mod for skill points, CON mod for HP), use the character's **permanent** ability score only. This includes:
- **Base score** (point buy, rolled stats)
- **Inherent bonuses** (Wish, Tome of Understanding, etc.)
- **Ability drain** (permanent reduction, e.g., from energy drain effects)
- **Ability increase from level-up** (the +1 at levels 4/8/12/16/20 — applied in step 4, BEFORE skill point calculation in step 5)

This **excludes** temporary modifiers:
- **Ability damage** (temporary reduction, heals naturally)
- **Enhancement bonuses** from spells or magic items (e.g., headband of intellect, bull's strength, bear's endurance)
- **Morale, insight, or other typed bonuses** from spells/effects

Implementation: the snapshot must read from a `permanentMod` derived value that filters out non-permanent AE changes. AE changes with enhancement, morale, insight, luck, sacred, profane bonus types are excluded. Inherent and untyped AE changes from level-up are included. The stacking engine already tracks bonus types, so this is a filtered view of the ability score calculation.

## 8.10 Advancement: Milestones vs XP

**Default: Milestone advancement.** The SRD XP/level table is copyrighted and cannot be included. The system ships with milestone leveling as the default.

### Milestone Mode (Default)

- No XP tracking required (XP fields exist on the actor but are cosmetic)
- GM grants levels directly:
  - **Party Level-Up button**: A scene control button (left sidebar, GM-only) that grants +1 level to all party members (`isPartyMember: true`). Opens a dialog: "Grant a level to the party? This will add a level-up prompt to each party member's sheet."
  - **Per-character level-up**: GM clicks "Add Level" on any character sheet directly
- Level-up creates a new `LevelRecord` per the 12.6 flow — player still picks class, rolls HP, allocates skills

### XP Mode (Setting)

A system setting (`advancementMode: 'milestone' | 'xp'`, default `'milestone'`) switches to XP-based advancement.

When XP mode is enabled:
- A **GM-editable XP/Level table** appears in system settings. The table maps total XP thresholds to character levels:
  ```
  xpTable: [
    { level: 2, xp: 1000 },
    { level: 3, xp: 3000 },
    { level: 4, xp: 6000 },
    ...
  ]
  ```
  The GM fills this in manually (from whatever source they use). The system ships with an empty table — the GM must populate it to use XP mode.

- **XP gain triggers level check**: When `xp.value` is updated on a character (via sheet edit, macro, or award), `prepareDerivedData()` checks the XP table. If `xp.value >= nextLevelThreshold`, a level-up prompt appears.
- **`xp.max` is derived**: looked up from the XP table based on current level. Shows "XP to next level" on the character sheet.
- **GM force level-up in XP mode**: When a GM forces a level-up (party button or character sheet), the character's `xp.value` is set to the threshold for that level from the XP table. This keeps XP and level in sync.
- **Removing the XP table** (clearing all entries) reverts to milestone mode behavior — `xp.max` shows 0, no auto-level checks, GM grants levels manually.

### Party Level-Up Button (Scene Controls)

- Location: Left sidebar scene controls, GM-only, alongside token/measurement/lighting controls
- Icon: Level-up arrow or similar
- Action: Opens confirmation dialog listing all party members. GM confirms, and each party member gets a level-up prompt on their sheet (the actual class choice, HP roll, skill allocation happens per-character).
- In XP mode: also sets each party member's XP to the next level's threshold.

## 8.12 Feat and Ability Score Milestones (Total HD Rule)

The SRD states: *"A monster's total Hit Dice, not its ECL, govern its acquisition of feats and ability score increases."* This applies universally:

- **Bonus feats**: gained at 1st, 3rd, 6th, 9th, 12th, 15th, 18th **total HD**
- **Ability score increases**: gained at 4th, 8th, 12th, 16th, 20th **total HD**

**Total HD** = count of `levelHistory` entries where `hp.dieSize !== null`. This excludes levels where the progression's `hdOverride` set HD to 0. For standard PCs where every level grants a HD, total HD = `levelHistory.length` and the schedules work identically to the PHB description.

### Examples

| Character | Levels | HD-Granting Levels | Total HD | Feats at HD | Ability +1 at HD |
|-----------|--------|--------------------|----------|-------------|-----------------|
| Human Fighter 6 | 6 | 6 | 6 | 1, 3, 6 | 4 |
| Bugbear Rogue 3 | 3 racial + 3 class | 6 | 6 | 1, 3, 6 | 4 |
| Dragon (no class) | 12 racial | 12 | 12 | 1, 3, 6, 9, 12 | 4, 8, 12 |
| Half-Dragon 6 | 6 monster class | 4 (2 overridden) | 4 | 1, 3 | 4 |
| Half-Dragon 6 / Fighter 2 | 6 monster + 2 class | 6 | 6 | 1, 3, 6 | 4 |

### Implementation

The level-up flow (§12.6 steps 5-6) counts `levelHistory` entries where `hp.dieSize !== null` to determine total HD *after* appending the new record. If the new record itself has HD overridden to 0, total HD does not increase and no feat/ability milestone fires. The schedule is **not configurable** per progression; it is a universal rule based on total HD.

### Monster Class Progressions

Some supplemental rules allow playing powerful monsters from 1st level by breaking a creature's ECL (racial HD + level adjustment) into a multi-level **monster class** progression. Key properties:

1. **Starts at 1 HD** — like a standard race. The character begins play with 1 Hit Die and gains additional racial HD (and abilities) as they advance through the monster class.

2. **Not every level grants a HD** — some monster class levels grant only racial abilities (natural armor, speed increases, spell-like abilities, etc.) without adding a Hit Die. The system assumes **1 HD per level by default**; specific levels can override this to 0 via the progression's `hdOverride` map. On overridden levels:
   - No HP die is rolled (the LevelRecord's `hp.dieSize` is `null`)
   - No CON mod is added to HP
   - No skill points are gained (base = 0, intMod = 0)
   - Total HD does **not** increase → feat/ability milestones do **not** advance
   - BAB and saves **do** still advance (they follow the class level, not HD)

3. **Locked progression** — a monster class progression typically must be completed before the character can take levels in other classes. This is modeled via `progression.locked: true`. The level-up UI presents a soft warning if the player tries to multiclass before completing a locked progression. GMs can override.

4. **After completion** — once the monster class is complete, the character has their full racial HD and abilities. They can then advance normally in standard classes (or by creature-type HD advancement, which uses the race's Progression component).

#### Data Model for Monster Classes

A monster class uses `classType: 'monster'` and configures its `ProgressionData` with `hdOverride` to specify which class levels override the default 1 HD to 0:

```typescript
// Example: Half-Dragon (6-level monster class, HD at levels 1, 2, 4, 6 only)
{
  classType: "monster",
  progression: {
    hdSize: 10,                    // d10 (Dragon HD)
    babRate: "high",
    saves: { fort: "good", ref: "good", will: "good" },
    skillPointsPerLevel: 6,
    hdOverride: { 3: 0, 5: 0 },    // Levels 3 and 5 override default HD to 0
    locked: true,                  // Must complete all 6 levels before multiclassing
    grantSchedule: [
      { at: 1, type: "grant", uuid: "...darkvision" },
      { at: 1, type: "grant", uuid: "...natural-armor-2" },
      { at: 2, type: "grant", uuid: "...claw-attack" },
      { at: 3, type: "grant", uuid: "...breath-weapon" },     // HD overridden to 0
      { at: 4, type: "grant", uuid: "...immunity-sleep" },
      { at: 5, type: "grant", uuid: "...wings" },             // HD overridden to 0
      { at: 6, type: "grant", uuid: "...frightful-presence" },
    ],
    classSkills: ["Intimidate", "Listen", "Search", "Spot"],
  }
}
```

#### Level-by-Level Example (Half-Dragon)

| Monster Class Level | HD Gained? | Total HD | BAB | Feat? | Ability +1? | Grants |
|---------------------|-----------|----------|-----|-------|-------------|--------|
| 1 | Yes (d10) | 1 | +1 | Feat (HD 1) | — | Darkvision, Natural Armor |
| 2 | Yes (d10) | 2 | +2 | — | — | Claw Attack |
| 3 | **No** | 2 | +3 | — | — | Breath Weapon |
| 4 | Yes (d10) | 3 | +4 | Feat (HD 3) | — | Immunity to Sleep |
| 5 | **No** | 3 | +5 | — | — | Wings |
| 6 | Yes (d10) | 4 | +6 | — | Ability +1 (HD 4) | Frightful Presence |

After completing all 6 levels, the character has 4 HD, BAB +6, and can take standard class levels (e.g., Fighter 1 at character level 7, total HD 5).

## 8.13 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/class/` — Class class, data model, sheet |
| Reuse | `src/helpers/grants.mts` — Grant system from Phase 11 |
| Reuse | `src/helpers/progression.mts` — Progression component + AE generation from Phase 11 |
| Create | `src/entities/actor/LevelUpManager.mts` — Level-up pipeline, level history management |
| Expand | Actor `prepareDerivedData()` — BAB, saves, HD, skill points from class AEs + level history |
| Expand | Actor data model — skills with full SkillData, `levelHistory: LevelRecord[]` |
| Create | `src/constants/skills.mts` — all 40+ D&D 3.5 skills |
| Create | Scene control button — GM party level-up (left sidebar) |
| Expand | System settings — `advancementMode` setting, XP/level table editor |
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
- [ ] Wire `SkillSettingsApp.vue` to use `CONFIG.DND35E.skills` (`SkillSettingsApp.vue:145`): The `systemSkills` and `abilities` computed properties are currently empty stubs with a TODO noting they should come from config. Once skills are exported to CONFIG, populate these computeds from `CONFIG.DND35E.skills` and `CONFIG.DND35E.abilities`.
- [ ] Test: All skills accessible via constant lookup
- [ ] Test: Ability associations correct (Jump = STR, Listen = WIS, etc.)

**Class Data Model & Schema:**
- [ ] Create `src/entities/items/class/ClassSystemModel.mts` extending ItemSystemModelBase
- [ ] Define schema: classType (StringField with choices: 'base', 'prestige', 'npc', 'minion', 'monster', 'template')
- [ ] Define schema: progression (EmbeddedDataField of ProgressionData — shared with Phase 11)
  - hdSize, babRate, saves, skillPointsPerLevel, grantSchedule, classSkills, hdOverride, locked
- [ ] Define schema: spellcasting (SchemaField or null for Phase 16, stub: castingType, castingAbility, spontaneous)
- [ ] Define schema: prerequisites (ArrayField of PrerequisiteData — reuse feat prereq system from Phase 10)
- [ ] Define schema: source (StringField for book reference)
- [ ] NO `level` field — class level is derived from counting `levelHistory` entries referencing this class
- [ ] Add `identifiedName` and `unidentifiedName` fields
- [ ] Test: ClassSystemModel instantiation
- [ ] Test: Schema validation
- [ ] Test: Progression defaults auto-fill from class type selection

**Class Item Class:**
- [ ] Create `src/entities/items/class/ItemDnd35eClass.mts` extending ItemDnd35e
- [ ] Override `prepareDerivedData()`: compute effective level from actor's `levelHistory`, generate class AE for BAB/saves via `src/helpers/progression.mts`
- [ ] Implement `getEffectiveLevel(actor)`: count `levelHistory` entries where `progressionId` matches this class
- [ ] Delegate BAB/save AE generation to shared progression helper
- [ ] Implement `getSkillPointsForLevel()`: return `progression.skillPointsPerLevel` (INT mod added during level-up)
- [ ] Handle multiclass: each class item contributes independently, stacking engine sums AEs
- [ ] Test: Fighter (high BAB) with 5 levels in history produces correct BAB AE
- [ ] Test: Cleric (med BAB) with 5 levels produces correct BAB AE
- [ ] Test: Fighter/Cleric multiclass AEs stack correctly via stacking engine

**Class Sheet (Vue Component):**
- [ ] Create `src/vue/components/sheets/ClassSheetDnd35e.vue` extending base item sheet
- [ ] Implement tabs: Details, Features, Skills, Description
- [ ] **Details tab**: Show classType dropdown, HD size, BAB rate dropdown, save rate dropdowns, skillPointsPerLevel, prerequisites (for prestige)
- [ ] Display BAB/save progression table: show progression from level 1 to 20 with current effective level highlighted
- [ ] **Features tab**: Grant schedule editor (shared UI component from Phase 11). Shows GrantScheduleEntry list with level, type, UUID/filter.
- [ ] Add/remove buttons for grant schedule entries
- [ ] Drag-drop support for feat UUIDs into grant schedule
- [ ] **Skills tab**: Checkbox list of class skills (from skills constants), can check/uncheck to mark as class skill
- [ ] **Description tab**: Rich text editor for class description/lore
- [ ] Implement i18n for all labels
- [ ] Test: Class sheet renders all tabs
- [ ] Test: Can edit class properties
- [ ] Test: BAB/save progression table displays correctly
- [ ] Test: Can add/remove feature grants
- [ ] Test: Class skills selection works

**Grant System - Class Integration:**
- [ ] Reuse `src/helpers/grants.mts` from Phase 11 — no new grant system code needed
- [ ] During level-up, call `executeScheduleForLevel(actor, class.progression.grantSchedule, classLevel, classId)`
- [ ] `at` arrays handled by Phase 11's grant system (e.g., Fighter bonus feats at `[1, 2, 4, 6, 8, ...]`)
- [ ] On level removal, call `revokeGrantsForLevel(actor, classId, removedLevel)`
- [ ] Test: Fighter level 1 triggers combat feat choice
- [ ] Test: Fighter level 2 triggers another combat feat choice (from `at` array)
- [ ] Test: Level removal revokes grants for that specific level only

**Turn / Rebuke Undead (Class Feature Action):**
- [ ] Implement Turn Undead class feature action on Cleric (and Paladin at level-3)
- [ ] Turn check: 1d20 + CHA mod → determines max HD of undead affected (table lookup)
- [ ] Turning damage: 2d6 + cleric level + CHA mod → total HD of undead turned
- [ ] Process targets: affect undead starting with lowest HD first, up to turning damage total
- [ ] Turned condition: undead flees for 10 rounds (applied as condition AE)
- [ ] Destroy: if cleric level ≥ 2× undead HD, destroy instead of turn
- [ ] Rebuke variant: evil clerics rebuke (cower) or command (control) undead
- [ ] Turn/Rebuke uses per day: 3 + CHA mod (tracked as class feature resource)
- [ ] Extra Turning feat: +4 uses per day
- [ ] Divine feat prerequisite: many divine feats require Turn Undead uses as fuel
- [ ] Test: Cleric turns undead below HD threshold, ignores those above
- [ ] Test: Cleric destroys undead at 2× level threshold
- [ ] Test: Uses per day decremented correctly

**Proficiency Grants from Classes:**
- [ ] Define `grantedProficiencies` on ClassSystemModel: weapons (ArrayField of StringField), armor (ArrayField of StringField)
- [ ] Fighter proficiencies: all simple, all martial, all armor, all shields (including tower)
- [ ] Cleric proficiencies: simple weapons, light/medium/heavy armor, shields (no tower)
- [ ] Rogue proficiencies: simple weapons + hand crossbow/rapier/sap/shortbow/short sword, light armor, no shields
- [ ] On class add: grant proficiencies to actor (stored as granted features for removal tracking)
- [ ] On class remove: revoke proficiencies granted by that class (unless another class also grants them)
- [ ] Non-proficiency penalties applied in Phase 8 Action System: -4 attack roll for non-proficient weapon, arcane spell failure for non-proficient armor
- [ ] Test: Add Fighter → actor gains all simple/martial weapon proficiency
- [ ] Test: Add Rogue to Fighter/Rogue → no duplicate proficiency entries for shared weapons
- [ ] Test: Remove Rogue → Rogue-only proficiencies removed, Fighter-shared ones remain

**Spellbook Infrastructure (Stub for Phase 16):**
- [ ] When class item with `spellcasting` field is added to actor, register a spellbook keyed by class: `system.spellbooks.[classKey]`
- [ ] Spellbook schema stub: castingType ('arcane'|'divine'), castingAbility ('int'|'wis'|'cha'), spontaneous (boolean), slots (deferred to Phase 16)
- [ ] Support multiple spellbooks: wizard/cleric multiclass has two independent spellbooks
- [ ] On class removal: remove associated spellbook
- [ ] Test: Add Cleric → spellbook created at `system.spellbooks.cleric`
- [ ] Test: Add Wizard → second spellbook at `system.spellbooks.wizard`
- [ ] Test: Remove Cleric → only cleric spellbook removed

**Actor Class Support & Multi-Classing:**
- [ ] Modify ActorDnd35e to support multiple class items
- [ ] Implement `getClasses()`: returns array of class items on actor
- [ ] Implement `getProgressions()`: returns all class + monstrous race progressions
- [ ] `getTotalLevel()` derived from `system.levelHistory.length`
- [ ] Allow multiple class items but prevent duplicate class names
- [ ] Class effective level derived from `levelHistory` count, not stored on the class item
- [ ] Test: Add one class, take a level in it via level-up flow
- [ ] Test: Add second class, take a level in it 
- [ ] Test: Total level = sum of all level history entries

**Level-Up Pipeline (Level History):**
- [ ] Create `src/entities/actor/LevelUpManager.mts`
- [ ] Implement `addLevel(actor, progressionId)`: creates a new `LevelRecord` on `system.levelHistory`
  - Record: `{ progressionId, hp: { dieSize, rollResult: null, conMod }, skillPoints: { base, intMod, allocated: {} }, abilityIncrease: null, grants: [], choices: {} }`
  - Check progression's `hdOverride` for this class level. If HD overridden to 0: set `hp.dieSize = null`, `hp.rollResult = null`, `hp.conMod = 0`, `skillPoints.base = 0`, `skillPoints.intMod = 0`
  - If HD-granting: snapshot **permanent** CON mod and INT mod at time of leveling (see §12.9 for permanent vs temporary)
  - Check progression's `locked` flag. If locked and incomplete, warn if player selected a different progression (soft validation).
  - Execute progression's `grantSchedule` for the new class level
  - If total HD milestone (4/8/12/16/20 total HD — counted from HD-granting entries), prompt for ability increase
  - If total HD milestone (1/3/6/9/... total HD), execute feat choice grant
  - See §12.12 for how total HD governs feat and ability score milestones
- [ ] Implement `removeLevel(actor)`: removes the most recent `LevelRecord`
  - Revokes all grants from that level record
  - Recalculates HP, skill points
  - Cascading re-derive via `prepareDerivedData()`
- [ ] Implement `editLevelRecord(actor, index, changes)`: edit an existing level record
  - Validates cascade: flags warnings for downstream prerequisite violations
  - Re-derives after edit
- [ ] Implement `rollHp(actor, levelIndex)`: rolls HD for a specific level record
  - Updates `levelHistory[levelIndex].hp.rollResult`
  - Minimum 1 HP per level
  - Cannot re-roll once set (DM override via explicit edit action)
- [ ] Provide UI notification: "Level up! Select a feat. Roll HP."
- [ ] Test: addLevel creates a LevelRecord with correct snapshots
- [ ] Test: removeLevel revokes grants and cascades
- [ ] Test: rollHp sets result, re-rolling is blocked unless DM override
- [ ] Test: Ability increase prompt at levels 4/8/12/16/20

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

**Prepare Derived Data - Phase 5 Shell Replacement:**
- [ ] Replace `bab = 0` shell with value from summed class AEs (stacking engine handles summation)
- [ ] Replace `saves.*.base = 0` shell with values from summed class AEs
- [ ] Replace `hp.max` placeholder with sum of `levelHistory[].hp.rollResult + levelHistory[].hp.conMod` for HD-granting entries only (`dieSize !== null`; null rolls treated as 0 — warns player)
- [ ] Replace `level = 1` placeholder with `levelHistory.length`
- [ ] Derive `derived.totalHD` = count of `levelHistory` entries where `hp.dieSize !== null` (excludes levels with HD overridden to 0)
- [ ] Derive `levelWarnings: ValidationWarning[]` — prerequisite violations, invalid levels, unrolled HP
- [ ] Build `derived.prerequisiteRegistry: PrerequisiteRecord[]` — scan all owned items with `prerequisites` arrays, evaluate each prerequisite against current actor stats, collect results (see Actor PropertyMap for schema). Phase 14 implements the evaluators; Phase 12 provides the scan/collect infrastructure.
- [ ] Ensure Phase 5 shell values remain as fallback when `levelHistory` is empty (level 0 / classless actor)
- [ ] Test: Actor with no history falls back to shell values
- [ ] Test: Actor with Fighter 5 levels in history derives correct BAB/saves/HP/level
- [ ] Test: Actor with unrolled HP shows warning

**Prepare Derived Data - BAB, Saves, Skills Calculation:**
- [ ] Modify Actor `prepareDerivedData()` implementation
- [ ] BAB and saves computed by stacking engine from class AEs (no manual summation in prepareDerivedData)
- [ ] Calculate skill class skill status: for each skill, if any class has it as class skill, set `system.skills.[skill].classSkill = true`
- [ ] Aggregate skill ranks from all `levelHistory[].skillPoints.allocated` maps
- [ ] Calculate each skill's total (ranks + ability mod + class skill bonus + misc - ACP)
- [ ] Store results in actor.system for UI consumption
- [ ] Test: Fighter level 5 derives correct BAB from AE
- [ ] Test: Fighter/Rogue MC derives correct combined BAB
- [ ] Test: Skills aggregate ranks correctly across all level history entries

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
- [ ] HP rolling handled by `LevelUpManager.rollHp(actor, levelIndex)`
- [ ] Roll is explicit click only — `levelHistory[].hp.rollResult` starts as `null`
- [ ] Roll mode: roll `d{hdSize}` (minimum 1 HP). **Permanent** CON mod already captured in snapshot (see §12.9).
- [ ] No auto-roll on level-up. Player must explicitly click to roll each level's HP.
- [ ] Re-roll blocked unless DM uses edit action to set `rollResult` to `null` and allow re-roll
- [ ] Show in UI: "+8 HP (rolled 6 + 2 CON)" or "HP not yet rolled" for null entries. Show "permanent CON" to distinguish from current CON if different.
- [ ] `hp.max` derived: sum of all `(rollResult ?? 0) + conMod` across `levelHistory`, minimum 1 per level. `conMod` is the **permanent** CON mod snapshot (§12.9).
- [ ] Test: Level up without rolling shows null HP and warning
- [ ] Test: Roll HP sets result, total HP updates
- [ ] Test: Re-roll blocked on second click

**Skill Point Pool Management:**
- [ ] Skill points tracked per-level in `levelHistory[].skillPoints`: base + intMod = available, allocated map tracks spending
- [ ] INT mod snapshot uses **permanent** INT only (inherent bonuses, ability drain, level-up ability increase) — NOT temporary (ability damage, enhancement bonuses from spells/items like headband of intellect). See §12.9.
- [ ] Remaining points for a level = `(base + intMod) - sum(allocated.values())`
- [ ] Total remaining across all levels derived in `prepareDerivedData()`
- [ ] Total ranks in a skill = sum of `levelHistory[].skillPoints.allocated[skillId]` across all levels
- [ ] Max ranks per skill: `totalLevel + 3` for class skills, `(totalLevel + 3) / 2` for cross-class — validated as soft warning
- [ ] Reallocation: edit a level's `allocated` map. Cascade re-derives totals.
- [ ] Test: Rogue with 4 skill points/level + INT +2 = 10 points at level 1
- [ ] Test: Allocate 4 to Climb, 3 to Hide — remaining = 3
- [ ] Test: Level to 2 adds 10 more points for level 2
- [ ] Test: Over-rank produces soft warning, not hard block
- [ ] Test: INT boosted by headband of intellect (+2 enhancement) does NOT increase skill points on level-up
- [ ] Test: Permanent INT increase (level-up ability increase at step 4) DOES increase skill points for that level

**POC Classes - Fighter:**
- [ ] Create Fighter template with standard D&D 3.5e specs:
  - classType: 'base'
  - progression.hdSize: 10
  - progression.babRate: 'high'
  - progression.saves: {fort: 'good', ref: 'poor', will: 'poor'}
  - progression.skillPointsPerLevel: 2
  - progression.classSkills: ['Climb', 'Handle Animal', 'Intimidate', 'Jump', 'Ride', 'Swim']
  - progression.grantSchedule: `[{ at: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20], type: "choice", filter: { type: "feat", featType: "combat" } }]`
- [ ] Create compendium entry
- [ ] Test: Add Fighter to character, take 5 levels via level-up flow — BAB, saves, HP, skill points all correct

**POC Classes - Cleric:**
- [ ] Create Cleric template:
  - classType: 'base'
  - progression.hdSize: 8
  - progression.babRate: 'med'
  - progression.saves: {fort: 'good', ref: 'poor', will: 'good'}
  - progression.skillPointsPerLevel: 2
  - progression.classSkills: ['Concentration', 'Craft (any)', 'Diplomacy', 'Heal', 'Knowledge (arcana)', 'Knowledge (history)', 'Knowledge (religion)', 'Profession (any)', 'Spellcraft']
  - progression.grantSchedule: [Channel Energy at 1st, etc. - stubs for Phase 16+]
- [ ] Test: Add Cleric to character, verify BAB/saves/HP

**POC Classes - Rogue:**
- [ ] Create Rogue template:
  - classType: 'base'
  - progression.hdSize: 6
  - progression.babRate: 'med'
  - progression.saves: {fort: 'poor', ref: 'good', will: 'poor'}
  - progression.skillPointsPerLevel: 8 (highest in game)
  - progression.classSkills: [all skills related to deception/stealth]
  - progression.grantSchedule: [Sneak Attack at 1 (self-scaling item), Evasion at 2, etc.]
- [ ] Test: Add Rogue to character — high skill points per level visible

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
- [ ] Standard BAB (default): each class AE provides its floored BAB value. Stacking engine sums all class AEs.
  - Fighter 5/Rogue 3: Fighter AE +5 + Rogue AE +2 = +7 total
- [ ] Fractional BAB (system setting): each class AE provides raw fractional value. Stacking engine sums, rounds once at end.
  - Fighter 5/Wizard 5: Fighter 5.0 + Wizard 2.5 = 7.5 rounded to +7
- [ ] Same logic for saves: standard vs fractional via system setting
- [ ] Verify iterative attack generation works with combined BAB
- [ ] Test: Fighter 5/Wizard 5 standard BAB = +5 + +2 = +7
- [ ] Test: Fighter 5/Wizard 5 fractional BAB = 5.0 + 2.5 = +7 (same in this case)
- [ ] Test: Three-class multiclass with fractional BAB avoids "rounding penalty"

**Ability Score Permanence (Snapshot Filtering):**
- [ ] Implement `getPermanentAbilityMod(actor, ability)` helper that filters out non-permanent AE changes
- [ ] Include: base score, inherent bonuses, ability drain, level-up ability increases
- [ ] Exclude: enhancement bonuses (headband of intellect, etc.), ability damage, morale/insight/luck/sacred/profane bonuses
- [ ] Use in `LevelUpManager.addLevel()` for CON mod and INT mod snapshots
- [ ] Leverage stacking engine bonus type tracking to identify which AE changes are permanent vs temporary
- [ ] Test: Actor with base INT 14 + headband of intellect +2 (enhancement) snapshots INT mod as +2, not +3
- [ ] Test: Actor with base INT 14 + Wish inherent +1 snapshots INT mod as +3 (includes inherent)
- [ ] Test: Actor with ability drain -2 INT snapshots the reduced score
- [ ] Test: Level-up ability increase at step 4 (+1 INT) is included in the INT mod for step 5 (skill points)
- [ ] Test: Actor with base CON 12 + bear's endurance +4 (enhancement) snapshots CON mod as +1, not +3
- [ ] Test: Actor with base CON 12 + Wish inherent +1 snapshots CON mod as +2 (includes inherent)

**Advancement System (Milestone / XP):**
- [ ] Add system setting: `advancementMode` ('milestone' | 'xp'), default 'milestone'
- [ ] Add system setting: `xpTable` (array of `{ level: number, xp: number }` entries), default empty
- [ ] Create XP table editor UI in system settings (GM-only, appears when advancementMode = 'xp')
- [ ] In milestone mode: XP fields on actor are cosmetic, `xp.max` shows 0
- [ ] In XP mode: `xp.max` derived from XP table lookup based on current level
- [ ] In XP mode: `prepareDerivedData()` checks if `xp.value >= xp.max` and flags level-up available
- [ ] GM force level-up in XP mode: set `xp.value` to the threshold for the new level
- [ ] Clearing the XP table reverts to milestone behavior
- [ ] Test: Milestone mode, level-up via GM button works without XP
- [ ] Test: XP mode with table, gaining XP triggers level-up prompt
- [ ] Test: XP mode, GM force level-up sets XP correctly
- [ ] Test: Clearing XP table reverts to milestone

**Party Level-Up (Scene Controls):**
- [ ] Add GM-only scene control button in left sidebar
- [ ] Button opens confirmation dialog listing all party members (`isPartyMember: true`)
- [ ] On confirm: adds a level-up prompt to each party member's sheet (pending LevelRecord)
- [ ] In XP mode: also sets each party member's `xp.value` to next level threshold
- [ ] Per-character level-up: "Add Level" button on character sheet (GM and owner)
- [ ] Test: GM clicks party level-up, all party members get level-up prompt
- [ ] Test: Non-party-member actors are not affected
- [ ] Test: Per-character level-up on sheet works independently

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

**Total HD Milestones (Feat/Ability Score):**
- [ ] Feat milestones trigger at 1st, 3rd, 6th, 9th, 12th, 15th, 18th total HD (count of `levelHistory` entries where `hp.dieSize !== null`)
- [ ] Ability score increase milestones trigger at 4th, 8th, 12th, 16th, 20th total HD
- [ ] Total HD counts both racial HD (from race progression) and class HD — excludes levels where `hdOverride` set HD to 0
- [ ] HD-overridden levels (`hdOverride` on ProgressionData): `hp.dieSize = null`, no HP rolled, no skill points, no feat/ability milestone
- [ ] HD-overridden levels still advance BAB/saves (class level advances, just no HD)
- [ ] Test: Human Fighter 3 → feats at HD 1 and 3 (total HD = class levels)
- [ ] Test: Bugbear (3 racial HD) + Rogue 1 → total HD 4, feat at HD 1 and 3 (during racial), ability +1 at HD 4
- [ ] Test: Half-Dragon 6-level monster class (HD at 1,2,4,6 / overridden at 3,5) → total HD 4, feats at HD 1 and 3 (at class levels 1 and 4), ability +1 at HD 4 (class level 6)
- [ ] Test: Half-Dragon 6 + Fighter 1 → total HD 5, no feat milestone at HD 5 (next at HD 6)
- [ ] Test: HD-overridden level does not produce an HP roll prompt
- [ ] Test: HD-overridden level still grants abilities from grantSchedule

**Locked Progressions (Monster Classes):**
- [ ] Progression with `locked: true` produces soft warning when player selects a different progression before completing it
- [ ] Warning includes message like "Half-Dragon racial class is incomplete (4/6 levels). Complete it before multiclassing."
- [ ] GM can override/dismiss the warning and allow multiclassing anyway
- [ ] After locked progression is complete, warning no longer appears
- [ ] Test: Actor with locked monster class (incomplete) → warning on selecting Fighter
- [ ] Test: Actor with completed locked monster class → no warning on selecting Fighter
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
