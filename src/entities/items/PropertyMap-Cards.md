# 📘 Card Item Architecture Reference (Work in Progress)

Cards — deck-based abilities used by card-casting classes.

> **Legend**: ✅ = Implemented &nbsp;|&nbsp; 🔲 = Planned (not yet in codebase)
>
> Fields wrapped with `Dnd35eField` are marked with `🔷` — they store data as `{ value, unidentifiedValue, overrides }`, not scalars.

```mermaid
erDiagram

    ItemOrigin {
        string originId
        string originVersion
        string originPack
    }

    ItemDescription {
        string value
    }

    BaseItem["BaseItem ✅"] {
        ItemOrigin origin
        ItemDescription description

        string version
        string slug
        string derivedName
        FormulaData nameFormula

        boolean isPsionic
        boolean isEpic
    }
    ItemOrigin  ||--o{ BaseItem   : "includes"
    ItemDescription ||--o{ BaseItem   : "includes"

    Identifiable["Identifiable ✅"] {
        boolean isIdentifiable
        boolean isIdentified
    }

    Illuminable["Illuminable 🔲"] {
        string color
        number radius
        number opacity
        number alpha
        number lightAngle
        string type
        string animationSpeed
        string animationIntensity
        string dimRadius
        boolean emitLight
    }

    Activation["Activation 🔲"] {
        number cost
        string type
    }

    Duration["Duration 🔲"] {
        number value
        string units
    }

    Target["Target 🔲"] {
        string value
    }

    Range["Range 🔲"] {
        number value
        string units
    }

    Recharge["Recharge 🔲"] {
        boolean enabled
        string formula
        number current
    }

    Uses["Uses 🔲"] {
        number value
        number max
        string per
        boolean autoDeductCharges
        boolean allowMultipleUses
        number chargesPerUse
        number maxPerUse
        string maxPerUseFormula
        string maxFormula
        string rechargeFormula
        boolean isResource
        boolean canBeLinked
    }

    MeasureTemplate["MeasureTemplate 🔲"] {
        string type
        string size
        boolean overrideColor
        string customColor
        boolean overrideTexture
        string customTexture
    }

    DamageParts["DamageParts 🔲"] {
        string[] parts
        string[] alternativeParts
    }

    AbilityData["AbilityData 🔲"] {
        string attack
        string damage
        number damageMult
        string critRange
        number critMult
        boolean twoHandedOnly
        boolean vsTouchAc
    }

    SaveData["SaveData 🔲"] {
        number dc
        string description
        string ability
        string type
        string dcAutoType
        string dcAutoAbility
    }

    MetamagicFeats["MetamagicFeats 🔲"] {
        boolean maximized
        boolean empowered
        boolean enlarged
        boolean intensified
        boolean enhanced
        boolean enhancedHalf
        boolean widened
    }

    RollTableDraw["RollTableDraw 🔲"] {
        string formula
        string name
        string pack
        string id
    }

    Action["Action 🔲"] {
        MeasureTemplate measureTemplate
        string actionType
        string attackBonus
        string critConfirmBonus
        DamageParts damage
        string[] summon
        string[] attackParts
        string autoscaleAttackParts
        string formula
        string attackCountFormula
        number maxDamageDice
        string maxDamageDiceFormula
        AbilityData ability
        SaveData save
        string baseCl
        boolean sr
        boolean pr
        MetamagicFeats metamagicFeats
        string effectNotes
        string attackNotes
        string[] specialActions
        boolean favorite
        RollTableDraw rollTableDraw
    }
    MeasureTemplate ||--o{ Action : "includes"
    DamageParts     ||--o{ Action : "includes"
    AbilityData     ||--o{ Action : "includes"
    SaveData        ||--o{ Action : "includes"
    MetamagicFeats  ||--o{ Action : "includes"
    RollTableDraw   ||--o{ Action : "includes"

    Activatable["Activatable 🔲"] {
        Action action
        Activation activation
        Duration duration
        Target target
        Range range
        Recharge recharge
        Uses uses
        boolean requiresPsionicFocus
        string linkedChargeItemId
    }
    Action           ||--o{ Activatable : "includes"
    Activation       ||--o{ Activatable : "includes"
    Duration         ||--o{ Activatable : "includes"
    Target           ||--o{ Activatable : "includes"
    Range            ||--o{ Activatable : "includes"
    Recharge         ||--o{ Activatable : "includes"
    Uses             ||--o{ Activatable : "includes"

    LearnedAt["LearnedAt 🔲"] {
        string[] class
        string[] domain
        string[] subDomain
        string[] elementalSchool
        string[] bloodline
    }

    SpellDurationData["SpellDurationData 🔲"] {
        string units
        string value
        boolean dismissable
    }

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
