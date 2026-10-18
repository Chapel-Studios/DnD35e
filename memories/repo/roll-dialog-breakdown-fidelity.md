# Roll dialog ↔ chat card breakdown fidelity (standard)

**Rule**: every roll dialog's live breakdown (AC tooltip, damage preview, etc.) and the
resulting chat card's expandable breakdown must show the **same granular line items** —
same labels, same values, same bonus-type tags, same struck-through "ignored" entries. A
chat card must never collapse a dialog's per-component breakdown into a single lumped
number. This applies to every future roll dialog/card pair too — spells, special attacks,
skills — not just the Roll Defense Dialog this was established on (poc.10 Story E).

## Mechanism (Roll Defense Dialog precedent)

- `buildOverridesModifierList()` (`src/dice/rollModifierBreakdown.mts`) builds the granular
  per-component list (Base/Size/Dex/Armor/Shield/Natural for AC) by reading a document's
  `effectOverrides[fieldPath]` stacking history — same data `HasActiveEffectsNotification`
  shows on the sheet. This granular list must be threaded all the way from dialog data →
  dialog result → the function that builds the final chat card, not re-derived from a single
  authoritative number (e.g. `target.system.defense.armorClass`).
- When a dialog has a toggle that conditionally removes/adds a single baked-in component
  (e.g. Flat-Footed denying Dex to AC), prefer authoring the condition's effect directly at
  the source via `forcedIgnoreReason` (see below) so the component's line is **always**
  present in `effectOverrides` — applied normally, or struck-through/ignored when the
  condition is active — rather than being pushed conditionally. A roll-dialog override
  checkbox then just toggles that same entry's ignored flag (`reconcileFlatFootedDexEntry()`
  in `src/dice/rollModifierBreakdown.mts`), used identically by `RollDefenseDialogStore.mts`
  (live preview) and `evaluateDefense.mts` (final resolution card) — same function, same
  result, zero drift risk. Never add a new offsetting "penalty" row that visually cancels
  out an existing line instead.
- **`forcedIgnoreReason`** (`EffectChangeDataDnd35e`, honored in `applyStackedChanges.mts`):
  authors a stacking-ignored result directly on a self-contributed change, bypassing
  `resolveActiveEffectChanges()`'s real bonus-type comparison entirely — for a
  condition-gated formula component (Dex denied by Flat-Footed) that should show
  struck-through with a reason rather than silently never being pushed. The change's
  `value` is still recorded in `effectOverrides` (for display) but never applied to the
  document. Precedent: `Creature._buildDefenseChanges()` always pushes the Dex change now,
  passing `forcedIgnoreReason` only when `denyDexToAC` is true. Because this writes to the
  same `effectOverrides[fieldPath]` every other reader uses, `HasActiveEffectsNotification`
  on the sheet shows the exact same struck-through Dex line with zero sheet-side changes.
- The authoritative **numeric** total (e.g. `effectiveAc`) is still computed from the
  resolved actor field (`target.system.defense.armorClass`) + explicit adjustments — never
  by summing the display breakdown list, since that list can carry `isIgnored` (struck-
  through, non-applied) stacking entries that must not contribute to the real total.
- `buildRawBreakdownHtml()` (`src/dice/chatCards/modifierBreakdown/modifierBreakdown.mts`)
  renders the resolution-card-style raw-value breakdown and must pass through
  `bonusTypeLabel`/`isIgnored`/`ignoredReason` exactly like `buildModifierBreakdownHtml()`
  does for the dialog's signed breakdown — don't let the two renderers drift in which
  `RollModifier` fields they honor.

## Checklist for new dialog/card pairs

1. Dialog data carries the granular breakdown list (not just a flat total).
2. Dialog result type passes that same granular list through (`RollModifier[]`).
3. The card-building function (`evaluateDefense()`-equivalent) consumes the passed-through
   list directly for its breakdown — it does not reconstruct/collapse it.
4. Any toggle that gates a single baked-in component uses a shared gating helper, called
   identically from both the dialog store and the card-building function.
5. Numeric totals are computed from authoritative resolved fields, independent of the
   display list's contents.
