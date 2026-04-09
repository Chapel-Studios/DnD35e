# 📘 Active Effect Architecture Reference (Work in Progress)

A unified reference for all active effect components, compositions, and concrete effect types in the system.

> **Legend**: ✅ = Implemented &nbsp;|&nbsp; 🔲 = Planned (not yet in codebase)
>
> Fields wrapped with `Dnd35eField` are marked with `🔷` — they store data as `{ value, unidentifiedValue, overrides }`, not scalars.
>
> **Note**: Material was migrated from an Item type to an Active Effect type.

```mermaid
erDiagram

    ItemDescription["ItemDescription ✅"] {
        string value
    }

    BaseDnd35eSystem["BaseDnd35eSystem ✅"] {
        ItemDescription description
        string version
        string slug
        string derivedName
        FormulaData nameFormula
    }
    ItemDescription ||--o{ BaseDnd35eSystem : "includes"

    Identifiable["Identifiable ✅"] {
        boolean isIdentifiable
        boolean isIdentified
    }

    Dnd35eEffectChangeData["Dnd35eEffectChangeData ✅"] {
        string key
        string type
        any value
        number priority
        string phase
        string target
        boolean isSystem
    }

    BaseActiveEffect["BaseActiveEffect ✅"] {
        rollup BaseDnd35eSystem

        string target
        Dnd35eEffectChangeData[] changes
    }
    BaseDnd35eSystem ||--o{ BaseActiveEffect : "rollup"
    Dnd35eEffectChangeData ||--o{ BaseActiveEffect : "includes"

    MaterialSystemStats["MaterialSystemStats ✅"] {
        PriceData_D price
        number_D magicEquivalency
        number_D hardness
        number_D bonusHp
        string[] damageReductionTypes
    }

    MaterialEffectChangeData["MaterialEffectChangeData ✅"] {
        string key
        string type
        string_or_number_or_Price value
        number priority
        string phase
        string target
        boolean isSystem
    }

    Material["Material ✅"] {
        rollup BaseActiveEffect
        rollup Identifiable
        rollup MaterialSystemStats

        MaterialEffectChangeData[] changes
        %% System-generated changes from stats
        %% price -> system.price ADD
        %% magicEquivalency -> system.magicEquivalency UPGRADE
        %% hardness -> system.hardness ADD
        %% bonusHp -> system.hp.max ADD
        %% damageReductionTypes -> system.damageReductionTypes ADD
    }
    BaseActiveEffect ||--o{ Material : "rollup"
    Identifiable ||--o{ Material : "rollup"
    MaterialSystemStats ||--o{ Material : "rollup"
    MaterialEffectChangeData ||--o{ Material : "includes"

    Enhancement["Enhancement 🔲"] {
        rollup BaseActiveEffect
        %% Planned: migrating from Item type
    }
    BaseActiveEffect ||--o{ Enhancement : "rollup"
```

## Effect Type Registry

| Type | Document Class | System Model | Sheet | Status |
|------|---------------|-------------|-------|--------|
| `base` | `ActiveEffect` (Foundry) | — | — | ✅ Built-in |
| `material` | `Material` | `MaterialSystemModel` | `MaterialSheet` | ✅ Implemented |
| `enhancement` | — | — | — | 🔲 Planned |

## Composition Chain

```
Foundry ActiveEffect
  └─ DnD35eActiveEffect (base class, custom transfer/hasItemChanges)
       └─ Dnd35eDocumentMixin (doc-level helpers)
            └─ IdentifiableDocumentMixin (isIdentifiable/isIdentified)
                 └─ Material (transfer=false, isTemporary=false)
```

## Change Target System

Each `Dnd35eEffectChangeData` has a `target` field that determines where the change applies:

| Target | Description |
|--------|-------------|
| `item` | Change applies to the parent item's system data |
| `actor` | Change transfers to and applies on the owning actor |

- `DnD35eActiveEffect.transfer` is computed: `true` if any change targets `actor`
- `Material.transfer` is overridden to always `false` (materials only modify items)

## System-Generated Changes (Material)

`MaterialSystemModel.buildChanges()` auto-generates effect changes from the material's stats fields. These are marked with `isSystem: true` and rebuilt in `prepareDerivedData()`. User-added changes (`isSystem: false`) are preserved alongside them.

| Stat Field | Change Key | Change Type | Target |
|-----------|-----------|-------------|--------|
| `price` | `system.price` | `add` | `item` |
| `magicEquivalency` | `system.magicEquivalency` | `upgrade` | `item` |
| `hardness` | `system.hardness` | `add` | `item` |
| `bonusHp` | `system.hp.max` | `add` | `item` |
| `damageReductionTypes` (each) | `system.damageReductionTypes` | `add` | `item` |
