# Phase 15: Psionics

> **Status**: Not started  
> **Dependencies**: Phase 14  
> **Goal**: Psionic powers as a variant of the spell system, with power points and psionic schools.

---

## 15.1 Power Item Type (or Spell Subtype)

D35E treated them the same item with an `isPsionic` flag. Keep the `isPsionic` flag approach on the item system model base and extend the spell system:

```
When isPsionic = true on a spell:
├── Uses power points instead of spell slots
├── school → psionic discipline (Clairsentience, Metacreativity, Psychokinesis, Psychometabolism, Psychoportation, Telepathy)
├── Augmentation: spend extra PP for scaling effects
├── Display: visual, auditory, mental, olfactory (instead of V/S/M)
```

## 15.2 Spellbook Extension

```
SpellbookData.spellPoints: { max: number, value: number } | null
  ← Enabled for psionic spellbooks
  ← Max PP derived from manifester level + ability mod
```

## 15.3 Files to Create/Modify

| Action | Path |
|--------|------|
| Expand | Spell data model — psionic variant fields |
| Expand | Spellbook data — power point tracking |
| Create | `src/constants/psionics.mts` — disciplines, display types |
| Expand | Actor sheet — psionic power list on spellbook tab |
