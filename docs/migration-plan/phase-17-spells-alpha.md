# Phase 17: Spells (Alpha)

**Status**: 📋 Outlined

> **Milestone**: Alpha
> **Dependencies**: Phase 5 (Actor Foundation), Phase 6 (Roll Formulas), Phase 9 (Action System)
> **Goal**: Minimal spell system for Paladin spellcasting. Spell item type, one spellbook, 1st-level spell slots, cast action, and a small set of 1st-level Paladin spells. RAW implementation — Paladin is a divine prepared caster with a limited spell list.

---

## 16.1 Why Spells in Alpha

The Paladin at level 5 has RAW spellcasting: 1 + CHA bonus 1st-level spell slots per day, divine prepared from the Paladin spell list. Implementing this as a true spell system (not a class feature workaround) proves the spell infrastructure early and avoids non-RAW shortcuts.

The Paladin's spell system is the simplest possible test case for spellcasting:
- One caster type (divine prepared)
- One spell level (1st)
- Small spell list
- No spontaneous casting, no arcane spell failure, no SR, no concentration
- CL = Paladin level - 3 (minimum 1), so CL 2 at Paladin level 5

Beta Phase 20 (Spells & Spellbooks Full) expands this to all caster types, all spell levels, SR, concentration, metamagic integration, and counterspelling.

---

## 16.2 Spell Item Type

```
SpellSystemModel extends ItemSystemModelBase
├── spellLevel: number                     // 0-9 (0 for cantrips/orisons)
├── school: string                         // Abjuration, Conjuration, etc.
├── subSchool: string | null               // Healing, Summoning, etc.
├── components: { verbal, somatic, material, focus, divineFocus }
├── castingTime: string                    // "1 standard action", etc.
├── range: string                          // "Touch", "Close (25ft + 5ft/2CL)", etc.
├── target: string | null                  // "One creature", etc.
├── area: string | null                    // "Burst, 50-ft radius", etc.
├── duration: string                       // "1 min./level", etc.
├── savingThrow: string | null             // "Will negates", "Fortitude half", etc.
├── spellResistance: boolean               // Yes/No (not resolved in Alpha)
├── description: string                    // Rich text
├── source: string                         // "PHB p. 204"
└── spellLists: string[]                   // ["paladin", "cleric", ...] — which class lists include this spell
```

---

## 16.3 Spellbook on Actor (Minimal)

Phase 8 defines a `spellcasting` stub on the class. This phase implements the minimal version:

```
ActorSystemModel.spellbooks: Record<string, SpellbookData>

SpellbookData:
├── classKey: string                       // "paladin"
├── castingType: "divine"                  // "divine" | "arcane" (only divine for Alpha)
├── preparationType: "prepared"            // "prepared" | "spontaneous" (only prepared for Alpha)
├── castingAbility: AbilityKey             // "wis" for Paladin
├── casterLevel: number                    // Derived: paladin level - 3, min 1
├── slots: Record<number, { max: number, used: number }>  // Per spell level
│   └── 1: { max: 2, used: 0 }            // 1 base + 1 CHA bonus (CHA 14)
├── prepared: Record<number, SpellReference[]>  // Per spell level, which spells are prepared
│   └── 1: [{ uuid: "...", name: "Bless" }]
└── knownList: "class"                     // Paladin knows entire class list, prepares from it
```

**Spell slots calculation** (Paladin, RAW):
- Base slots from class table: Paladin level 5 → 1 first-level slot
- Bonus slots from casting ability: WIS 12+ → +0 bonus 1st-level (WIS 14 → +1 bonus)
- Paladin must have WIS 11+ to cast 1st-level spells at all

---

## 16.4 Cast Action

Casting a prepared spell is an action through the Action System (Phase 9):

1. Player selects a prepared spell from the spellbook UI
2. Cast action checks: spell slot available? Components met? (Alpha: no component enforcement)
3. Spell effect resolves — type depends on the spell:
   - **Bless**: Apply buff AE to self (and allies in range — Alpha: self only)
   - **Protection from Evil**: Apply buff AE to touched target
   - **Divine Favor**: Apply buff AE to self
   - **Cure Light Wounds**: Roll 1d8 + CL healing, apply to touched target
4. Slot marked as used
5. Chat card shows: spell name, caster level, effect summary, any rolls

**Buff application**: Spells that grant bonuses create temporary Active Effects with a duration. The AE includes:
- `bonusType` for stacking resolution
- `duration` for tracking (rounds/minutes — simplified in Alpha)
- `flags.dnd35e.isSpellEffect: true` to distinguish from other AEs

---

## 16.5 Alpha Test Spells (Paladin 1st-Level)

### Bless
- **Effect**: +1 morale bonus on attack rolls and saving throws against fear effects
- **Duration**: 1 min/level (CL 2 → 2 minutes = 20 rounds)
- **Range**: 50 ft burst (Alpha: self-only for simplicity)
- **AE changes**:
  - `{ key: "system.attack.melee", mode: ADD, value: "1", bonusType: "morale" }`
  - `{ key: "system.attack.ranged", mode: ADD, value: "1", bonusType: "morale" }`
  - `{ key: "system.saves.fear", mode: ADD, value: "1", bonusType: "morale" }`
- **Stacking proof**: Collides with Aura of Courage (+4 morale) on fear saves. Engine picks +4, rejects +1. Attack bonus (+1 morale) stands alone — no other morale on attack.

### Protection from Evil
- **Effect**: +2 deflection bonus to AC, +2 resistance bonus to saves vs evil creatures
- **Duration**: 1 min/level (20 rounds at CL 2)
- **Range**: Touch
- **AE changes**:
  - `{ key: "system.ac.deflection", mode: ADD, value: "2", bonusType: "deflection" }`
  - `{ key: "system.saves.fort.misc", mode: ADD, value: "2", bonusType: "resistance" }`
  - Same for ref, will
- **What it proves**: Deflection and resistance bonus types. Touch range delivery.

### Divine Favor
- **Effect**: +1 luck bonus on attack rolls and weapon damage rolls (at CL 1-2)
- **Duration**: 1 minute
- **Range**: Self
- **AE changes**:
  - `{ key: "system.attack.melee", mode: ADD, value: "1", bonusType: "luck" }`
  - `{ key: "system.damage.melee", mode: ADD, value: "1", bonusType: "luck" }`
- **What it proves**: Luck bonus type. Self-only range. Stacks with Bless (different types on attack).

### Cure Light Wounds
- **Effect**: Heal 1d8 + CL hit points (CL 2 → 1d8+2)
- **Range**: Touch
- **No AE** — direct HP modification via healing action
- **What it proves**: Healing spell delivery. Roll + CL formula. HP modification through Action System.

---

## 16.6 Alpha Scope Limitations

What this phase does NOT implement (deferred to Beta Phase 20):
- Multiple spellbooks (Wizard/Cleric multiclass)
- Spell levels 2-9
- Arcane casting, spontaneous casting
- Spell resistance resolution
- Concentration checks
- Counterspelling
- Metamagic integration
- Domain/school specialization
- Arcane spell failure from armor
- Spells known vs spells per day (spontaneous casters)
- Area targeting for Bless (self-only in Alpha)

---

## Completion Checklist

### ❌ Not Started

**Spell Data Model:**
- [ ] Create `SpellSystemModel` extending ItemSystemModelBase
- [ ] Define schema: spellLevel, school, subSchool, components, castingTime, range, target, area, duration, savingThrow, spellResistance, spellLists
- [ ] Register spell item type in system.json
- [ ] Add to CONFIG.Item.documentClasses
- [ ] Test: Spell item creation and schema validation

**Spellbook on Actor:**
- [ ] Add `spellbooks` field to ActorSystemModel
- [ ] Implement SpellbookData schema
- [ ] Auto-create spellbook when Paladin class added to actor (triggered by class item)
- [ ] Derive caster level from Paladin level (level - 3, min 1)
- [ ] Calculate spell slots: base from class table + WIS bonus
- [ ] Test: Adding Paladin class creates spellbook with correct slots

**Spell Sheet (Vue):**
- [ ] Create SpellSheetDnd35e Vue component
- [ ] Display spell properties: level, school, components, range, duration, description
- [ ] Test: Spell sheet renders and edits

**Cast Action:**
- [ ] Implement cast action through Action System
- [ ] Check for available spell slot
- [ ] Mark slot as used on cast
- [ ] Apply spell effect (AE or direct HP modification)
- [ ] Generate chat card with spell details and rolls
- [ ] Test: Cast Bless → AE applied, slot used, chat card generated

**Alpha Spells:**
- [ ] Create Bless spell data (+1 morale attack/fear saves)
- [ ] Create Protection from Evil spell data (+2 deflection AC, +2 resistance saves)
- [ ] Create Divine Favor spell data (+1 luck attack/damage)
- [ ] Create Cure Light Wounds spell data (1d8+CL healing)
- [ ] Test: Each spell applies correct effects
- [ ] Test: Bless morale stacking collision with Aura of Courage

**Spell Slot Recovery:**
- [ ] Implement spell slot reset on rest
- [ ] Test: Long rest restores all spell slots
