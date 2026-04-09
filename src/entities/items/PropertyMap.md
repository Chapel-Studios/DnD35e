# 📘 Item Architecture Reference (Work in Progress)

A unified reference for all item components, roll‑ups, and concrete item compositions in the system.

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

    HP["HP ✅"] {
        number_D value
        number_D max
    }


    Enhancable["Enhancable 🔲"] {
        EnhancementData[] enhancements
    }

    Cursable["Cursable 🔲"] {
        boolean isCursed
        boolean isCurseActive
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

    Physical["Physical ✅"] {
        rollup Identifiable
        rollup Cursable
        rollup Illuminable
        rollup Activatable

        HP hp
        number_D hardness
        number_D quantity
        number_D weight
        boolean isCarried
        Size_D size
        PriceData_D price
        PriceData resalePrice
        PriceData brokenResalePrice
        boolean isBroken
        string containerId
        %% Derived
        number effectiveWeight
        number magicEquivalency
        string[] damageReductionTypes
    }
    Identifiable    ||--o{ Physical   : "rollup"
    Cursable        ||--o{ Physical   : "rollup"
    Illuminable     ||--o{ Physical   : "rollup"
    Activatable     ||--o{ Physical   : "rollup"
    HP              ||--o{ Physical   : "includes"

    Equippable["Equippable ✅"] {
        rollup Physical

        boolean isEquipped
        EquipSlot[] equippedSlotIds
        boolean isMelded
        Size_D designedForSize
        boolean isWeightlessWhenEquipped
    }
    Physical        ||--o{ Equippable   : "rollup"

    Equipment["Equipment 🔲"] {
        rollup BaseItem
        rollup Equippable
    }
    BaseItem        ||--o{ Equipment   : "rollup"
    Equippable      ||--o{ Equipment   : "rollup"

    ArmorStats["ArmorStats 🔲"] {
        number ac
        number dexModifierCap
        number armorCheckPenalty
        number arcaneSpellFailurePenalty
        boolean isMasterworkArmor
    }

    Armor["Armor 🔲"] {
        rollup BaseItem
        rollup Equippable
        rollup ArmorStats
    }
    BaseItem        ||--o{ Armor   : "rollup"
    Equippable      ||--o{ Armor   : "rollup"
    ArmorStats      ||--o{ Armor   : "rollup"

    WeaponDamage["WeaponDamage ✅"] {
        string_D damageRoll
        string_D damageType
        string_D critRange
        number_D critMultiplier
        number_D rangeIncrement
        string attackFormula
        string damageFormula
    }

    Weapon["Weapon ✅"] {
        rollup BaseItem
        rollup Equippable

        boolean isMasterwork
        WeaponType_D weaponType
        WeaponSubtype_D weaponSubtype
        WeaponBaseType_D weaponBaseType
        WeaponDamage weaponDamage
        string attackNotes
        string damageNotes
    }
    BaseItem        ||--o{ Weapon   : "rollup"
    Equippable      ||--o{ Weapon   : "rollup"
    WeaponDamage    ||--o{ Weapon   : "includes"

    Shield["Shield 🔲"] {
        rollup BaseItem
        rollup Equippable
        rollup ArmorStats

        boolean isMasterwork
        WeaponType_D weaponType
        WeaponSubtype_D weaponSubtype
        WeaponBaseType_D weaponBaseType
        WeaponDamage weaponDamage
        string attackNotes
        string damageNotes
    }
    BaseItem        ||--o{ Shield   : "rollup"
    Equippable      ||--o{ Shield   : "rollup"
    WeaponDamage    ||--o{ Shield   : "includes"
    ArmorStats      ||--o{ Shield   : "rollup"

    ConsumableUses["ConsumableUses 🔲"] {
        number value
        number max
        string maxFormula
        string per
    }

    Consumable["Consumable 🔲"] {
        rollup BaseItem
        rollup Physical

        ConsumableUses uses
        string consumableType
        boolean isFromSpell
        string scrollType
    }
    BaseItem        ||--o{ Consumable   : "rollup"
    Physical        ||--o{ Consumable   : "rollup"
    ConsumableUses            ||--o{ Consumable   : "includes"

    BonusAmmo["BonusAmmo 🔲"] {
        string attack
        string enhancement
        string damage
        string damageType
        string damageUid
        string attackNote
    }

    Loot["Loot 🔲"] {
        rollup BaseItem
        rollup Physical

        string subType
        BonusAmmo bonusAmmo
        boolean bagOfHoldingLike
        boolean containerCanUseItems
        number capacity
    }
    BaseItem     ||--o{ Loot : "rollup"
    Physical     ||--o{ Loot : "rollup"
    BonusAmmo ||--o{ Loot : "includes"

    NameExtension["NameExtension 🔲"] {
        string prefix
        string suffix
    }

    WeaponData["WeaponData 🔲"] {
        string damageRoll
        string damageType
        string damageTypeId
        string attackRoll
        boolean optionalDamage
        string alignment
    }

    Enhancement["Enhancement 🔲"] {
        rollup BaseItem
        rollup Activatable

        string enhancementType
        object properties
        NameExtension nameExtension

        number enh
        boolean enhIsLevel
        number enhIncreaseFormula
        string priceFormula
        number price
        number enhIncrease

        string requirements
        boolean isFromSpell
        boolean isFromBuff

        WeaponData weaponData
        string[] weaponAttackNotes
        string[] allowedTypes
    }
    BaseItem    ||--o{ Enhancement : "rollup"

    Activatable ||--o{ Enhancement : "rollup"
    NameExtension ||--o{ Enhancement : "includes"
    WeaponData    ||--o{ Enhancement : "includes"

    DamageType["DamageType 🔲"] {
        rollup BaseItem

        string damageType
        boolean isPiercing
        boolean isBludgeoning
        boolean isSlashing
        string[] identifiers
    }
    BaseItem ||--o{ DamageType : "rollup"

    Race["Race 🔲"] {
        rollup BaseItem

        string creatureType
        number levelAdjustment
        string[] subTypes
        string[] addedAbilities
        string[] disabledAbilities
    }
    BaseItem ||--o{ Race : "rollup"


    Timeline["Timeline 🔲"] {
        number elapsed
        number total
        string formula
        boolean enabled
        boolean deleteOnExpiry
        boolean tickOnEnd
    }

    DamagePool["DamagePool 🔲"] {
        number current
        number max
        string formula
        boolean enabled
        boolean deleteOnDamagePoolEmpty
    }

    Shapechange["Shapechange 🔲"] {
        object source
        string type
    }

    Buff["Buff 🔲"] {
        rollup BaseItem
        rollup Activatable
        rollup Illuminable

        string buffType
        boolean active
        number level

        Timeline timeline
        DamagePool damagePool
        Shapechange shapechange

        string[] activateActions
        string[] deactivateActions
        string[] perRoundActions

        boolean hideFromToken
    }
    BaseItem      ||--o{ Buff : "rollup"

    Activatable   ||--o{ Buff : "rollup"
    Illuminable   ||--o{ Buff : "rollup"
    Timeline    ||--o{ Buff : "includes"
    DamagePool  ||--o{ Buff : "includes"
    Shapechange ||--o{ Buff : "includes"

    Aura["Aura 🔲"] {
        rollup BaseItem

        number level
        number range
        boolean active

        string auraTarget
        string sourceTokenId
        string sourceAuraId
        string sourceActorName

        string[] perRoundActions

        boolean hideFromToken
    }
    BaseItem     ||--o{ Aura : "rollup"


    Associations["Associations 🔲"] {
        string[] classes
    }

    Metamagic["Metamagic 🔲"] {
        boolean enabled
        string shortDesc
        string code
    }

    SpellSpecSpell["SpellSpecSpell 🔲"] {
        number level
        string name
        string img
        string pack
        string id
    }

    SpellSpecialization["SpellSpecialization 🔲"] {
        boolean isDomain
        SpellSpecSpell level1
        SpellSpecSpell level2
        SpellSpecSpell level3
        SpellSpecSpell level4
        SpellSpecSpell level5
        SpellSpecSpell level6
        SpellSpecSpell level7
        SpellSpecSpell level8
        SpellSpecSpell level9
    }
    SpellSpecSpell  ||--o{ SpellSpecialization : "includes"

    Links["Links 🔲"] {
        string[] charges
    }

    Feat["Feat 🔲"] {
        rollup BaseItem
        rollup Activatable

        string featType
        string abilityType

        Associations associations

        string crOffset
        string spellSpecializationName
        string spellSpecializationForbiddenNames

        string[] linkedItems

        Metamagic metamagic
        SpellSpecialization spellSpecialization

        boolean showInQuickbar
        Links links
    }
    BaseItem     ||--o{ Feat : "rollup"
    Activatable  ||--o{ Feat : "rollup"

    Associations        ||--o{ Feat : "includes"
    Metamagic           ||--o{ Feat : "includes"
    SpellSpecialization ||--o{ Feat : "includes"
    Links               ||--o{ Feat : "includes"

    LearnedAt["LearnedAt 🔲"] {
        string[] class
        string[] domain
        string[] subDomain
        string[] elementalSchool
        string[] bloodline
    }

    SpellComponents["SpellComponents 🔲"] {
        string value
        boolean verbal
        boolean somatic
        boolean material
        boolean focus
        number divineFocus
    }

    Materials["Materials 🔲"] {
        string value
        string focus
    }

    Preparation["Preparation 🔲"] {
        number preparedAmount
        number maxAmount
        boolean autoDeductCharges
    }

    Spell["Spell 🔲"] {
        rollup BaseItem
        rollup Activatable

        LearnedAt learnedAt

        number level
        number clOffset
        number slOffset

        string school
        string subschool
        string types

        SpellComponents components

        string castTime
        string[] conditionals

        Materials materials

        boolean isSpellSpontaneousReplacement
        string spellbook

        Preparation preparation

        boolean atWill
        number powerPointsCost
        string display
        boolean isPower

        boolean sr
        boolean pr

        string shortDescription
        string snip
        string spellDuration
        string spellEffect
        string spellArea

        boolean showInQuickbar
        boolean specialPrepared
        boolean isDomainSpell
        string specialId
    }
    BaseItem    ||--o{ Spell : "rollup"
    Activatable ||--o{ Spell : "rollup"
    LearnedAt       ||--o{ Spell : "includes"
    SpellComponents ||--o{ Spell : "includes"
    Materials       ||--o{ Spell : "includes"
    Preparation     ||--o{ Spell : "includes"

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

    OriginalWeaponProperties["OriginalWeaponProperties 🔲"] {
        object value
    }

    Attack["Attack 🔲"] {
        rollup BaseItem
        rollup Activatable

        Associations associations

        string attackType
        string autoScaleOption
        string weaponSubtype

        boolean masterwork
        boolean threatRangeExtended
        boolean finesseable
        number enh
        boolean incorporeal
        boolean proficient
        boolean primaryAttack
        boolean showInQuickbar
        boolean melded

        string baseWeaponType
        boolean nonLethal

        boolean originalWeaponCreated
        string originalWeaponId
        string originalWeaponName
        string originalWeaponImg
        OriginalWeaponProperties originalWeaponProperties

        string[] conditionals

        boolean favorite
        boolean thrown
        boolean returning
        boolean magic
        boolean epic

        string alignment
    }
    BaseItem    ||--o{ Attack : "rollup"
    Activatable ||--o{ Attack : "rollup"
    Associations            ||--o{ Attack : "includes"
    OriginalWeaponProperties||--o{ Attack : "includes"

    FullAttackEntry["FullAttackEntry 🔲"] {
        number id
        string name
        string img
        boolean primary
        boolean isWeapon
        string attackMode
        string attackId
        number count
    }

    FullAttack["FullAttack 🔲"] {
        rollup BaseItem

        FullAttackEntry[] attacks

        string attackType
    }
    BaseItem ||--o{ FullAttack : "rollup"
    FullAttackEntry ||--o{ FullAttack : "includes"

    SavingThrows["SavingThrows 🔲"] {
        string fort
        string ref
        string will
    }

    FavoredClassBonuses["FavoredClassBonuses 🔲"] {
        number hp
        number skill
        number alt
    }

    LevelTable["LevelTable 🔲"] {
        number[20] levels
    }
    
    CharacterClass["CharacterClass 🔲"] {
        rollup ItemDescription

        string classType
        number levels
        number maxLevel
        number prestigeLevels
        number la
        number crPerHD

        string hdReplace
        boolean hdReplaceRacialOnly

        string[] addedAbilities
        string[] disabledAbilities

        string turnUndeadLevelFormula
        string sneakAttackGroup
        boolean automaticFeatures
        string sneakAttackFormula

        string minionGroup
        string minionLevelFormula

        string deckHandSizeFormula
        string knownCardsSizeFormula
        boolean deckPrestigeClass

        string spellcastingType
        boolean spellcastingSpontaneus

        string[] spellsPerLevel
        string[] spellsKnownPerLevel

        boolean hasSpellbook
        boolean hasLimitedSpellbook
        string[] spellbook

        string spellcastingDescription
        string spellcastingSpellname
        string spellcastingSpellnamePl

        boolean hasSpecialSlot

        string spellPointGroup
        string spellcastingAbility
        string spellslotAbility
        string spellPointBonusFormula

        LevelTable spellPointTable
        string powerPointBonusBaseAbility
        LevelTable powerPointTable

        LevelTable powersKnown
        LevelTable powersMaxLevel

        number hd
        number hp
        string bab
        number skillsPerLevel

        boolean allSpellsKnown
        boolean halfCasterLevel

        string creatureType

        SavingThrows savingThrows
        FavoredClassBonuses fc

        object classSkills
        string[] nonActiveClassAbilities
    }
    ItemDescription ||--o{ CharacterClass : "rollup"

    SavingThrows        ||--o{ CharacterClass : "includes"
    FavoredClassBonuses ||--o{ CharacterClass : "includes"
    LevelTable ||--o{ CharacterClass : "includes"
```

