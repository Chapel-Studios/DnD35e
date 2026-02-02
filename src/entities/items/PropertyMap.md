# 📘 Item Architecture Reference (Work in Progress)

A unified reference for all item components, roll‑ups, and concrete item compositions in the system.

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

    BaseItem {
        ItemOrigin origin
        ItemDescription description

        string version
        string uniqueId

        boolean isNameFromFormula
        string nameFormula

        boolean isPsionic
        boolean isEpic
    }
    ItemOrigin  ||--o{ BaseItem   : "includes"
    ItemDescription ||--o{ BaseItem   : "includes"

    UnidentifiedInfo {
        string unidentifiedName
        string unidentifiedDescription
        number unidentifiedPrice
        boolean isIdentified
        string unidentifiedNameFormula
        boolean isUnidentifiedNameFromFormula
    }

    Identifiable {
        UnidentifiedInfo unidentifiedInfo

        boolean isIdentifiable
    }
    UnidentifiedInfo||--o{ Identifiable : "rollup"

    HasMaterials {
        string[] materials
    }

    HP {
        number value
        number max
    }

    Damagable {
        HP hp
        number hardness
    }
    HP  ||--o{ Damagable   : "includes"

    HasChanges {
        ChangeFlag[] activeChanges
        %% this is actually for data not source but worth mapping out
    }
    
    GrantsChanges {
        ChangeFlag[] grantedChanges
    }

    Changes {
        rollup GrantsChanges
        rollup HasChanges
    }
    HasChanges||--o{ Changes : "rollup"
    GrantsChanges||--o{ Changes : "rollup"

    Enhancable {
        EnhancementData[] enhancements
    }

    Cursable {
        boolean isCursed
        boolean isCurseActive
    }

    Illuminable {
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

    Activation {
        number cost
        string type
    }

    Duration {
        number value
        string units
    }

    Target {
        string value
    }

    Range {
        number value
        string units
    }

    Recharge {
        boolean enabled
        string formula
        number current
    }

    Uses {
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

    MeasureTemplate {
        string type
        string size
        boolean overrideColor
        string customColor
        boolean overrideTexture
        string customTexture
    }

    DamageParts {
        string[] parts
        string[] alternativeParts
    }

    AbilityData {
        string attack
        string damage
        number damageMult
        string critRange
        number critMult
        boolean twoHandedOnly
        boolean vsTouchAc
    }

    SaveData {
        number dc
        string description
        string ability
        string type
        string dcAutoType
        string dcAutoAbility
    }

    MetamagicFeats {
        boolean maximized
        boolean empowered
        boolean enlarged
        boolean intensified
        boolean enhanced
        boolean enhancedHalf
        boolean widened
    }

    RollTableDraw {
        string formula
        string name
        string pack
        string id
    }

    Action {
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

    Activatable {
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

    Physical {
        rollup Identifiable
        rollup Damagable
        rollup HasChanges
        rollup Cursable
        rollup Illuminable
        rollup Activatable

        number bulk
        string size
        string equippedState

        number quantity
        number weight
        boolean isWeightlessInContainer
        boolean isWeightlessWhenCarried
        boolean isCarried
        number price
        number resalePrice
        number brokenResalePrice
        boolean isFullResalePrice
        string containerId
    }
    Identifiable    ||--o{ Physical   : "rollup"
    Damagable       ||--o{ Physical   : "rollup"
    HasChanges       ||--o{ Physical   : "rollup"
    Cursable       ||--o{ Physical   : "rollup"
    Illuminable       ||--o{ Physical   : "rollup"
    Activatable       ||--o{ Physical   : "rollup"

    Material {
        rollup BaseItem
        rollup Identifiable
        rollup GrantsChanges

        number priceDifference
        number magicEquivalent
        number bonusHardness
        number bonusHpPerInch
        boolean isAlchemicalSilverEquivalent
        boolean isAdamantineEquivalent
        boolean isColdIronEquivalent
    }
    BaseItem        ||--o{ Material   : "rollup"
    Identifiable    ||--o{ Material   : "rollup"
    Changes    ||--o{ Material   : "rollup"

    Equippable {
        rollup Physical
        rollup HasMaterials
        rollup Enhancable
        rollup Changes

        boolean isEquipped
        string slot
        boolean isMelded
        Size designedForSize
    }
    Physical        ||--o{ Equippable   : "rollup"
    HasMaterials    ||--o{ Equippable   : "rollup"
    Enhancable      ||--o{ Equippable   : "rollup"
    Changes      ||--o{ Equippable   : "rollup"

    Equipment {
        rollup BaseItem
        rollup Equippable
    }
    BaseItem        ||--o{ Equipment   : "rollup"
    Equippable      ||--o{ Equipment   : "rollup"

    ArmorStats {
        number ac
        number dexModifierCap
        number armorCheckPenalty
        number arcaneSpellFailurePenalty
        boolean isMasterworkArmor
    }

    Armor {
        rollup BaseItem
        rollup Equippable
        rollup ArmorStats
    }
    BaseItem        ||--o{ Armor   : "rollup"
    Equippable      ||--o{ Armor   : "rollup"
    ArmorStats      ||--o{ Armor   : "rollup"

    WeaponDamage {
        string damageRoll
        string damageType
        string critRange
        number critMultiplier
        number rangeIncrement
        string attackFormula
        string damageFormula
        string bonusVsAlignment
    }

    WeaponProperties {
        boolean Blocking
        boolean Brace
        boolean Double
        boolean Disarm
        boolean Finesse
        boolean Fragile
        boolean Grapple
        boolean Improvised
        boolean Incorporeal
        boolean Monk
        boolean NonLethal
        boolean Performance
        boolean Reach
        boolean Returning
        boolean Sunder
        boolean Thrown
        boolean Trip
    }

    WeaponStats {
        WeaponDamage weaponDamage
        WeaponProperties[] weaponProperties
        boolean isMasterworkWeapon
        string weaponType
        string weaponSubtype
        string weaponBaseType
        string attackNotes
        string damageNotes
        string damageType
    }
    WeaponDamage    ||--o{ WeaponStats   : "includes"
    WeaponProperties    ||--o{ WeaponStats   : "includes"

    Weapon {
        rollup BaseItem
        rollup Equippable
        rollup WeaponStats
    }    
    BaseItem        ||--o{ Weapon   : "rollup"
    Equippable      ||--o{ Weapon   : "rollup"
    WeaponStats    ||--o{ Weapon   : "rollup"

    Shield {
        rollup BaseItem
        rollup Equippable
        rollup WeaponStats
        rollup ArmorStats
    }
    BaseItem        ||--o{ Shield   : "rollup"
    Equippable      ||--o{ Shield   : "rollup"
    WeaponStats      ||--o{ Shield   : "rollup"
    ArmorStats      ||--o{ Shield   : "rollup"

    ConsumableUses {
        number value
        number max
        string maxFormula
        string per
    }

    Consumable {
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

    BonusAmmo {
        string attack
        string enhancement
        string damage
        string damageType
        string damageUid
        string attackNote
    }

    Loot {
        rollup BaseItem
        rollup Physical
        rollup HasMaterials

        string subType
        BonusAmmo bonusAmmo
        boolean bagOfHoldingLike
        boolean containerCanUseItems
        number capacity
    }
    BaseItem     ||--o{ Loot : "rollup"
    Physical     ||--o{ Loot : "rollup"
    HasMaterials ||--o{ Loot : "rollup"
    BonusAmmo ||--o{ Loot : "includes"

    NameExtension {
        string prefix
        string suffix
    }

    WeaponData {
        string damageRoll
        string damageType
        string damageTypeId
        string attackRoll
        boolean optionalDamage
        string alignment
    }

    Enhancement {
        rollup BaseItem
        rollup HasChanges
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
    HasChanges  ||--o{ Enhancement : "rollup"
    Activatable ||--o{ Enhancement : "rollup"
    NameExtension ||--o{ Enhancement : "includes"
    WeaponData    ||--o{ Enhancement : "includes"

    DamageType {
        rollup BaseItem

        string damageType
        boolean isPiercing
        boolean isBludgeoning
        boolean isSlashing
        string[] identifiers
    }
    BaseItem ||--o{ DamageType : "rollup"

    Race {
        rollup BaseItem
        rollup Changes

        string creatureType
        number levelAdjustment
        string[] subTypes
        string[] addedAbilities
        string[] disabledAbilities
    }
    BaseItem ||--o{ Race : "rollup"
    Changes  ||--o{ Race : "rollup"

    Timeline {
        number elapsed
        number total
        string formula
        boolean enabled
        boolean deleteOnExpiry
        boolean tickOnEnd
    }

    DamagePool {
        number current
        number max
        string formula
        boolean enabled
        boolean deleteOnDamagePoolEmpty
    }

    Shapechange {
        object source
        string type
    }

    Buff {
        rollup BaseItem
        rollup GrantsChanges
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
    GrantsChanges ||--o{ Buff : "rollup"
    Activatable   ||--o{ Buff : "rollup"
    Illuminable   ||--o{ Buff : "rollup"
    Timeline    ||--o{ Buff : "includes"
    DamagePool  ||--o{ Buff : "includes"
    Shapechange ||--o{ Buff : "includes"

    Aura {
        rollup BaseItem
        rollup GrantsChanges

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
    GrantsChanges||--o{ Aura : "rollup"

    Associations {
        string[] classes
    }

    Metamagic {
        boolean enabled
        string shortDesc
        string code
    }

    SpellSpecSpell {
        number level
        string name
        string img
        string pack
        string id
    }

    SpellSpecialization {
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

    Links {
        string[] charges
    }

    Feat {
        rollup BaseItem
        rollup Activatable
        rollup GrantsChanges

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
    GrantsChanges||--o{ Feat : "rollup"
    Associations        ||--o{ Feat : "includes"
    Metamagic           ||--o{ Feat : "includes"
    SpellSpecialization ||--o{ Feat : "includes"
    Links               ||--o{ Feat : "includes"

    LearnedAt {
        string[] class
        string[] domain
        string[] subDomain
        string[] elementalSchool
        string[] bloodline
    }

    SpellComponents {
        string value
        boolean verbal
        boolean somatic
        boolean material
        boolean focus
        number divineFocus
    }

    Materials {
        string value
        string focus
    }

    Preparation {
        number preparedAmount
        number maxAmount
        boolean autoDeductCharges
    }

    Spell {
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

    SpellDurationData {
        string units
        string value
        boolean dismissable
    }

    Card {
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

    OriginalWeaponProperties {
        object value
    }

    Attack {
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

    FullAttackEntry {
        number id
        string name
        string img
        boolean primary
        boolean isWeapon
        string attackMode
        string attackId
        number count
    }

    FullAttack {
        rollup BaseItem

        FullAttackEntry[] attacks

        string attackType
    }
    BaseItem ||--o{ FullAttack : "rollup"
    FullAttackEntry ||--o{ FullAttack : "includes"

    SavingThrows {
        string fort
        string ref
        string will
    }

    FavoredClassBonuses {
        number hp
        number skill
        number alt
    }

    LevelTable {
        number[20] levels
    }
    
    CharacterClass {
        rollup ItemDescription
        rollup Changes

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
    Changes         ||--o{ CharacterClass : "rollup"
    SavingThrows        ||--o{ CharacterClass : "includes"
    FavoredClassBonuses ||--o{ CharacterClass : "includes"
    LevelTable ||--o{ CharacterClass : "includes"
```

