# Phase 4: Advanced Classes

**Status**: 📄 Stub

> **Milestone**: Beta
> **Dependencies**: alpha.2 (Classes & Level History)
> **Goal**: Class types beyond the base full-progression chassis built in alpha.2 — prestige classes, NPC classes, racial paragon classes, and any other class subtype that needs different progression, prerequisite, or grant semantics. Pulls in the long-tail of class shapes that the alpha didn't need.

This phase is a **stub** — no design work has been done yet. Below is a holding sketch of what likely belongs here. Move to 📖 Rough Sketch once design discussion begins.

---

## Likely scope

| Class subtype | Notes |
|---------------|-------|
| **Prestige classes** | Prerequisite-gated; entry checks against character state (BAB, skill ranks, feats, alignment, class features). Caster-progression "+1 level of existing class" interactions. |
| **NPC classes** | Adept, Aristocrat, Commoner, Expert, Warrior — simpler progression tables; used by alpha.5 monster-building flows. |
| **Racial paragon classes** | 3-level paragon classes from Unearthed Arcana (deferred to release/post-release if not RAW priority). |
| **Class variants / substitution levels** | One-off swap of a class feature at a specific level. Likely needs the grant system to support level-pinned overrides. |

## Open questions

- Are prestige classes a new DataModel, or do they reuse `ClassSystemModel` with a `classKind: 'prestige'` discriminator and prerequisite metadata?
- Does prerequisite checking need its own evaluator, or does it ride on the FormulaFamiliar / condition-evaluation system?
- How does "+1 caster level of existing class" surface in the level history? Likely a new grant kind alongside the alpha.2 grant taxonomy.
- NPC class tables are simpler — confirm whether alpha.5 (Natural & Special Attacks) and beta.6 (Advanced Actors) need NPC classes available before this phase, and if so move accordingly.

## Dependencies & ordering

- **Hard dep**: alpha.2 ships the base class chassis, level history, BAB/save aggregation, and grant system.
- **Soft dep**: alpha.6 (Class Features) establishes per-feature data shape that prestige classes will reuse.
- **Downstream**: beta.5 (Consumables) does not depend on this phase. Sits before consumables in the wave order purely for thematic grouping with the rest of the actor/character chain.
- **Downstream**: beta.6 (Advanced Actors) may benefit from NPC classes being available; flag this when this phase is fleshed out.

---

## Completion Checklist

### ❌ Not Started

_(Phase is a stub — no checklist items defined yet. Add when promoting to 📖 Rough Sketch.)_

---

## Related

- [alpha/phase-02-classes-level-history.md](../alpha/phase-02-classes-level-history.md) — base class chassis
- [alpha/phase-06-class-features.md](../alpha/phase-06-class-features.md) — class feature data shape
- [beta/phase-06-advanced-actors.md](phase-06-advanced-actors.md) — likely NPC-class consumer
