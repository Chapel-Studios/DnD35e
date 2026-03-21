# Phase 12: Races & Heritage

> **Status**: Not started  
> **Dependencies**: Phase 11  
> **Goal**: A `race` item type. A race grants features (feats), ability adjustments, size, speed, and racial traits via the Grant System.

---

## 12.1 Race Item Type

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

## 12.2 Grant System (First Implementation)

Needed here and reused by classes in Phase 13.

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

## 12.3 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/race/` — Race class, data model, sheet |
| Create | `src/helpers/grants.mts` — Grant system utility |
| Modify | Actor — enforce single race, apply racial data |
| Modify | `system.json` — register race type |
