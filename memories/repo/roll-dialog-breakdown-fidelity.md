# Roll dialog ↔ chat card breakdown fidelity (standard)

**Rule**: every roll dialog's live breakdown (AC tooltip, damage preview, etc.) and the
resulting chat card's expandable breakdown must show the **same granular line items** —
same labels, same values, same bonus-type tags, same struck-through "ignored" entries. A
chat card must never collapse a dialog's per-component breakdown into a single lumped
number. This applies to every future roll dialog/card pair too — spells, special attacks,
skills — not just the Roll Defense Dialog this was established on (poc.10 Story E).

## Modifier-first roll contract

- `RollModifier.breakdown` is prepared-stat history for **display only**. Roll arithmetic
  uses the modifier's top-level `value` or `formula`; it must never calculate from raw
  Active Effect history or sum the display breakdown.
- Preserve the granular breakdown through dialog data, the dialog result, and the final
  chat card rather than collapsing it to a lumped number. The displayed history explains
  the prepared statistic; it is not an alternate source of numeric truth.
- `useRollBreakdown` retains canonical situational text and resolves it using the
  `formulaContext` and `familiarSchema` supplied by its caller. Keep the situational text
  reusable; do not bind it to a hidden/global formula context.
- Damage roll snapshots retain each entry's `exemptDiceIndices`. Never roll a collapsed
  display formula in place of the underlying per-entry snapshot: doing so loses the
  per-entry dice exemptions.

## Roll Defense Dialog precedent

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
  by summing the display breakdown list, since that list is display history and can carry
  `isIgnored` (struck-through, non-applied) entries that must not contribute to the real
  total.
- `buildRawBreakdownHtml()` (`src/dice/chatCards/modifierBreakdown/modifierBreakdown.mts`)
  renders the resolution-card-style raw-value breakdown and must pass through
  `bonusTypeLabel`/`isIgnored`/`ignoredReason` exactly like `buildModifierBreakdownHtml()`
  does for the dialog's signed breakdown — don't let the two renderers drift in which
  `RollModifier` fields they honor.

## Two-weapon-fighting choice state

- The TWF choice flag has three meaningful states: absent, `false`, or `true`. At the start
  of a turn, `resetActionEconomy` removes the flag.
- `false` spends both BAB pools; `true` spends only the selected hand's pool. Record which
  hand was spent so refunds restore the correct pool.

## Checklist for new dialog/card pairs

1. Dialog data carries the granular breakdown list (not just a flat total).
2. Dialog result type passes that same granular list through (`RollModifier[]`).
3. The card-building function (`evaluateDefense()`-equivalent) consumes the passed-through
   list directly for its breakdown — it does not reconstruct/collapse it.
4. Any toggle that gates a single baked-in component uses a shared gating helper, called
   identically from both the dialog store and the card-building function.
5. Numeric totals are computed from authoritative resolved fields, independent of the
   display list's contents.
