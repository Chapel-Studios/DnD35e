# Phase 24: Content Migration — D35E → dnd35e

> **Status**: Not started  
> **Dependencies**: Phase 23  
> **Goal**: Migration tools for D35E world data and compendiums.

---

## 24.1 Data Transform Map

| D35E Source | dnd35e Target |
|-------------|---------------|
| Weapon item | Weapon item (field renames) |
| Equipment item | Equipment item |
| Loot item | Loot item |
| Consumable item | Consumable item |
| Class item | Class item (restructured progression) |
| Spell item | Spell item (restructured) |
| Feat item | Feat item (changes → AE pattern) |
| Buff item | **Buff Active Effect** ← item to AE migration |
| Attack item | Attack item (actions via Action System) |
| Race item | Race item (restructured with grants) |
| Enhancement item | **Enhancement Active Effect** ← item to AE |
| Material item | **Material Active Effect** ← already done |
| Aura item | **Aura Active Effect** ← item to AE |
| Alignment item | Actor property (dropped as type) |
| Damage-type item | Constant (dropped as type) |
| Full-attack item | Action Chain (dropped as type) |
| Card item | Defer or drop |
| Valuable item | Loot subtype |

## 24.2 World Migration

```
migrateWorld()
├── Check system.migration.version vs current
├── For each actor: migrateActor()
│   ├── Transform system data fields
│   ├── For each item: migrateItem()
│   │   ├── Transform item data
│   │   └── Convert "changes" → AE changes
│   └── Convert buff items → buff AEs
├── For each scene: migrateScene()
│   └── For each token: migrateTokenData()
├── For each compendium: migrateCompendium() (if user opts in)
└── Update system.migration.version
```

## 24.3 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/migration/d35e/` — D35E-specific migration transforms |
| Create | Per-item-type transform functions |
| Create | World migration runner |
| Create | Compendium migration tool |
