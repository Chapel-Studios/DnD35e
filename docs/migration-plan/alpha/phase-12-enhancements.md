# Alpha Phase 12: Enhancement

**Status**: 📋 Outlined

> **Milestone**: Alpha
> **Dependencies**: poc.1 (Weapon), poc.2 (Active Effect on Item — Material)
> **Goal**: Minimal +1 longsword implementation. One enhancement AE on a weapon providing +1 enhancement bonus to attack and damage. Proves the enhancement bonus type exists and stacks correctly.

---

## 17.1 Why Enhancement in Alpha

The Paladin's primary weapon is a +1 longsword. Enhancement bonuses are a distinct bonus type in the stacking engine — they use highest-wins resolution. Having a +1 enhancement in Alpha proves:
1. Enhancement bonus type works in the stacking engine
2. AE on weapon transfers to actor (attack/damage bonuses)
3. Sets up the Beta proof: Magic Weapon spell (+1 enhancement) doesn't stack with existing +1 weapon enhancement — the engine correctly identifies the collision and picks the higher (or equal) value

---

## 17.2 Minimal EnhancementSystemModel

```
EnhancementSystemModel extends ActiveEffectSystemModel
├── enhancementBonus: number                // +1 through +5
├── targetType: "weapon" | "armor" | "shield"  // What this enhances
└── specialAbilities: string[]              // Empty for Alpha
```

For Alpha, only `weapon` target type and `enhancementBonus: 1` are implemented.

### AE Changes Generated

A +1 weapon enhancement generates two AE changes:
```typescript
changes: [
  { key: "system.attack.melee", mode: ADD, value: "1", bonusType: "enhancement" },
  { key: "system.damage.melee", mode: ADD, value: "1", bonusType: "enhancement" },
]
```

These transfer from the weapon item to the actor via `transfer: true`.

---

## 17.3 Stacking Behavior

**Alpha**: The +1 enhancement is the only enhancement bonus on attack/damage, so it applies without collision. The stacking engine logs it as "enhancement +1 (Longsword +1)" in stacking history.

**Beta proof-of-concept** (Phase 25 Enhancements Full): When a wizard casts Magic Weapon (+1 enhancement) on the Paladin's already-+1 longsword:
- Weapon has: +1 enhancement (permanent)
- Spell grants: +1 enhancement (temporary AE)
- Stacking engine: same bonus type, same value → no additional benefit
- Chat card: "Magic Weapon (+1 enhancement) — already matched by Longsword +1 (+1 enhancement)"

This is a key RAW stacking rule: enhancement bonuses from different sources don't stack, the higher wins.

---

## 17.4 Alpha Scope Limitations

What this phase does NOT implement (deferred to Beta Phase 25):
- +2 through +5 enhancement bonuses
- Special weapon abilities (flaming, keen, vorpal, etc.)
- Armor and shield enhancements
- Enhancement UI/editing on the item sheet
- Cursed items
- Enhancement pricing and market value
- Magic Weapon / Greater Magic Weapon spell interaction

---

## Completion Checklist

### ❌ Not Started

**Enhancement AE Type:**
- [ ] Create `EnhancementSystemModel` extending AE base
- [ ] Define schema: enhancementBonus (NumberField, 1-5), targetType, specialAbilities
- [ ] Register enhancement AE subtype
- [ ] Test: Enhancement AE creation with schema validation

**+1 Longsword:**
- [ ] Create +1 longsword weapon with enhancement AE embedded
- [ ] Enhancement AE generates attack/damage changes with enhancement bonus type
- [ ] Verify `transfer: true` propagates changes to actor
- [ ] Test: Actor with +1 longsword gets +1 enhancement to attack and damage
- [ ] Test: Stacking history shows enhancement source

**Stacking Engine Verification:**
- [ ] Verify enhancement bonus type registered in stacking engine
- [ ] Verify highest-wins resolution for enhancement type
- [ ] Test: Two enhancement sources → only higher applies
- [ ] Test: Chat card shows stacking breakdown with enhancement bonus
