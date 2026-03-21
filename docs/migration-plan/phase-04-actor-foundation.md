# Phase 4: Actor Foundation — Inventory & Equipment

> **Status**: Not started  
> **Dependencies**: Phase 1, Phase 3  
> **Goal**: A character actor has ability scores, an inventory, can hold a weapon, and can equip it. The weapon's equipped state is reflected in data prep.

---

## 4.1 Actor System Data Model

Bring over the core character data from D35E's `template.json` actor template, but as a typed `DataModel`:

```
ActorSystemModel (character)
├── abilities: { str, dex, con, int, wis, cha }
│   Each: { base: number, mod: number (derived) }
│   (damage/drain/penalty added in Phase 16)
├── attributes
│   ├── hp: { base, max (derived), value, temp, nonlethal }
│   ├── bab: { total (derived) }
│   ├── ac: { normal, touch, flatFooted } (all derived, start with DEX+10)
│   ├── saves: { fort, ref, will } each: { base, total (derived), ability: AbilityKey }
│   ├── speed: { land, climb, swim, burrow, fly } each: { base, total (derived) }
│   ├── init: { bonus, total (derived) }
│   ├── sr: number
│   └── dr: DamageReduction[]
├── details
│   ├── level (derived from class items)
│   ├── xp: { value, max }
│   ├── alignment: string
│   ├── race: string (derived from race item)
│   └── size: SizeCategory
├── skills: Record<SkillKey, SkillData> (stub — expanded in Phase 13)
├── currency: { pp, gp, sp, cp }
├── encumbrance: { current (derived), light, medium, heavy, carry, drag } (all derived)
└── conditions: Record<ConditionKey, boolean> (stub — expanded in Phase 16)
```

## 4.2 Inventory System

- Items owned by actor appear in an inventory list on the actor sheet
- Organize by type tabs: Weapons, Equipment, Consumables, Loot, Features
- Display weight, price, quantity, equipped state
- Drag-and-drop items onto actor from compendium or sidebar

## 4.3 Equipment Slot System

- Use the existing `equipmentSlots` constants (head, face, neck, shoulders, etc.)
- Weapon equip: mainhand / offhand (not in slot list yet — add weapon slots)
- Only one item per slot (except rings: left + right)
- Equipping fires active effects (e.g., armor grants AC — implemented in Phase 10)

## 4.4 Ability Score Preparation

- `prepareBaseData()`: set raw ability scores from source
- `prepareDerivedData()`:
  - Calculate ability modifiers: `floor((score - 10) / 2)`
  - Apply size modifiers
  - Calculate carrying capacity from STR
  - Calculate encumbrance from inventory weight
  - Calculate AC (10 + DEX mod + size; armor/shield added in Phase 10)
  - Calculate saves (base + ability mod; class contributions added in Phase 13)
  - Calculate initiative (DEX mod + misc)

## 4.5 Actor Sheet (Vue)

- **Header**: Name, level, race, alignment, portrait
- **Tabs**: Abilities, Inventory, Features, Effects, Biography
- **Abilities tab**: Six ability scores (editable base, display modifier)
- **Inventory tab**: Grouped item list, equip toggles, weight/price, drag-and-drop
- **Effects tab**: Active effects on the actor
- **All strings via i18n keys**

## 4.6 Document Store Refresh

Override `update()` on `ActorDnd35e` to refresh the active Pinia store after Foundry persists changes. This ensures Vue reactivity stays in sync. Establish this pattern here and carry it forward to all document types.

## 4.7 Migration Version Tracking

Start tracking `system.migration.version` on actors from this phase onward. Even though migration infrastructure lives in Phase 23, the version field needs to exist early so future migrations can key off it.

## 4.8 Files to Create/Modify

| Action | Path |
|--------|------|
| Expand | `src/entities/actors/baseActor/data/ActorSystemModelBase.mts` — add ability scores, HP, AC, saves, etc. |
| Expand | `src/entities/actors/baseActor/data/ActorSystemData.mts` — interfaces for source + derived data |
| Expand | `src/entities/actors/baseActor/ActorDnd35e.mts` — implement `prepareBaseData()`, `prepareDerivedData()`, `update()` refresh |
| Create | `src/vue/apps/actor/CharacterSheet.vue` — main character sheet |
| Create | `src/vue/apps/actor/CharacterSheetApp.mts` — Vue app wrapper |
| Create | `src/vue/components/actor/` — AbilityScores, Inventory, EquipmentSlots components |
| Modify | `src/entities/actors/registration.mts` — register character sheet |
| Create | `src/constants/abilities.mts` — ability score constants |
| Create | `src/lang/en/abilities.json`, `src/lang/en/actors.json` |
