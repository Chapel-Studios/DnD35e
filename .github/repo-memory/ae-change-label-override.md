# AE Change `label` Is a Display Override, Not Pack Content

**Verified**: 2026-10-15
**Pattern**: `EffectChangeDataDnd35e.label` (and `ActiveEffectSystemSourceDnd35e.label`) is an optional override of a change's attributed display name, read by `applyStackedChanges.mts`'s fallback chain: `change.label ?? effect.system.label ?? effect.name ?? 'Unknown Effect'`. It exists so a **system/runtime-synthesized** change can show something other than the owning ActiveEffect's own name in stacking history, `HasActiveEffectsNotification` tooltips, and `ActorSheetStore`'s effects-tab grouping.
**Applies to**: `packs/_source/**/*.json` ActiveEffect documents' `system.changes[].label`, and any script/tool that generates sample or seed AE data (dev-effects, POC actors, SRD content).
**Why it matters**: Sample/pack ActiveEffects must never set `label` — the standard authoring flow never does (a GM creating an effect by hand has no field for this), so pack content that sets it would look/behave unrealistically different from what it's meant to demonstrate. Leave `label` unset and let the AE's own `name`/`system.label` be the attribution.
**Example**: `packs/_source/dev-effects/*.json` already follow this correctly — no `changes[]` entry sets `label`.

## Related
- `src/documents/activeEffects/baseActiveEffect/logic/applyStackedChanges.mts` — the fallback chain that reads this field
- [stacking-engine-rules.md](stacking-engine-rules.md) — how the resolved attribution feeds stacking winner/loser history
