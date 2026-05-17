# Alpha Phase 6: Class Features (Alpha)

**Status**: 📋 Outlined

> **Milestone**: Alpha
> **Dependencies**: Phase 8 (Classes & Level History), Phase 9 (Action System)
> **Goal**: Implement the Paladin's class features to prove the class feature → action system → AE generation pipeline. Each feature exercises a different engine capability: passive AE, per-day action, healing action, and morale bonus stacking.

---

## 12.1 Why a Separate Phase

Phase 8 (Classes) builds the **progression** infrastructure — BAB, saves, HD, skills, level-up, grant schedule. Class features are **what the progression grants** — they use the Action System (Phase 9) and AE Generator pattern (Phase 2) to produce gameplay effects. Separating them keeps Phase 8 focused on the ledger mechanics and lets this phase focus purely on "class feature items that do things."

---

## 12.2 Paladin Class Features (Level 5)

### Divine Grace (Level 2)
**Type**: Passive AE from class feature item
**Effect**: Add Charisma modifier as an untyped bonus to all saving throws
**Implementation**:
- Granted via Phase 8 grant schedule at Paladin level 2
- Class feature item generates AE changes in `prepareDerivedData()`:
  - `{ key: "system.saves.fort.misc", mode: ADD, value: "@abilities.cha.mod", bonusType: "untyped" }`
  - Same for `ref` and `will`
- Untyped → always stacks with everything
**What it proves**: Derived stat interaction — one ability score modifier applied to a different stat category via AE. Formula reference in AE value field.

### Smite Evil (Level 1)
**Type**: Per-day action (uses: { max: "@abilities.cha.mod", per: "day", min: 1 })
**Effect**: On next melee attack, add CHA to attack and Paladin level to damage vs evil target
**Implementation**:
- Granted via grant schedule at Paladin level 1
- Class feature item with `canGrantActions: true`
- Generates an action: standard melee attack with bonus changes
  - Attack: `{ key: "system.attack.melee", mode: ADD, value: "@abilities.cha.mod", bonusType: "untyped" }`
  - Damage: `{ key: "system.damage.melee", mode: ADD, value: "@classes.paladin.level", bonusType: "untyped" }`
- Uses per day: 1 at level 1-4, CHA-based at higher levels (for level 5: 1/day base)
- PreRollDialog: "Activate Smite Evil?" checkbox when attacking
- Chat card annotation: "Smite Evil: +CHA attack, +level damage"
**What it proves**: Per-day resource tracking on class features. Action modification via PreRollDialog toggle. CHA and level formula references.

### Lay on Hands (Level 2)
**Type**: Per-day healing action (pool: Paladin level × CHA modifier HP/day)
**Effect**: Touch to heal (or harm undead) using a daily HP pool
**Implementation**:
- Granted via grant schedule at Paladin level 2
- Daily pool: `@classes.paladin.level * @abilities.cha.mod` total HP
- Each use heals any amount up to remaining pool
- Action type: standard action, touch range
- Healing action creates a chat card showing HP restored and remaining pool
**What it proves**: Pool-based resource (not slot-based). Healing action type through Action System. Touch delivery.

### Aura of Courage (Level 3)
**Type**: Passive AE — self-only in Alpha, allies within 10ft in Beta (Phase 24)
**Effect**: +4 morale bonus on saving throws against fear effects
**Implementation**:
- Granted via grant schedule at Paladin level 3
- Class feature item generates AE change:
  - `{ key: "system.saves.fear", mode: ADD, value: "4", bonusType: "morale" }`
- Alpha scope: self-only (no aura radius mechanic needed)
- Beta Phase 24 (Area Effects & Auras) extends this to affect allies within 10ft
**What it proves**: Morale bonus type on saves. Sets up the critical stacking collision with Bless (+1 morale) — the stacking engine must pick +4 and reject +1 on the same save.

---

## 12.3 Stacking Proof: Aura of Courage vs Bless

The Alpha exit criteria require demonstrating same-type bonus collision. With both Aura of Courage and Bless active on the Paladin:

**Save vs fear (e.g., Dragon's Frightful Presence)**:
- +4 morale (Aura of Courage) — **APPLIED** (higher)
- +1 morale (Bless, from Phase 16) — **REJECTED** (same type, lower)
- Chat card shows: "Bless (+1 morale) — suppressed by Aura of Courage (+4 morale)"

**Attack roll under Bless + Divine Favor**:
- +1 morale (Bless) — **APPLIED** (only morale on attack)
- +1 luck (Divine Favor) — **APPLIED** (different type)
- Both appear in chat card stacking breakdown

This proves the stacking engine resolves per-field, not per-source.

---

## 12.4 Class Feature Item Pattern

All Paladin features follow the same item pattern — they're feat-like items granted by the class:

```
ClassFeatureSystemModel extends FeatSystemModel
  // Inherits featType, activation, uses, prerequisites
  // featType = 'classFeat'
  // grantedBy provenance tracks which class/level granted it
```

Class features reuse the Feat infrastructure (Phase 10) with `featType: 'classFeat'`. No new item type — just a subtype of feat. This means Phase 10 must precede or run concurrently with Phase 12.

---

## 12.5 Dependency on Phase 10 (Feats)

Phase 10 builds the Feat item type and the three archetypes (passive, toggle, trigger). Phase 12 reuses that infrastructure:
- Divine Grace = passive feat (like Weapon Focus)
- Smite Evil = toggle feat with per-day uses (like Power Attack but with resource tracking)
- Lay on Hands = activated feat with pool resource (new pattern, extends uses system)
- Aura of Courage = passive feat (like Weapon Focus, but morale typed)

Phase 12 adds the per-day pool pattern (Lay on Hands) that doesn't exist in Phase 10's three archetypes. This is a fourth archetype: **pool-based activated feature**.

---

## Completion Checklist

### ❌ Not Started

**Class Feature Infrastructure:**
- [ ] Verify FeatSystemModel supports `featType: 'classFeat'` (should be in Phase 10)
- [ ] Verify grant schedule can instantiate class feature items with `grantedBy` provenance
- [ ] Implement pool-based resource pattern: `uses: { value, max: formula, per: "day", isPool: true }`
- [ ] Test: Class feature item created with classFeat type

**Divine Grace:**
- [ ] Create Divine Grace class feature item (passive, no activation)
- [ ] Generate AE changes: CHA mod to all three saves, untyped bonus
- [ ] Verify formula reference `@abilities.cha.mod` resolves correctly in AE value
- [ ] Test: Paladin with CHA 14 gets +2 to all saves from Divine Grace
- [ ] Test: Changing CHA score updates save bonus

**Smite Evil:**
- [ ] Create Smite Evil class feature item (standard action, 1/day at level 5)
- [ ] Implement per-day use tracking with rest reset
- [ ] Integrate with PreRollDialog: "Activate Smite Evil?" toggle on melee attack
- [ ] When active: add CHA to attack, paladin level to damage (untyped)
- [ ] Chat card shows Smite Evil activation and bonus breakdown
- [ ] Test: Use Smite Evil, verify attack/damage bonuses
- [ ] Test: Use limit enforced (1/day)
- [ ] Test: Long rest resets uses

**Lay on Hands:**
- [ ] Create Lay on Hands class feature item (standard action, touch range)
- [ ] Implement HP pool: paladin level × CHA mod per day
- [ ] Healing action: prompt for amount, deduct from pool
- [ ] Chat card shows healing amount and remaining pool
- [ ] Test: Heal ally, verify HP change and pool deduction
- [ ] Test: Cannot exceed remaining pool
- [ ] Test: Long rest resets pool

**Aura of Courage:**
- [ ] Create Aura of Courage class feature item (passive, level 3)
- [ ] Generate AE change: +4 morale to saves vs fear
- [ ] Verify morale bonus type registered and stacking engine handles it
- [ ] Test: Paladin gets +4 morale on fear saves
- [ ] Test: Stacking with Bless (+1 morale): engine picks +4, rejects +1
- [ ] Test: Chat card shows rejection reason
