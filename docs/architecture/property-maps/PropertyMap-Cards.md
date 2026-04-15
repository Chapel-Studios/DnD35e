# 📘 Card Item Architecture Reference (Work in Progress)

Cards — deck-based abilities used by card-casting classes.

> **Legend**: ✅ = Implemented &nbsp;|&nbsp; 🔲 = Planned (not yet in codebase)
>
> Fields wrapped with `Dnd35eField` are marked with `🔷` — they store data as `{ value, unidentifiedValue, overrides }`, not scalars.
>
> Shared base components (BaseItem, Identifiable, Activatable, Action, etc.) are defined in [PropertyMap-Physical.md](./PropertyMap-Physical.md).

```mermaid
erDiagram

    Card["Card 🔲"] {
        rollup BaseItem
        rollup Activatable

        LearnedAt learnedAt

        number level
        number clOffset
        number slOffset

        string school
        string subschool
        string types

        string castTime
        string[] conditionals

        string deck
        string display
        string shortDescription
        string snip

        string spellDuration
        SpellDurationData spellDurationData

        string spellEffect
        string spellArea

        string state

        boolean showInQuickbar
        string specialId
    }
    BaseItem    ||--o{ Card : "rollup"
    Activatable ||--o{ Card : "rollup"
    LearnedAt         ||--o{ Card : "includes"
    SpellDurationData ||--o{ Card : "includes"
```
