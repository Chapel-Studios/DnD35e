# Phase 14: Spells & Spellbooks

> **Status**: Not started  
> **Dependencies**: Phase 4, Phase 9  
> **Goal**: A `spell` item type for individual spells, with a spellbook system on the actor.

---

## 14.1 Spell Item Type

```
SpellSystemModel extends ItemSystemModelBase
├── level: number (0-9)
├── school: SpellSchool
├── subschool: string | null
├── components: { verbal, somatic, material, focus, divineFocus }
├── castingTime: string
├── range: string
├── area/effect/target: string | null
├── duration: string
├── savingThrow: { type, harmless, dc: formula }
├── spellResistance: boolean
├── descriptors: string[]
├── damage: { formula, type } | null
├── healing: { formula } | null
├── spellbook: 'primary' | 'secondary' | 'tertiary' | 'spelllike'
├── prepared: boolean
└── source: string
```

## 14.2 Spellbook on Actor

```
SpellbookData:
├── enabled: boolean
├── castingType: 'prepared' | 'spontaneous' | 'hybrid'
├── ability: AbilityKey
├── casterLevel: number | formula
├── baseDC: formula
├── concentration: formula
├── slots: { [level: 0-9]: { max, value } }
├── class: string | null
└── spellPoints: null (reserved for Phase 15 psionics)
```

## 14.3 Casting Flow

1. Check: spell prepared / known + slot available
2. Consume spell slot
3. Roll attack if applicable
4. Roll damage/healing if applicable
5. Target saving throws
6. Post chat card
7. Apply effects to targets

*Note: Spell casting will eventually become an Action (Phase 18), but for now it's a method on the spell item.*

## 14.4 Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `src/entities/items/spell/` — class, data model, sheet |
| Expand | Actor data model — spellbook fields |
| Create | Vue spell sheet + spellbook tab on actor sheet |
| Modify | `system.json` — register spell type |
