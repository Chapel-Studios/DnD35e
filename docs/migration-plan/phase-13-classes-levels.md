# Phase 13: Classes & Level Progression

> **Status**: Not started  
> **Dependencies**: Phase 11, Phase 12  
> **Goal**: A `class` item type with level progression. Classes grant features at specific levels, contribute to BAB, saves, HD, and skill points.

---

## 13.1 Class Item Type

```
ClassSystemModel extends ItemSystemModelBase
├── classType: 'base' | 'prestige' | 'npc' | 'racial' | 'minion' | 'template'
├── level: number (current level in this class)
├── hd: string (hit die: 'd4' | 'd6' | 'd8' | 'd10' | 'd12')
├── bab: 'low' | 'med' | 'high'
├── saves: { fort: 'low' | 'high', ref: 'low' | 'high', will: 'low' | 'high' }
├── skillPointsPerLevel: number
├── classSkills: string[]
├── spellcasting: SpellcastingProgression | null (details in Phase 14)
├── grantedFeatures: GrantedFeature[] (reuses Grant System from Phase 12)
└── source: string
```

## 13.2 Multi-Classing

- Actor can have multiple class items
- Total character level = sum of all class levels
- BAB = sum of per-class BAB at each class's level
- Saves = sum of per-class save progressions
- HP = sum of per-class HD rolls or averages (configurable via health settings)

## 13.3 Level-Up Flow

1. Player increases a class item's level (or adds a new class at level 1)
2. System checks `grantedFeatures` for any at the new level that aren't yet granted
3. Granted features are created on the actor
4. HP increase: roll or average HD + CON mod (game setting controls which)
5. Skill points added: `skillPointsPerLevel + INT mod`
6. BAB, saves recalculated in `prepareDerivedData()`

## 13.4 Skills System (Expanded)

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

## 13.5 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/class/` — Class class, data model, sheet |
| Expand | Grant system — level-gated grants, level-down removal |
| Expand | Actor `prepareDerivedData()` — BAB, saves, HD, skill points from classes |
| Expand | Actor data model — skills with full SkillData |
| Create | `src/constants/skills.mts` — all 40+ D&D 3.5 skills |
| Modify | `system.json` — register class type |
