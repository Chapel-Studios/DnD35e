# Post-Release Phase 9: Random Treasure Generation

| Field | Value |
|-------|-------|
| **Status** | 📄 Stub |
| **Milestone** | Post-Release |
| **Dependencies** | Phase 19 (Equipment & Loot) |
| **Goal** | Treasure generation by CR using SRD random treasure tables. |

---

## Overview

Automated treasure generation: select CR or encounter level, roll on SRD treasure tables, produce a list of coins, gems, art objects, and magic items. Items link to compendium entries where available.

---

## Open Questions

- UI — dialog, sidebar panel, or journal-based?
- Integration with encounter generator (also Post-Release)?
- Custom treasure table support for homebrew?

---

## Deferred Feature: Random-Price Items via `priceFormula`

> **Relocated from POC Phase 5 (Compendium Foundation).** The mechanism this builds on (`Dnd35eDocumentMixin._preCreate()` formula resolution) is established in Phase 1. Phase 5 doesn't need to demonstrate it — it lives here, alongside the user-facing random treasure feature it most naturally supports.

### The Scenario

A GM prepares a compendium of art objects for random treasure. When a player loots a "Fine Tapestry", the price isn't fixed — it rolls `2d6 * 100` gp to determine the value. The GM drags the item from the compendium onto a character; the price resolves on creation and stays fixed from that point forward.

### How It Works

The `price` field on `PhysicalItemSystemModel` is a `CurrencyField` (not a `FormulaField`), so price itself doesn't support formulas directly. Instead, the item uses the **`_preCreate` formula resolution** that already exists on `Dnd35eDocumentMixin`:

1. **Compendium source**: The art object's `system.price` is set to a placeholder value (e.g., `0 srd_gp`)
2. **Price formula field**: Add a `priceFormula: FormulaField` to `PhysicalItemSystemModel` that holds a dice expression like `2d6 * 100`
3. **Registration**: The item registers a `FormulaRegistration` that evaluates `priceFormula` and writes the result into `system.price`:
   ```typescript
   {
     impactedField: 'system.price',
     formulaField: 'system.priceFormula',
     evaluate: (document, contexts) => {
       const formula = document.system.priceFormula?.value?.formula;
       if (!formula) return document.system.price;
       const roll = new Roll(formula);
       roll.evaluateSync();
       return PriceData.fromNumber(roll.total);
     },
   }
   ```
4. **On creation**: `Dnd35eDocumentMixin._preCreate()` iterates `registeredFormulas`, evaluates each, and calls `this.updateSource()` — the price is rolled and persisted before the item ever hits the database
5. **Result**: The owned item on the character has a concrete price (e.g., `800 srd_gp`). The `priceFormula` stays on the item for reference but doesn't re-evaluate on updates

### Implementation Notes

- The `priceFormula` field is **optional** — most items have a fixed price and no formula
- If `priceFormula` is empty/null, `_preCreate` skips it
- `Roll.evaluateSync()` is sufficient for pure dice expressions with no context dependencies
- This does NOT require a `loot` item type — any physical item can carry a price formula. (Note: `loot` is no longer commented out in `itemTypes.mts` as of the POC reorg; only `weapon` ships in POC. A future Equipment & Loot phase introduces `loot` proper.)
- The pattern extends to any field: random weight, random HP, random quantity
- **GM workflow**: Author art objects in CSV → transform script → compendium JSON with `priceFormula: "2d6 * 100"` → build. GM drags onto character, price auto-rolls.

### Checklist

- [ ] Add optional `priceFormula: FormulaField` to `PhysicalItemSystemModel.defineSchema()` (nullable, no default formula)
- [ ] Register `FormulaRegistration` for `priceFormula → price` on `PhysicalItemSystemModel`
- [ ] Handle `Roll.evaluateSync()` in the evaluate callback with proper error handling (invalid formula → keep placeholder price, log warning)
- [ ] Author 3–5 sample art objects with price formulas: `1d6 * 10` (cheap trinket), `2d6 * 100` (fine tapestry), `3d6 * 1000` (rare gem)
- [ ] Test: Drag art object from compendium → owned item has rolled price, not formula
- [ ] Test: Two copies of same art object have different rolled prices
- [ ] Test: Item with no priceFormula creates with its fixed price unchanged

