import { buildDocumentDataMap, toFormulaDataObject } from '@helpers/formulae/utils.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Regression guard for derived-field formula resolution.
 *
 * `toFormulaDataObject` feeds the `self` context for name-formula resolution
 * (via `getDisplayName` → `buildDocumentDataMap`). It used to call `doc.toObject()`,
 * which returns *source* data and therefore omits derived (`persisted: false`)
 * schema fields such as `system.isBroken`. That made `#self.isBroken` resolve
 * correctly on the live doc (`_evaluateFormulaFields`) but NOT via `get name()`.
 *
 * The fix overlays the live prepared system data (`doc.system.toObject(false)`),
 * which includes derived fields with their current computed values.
 */

/** A document stub whose *source* data omits a derived field the live model exposes. */
const makeDocStub = () => ({
  documentName: 'Item',
  type: 'weapon',
  // Source data (what toObject() returns) — no derived `isBroken`.
  toObject: () => ({
    name: 'Broke Test',
    system: { quantity: 1, nameFormula: { formula: '#self.isBroken' } },
  }),
  // Live prepared model — toObject(false) includes derived fields.
  system: {
    toObject: (source?: boolean) =>
      source === false
        ? { quantity: 1, nameFormula: { formula: '#self.isBroken' }, isBroken: true }
        : { quantity: 1, nameFormula: { formula: '#self.isBroken' } },
  },
});

describe('toFormulaDataObject — derived field inclusion', () => {
  it('includes derived (persisted:false) fields omitted from source toObject()', () => {
    const data = toFormulaDataObject(makeDocStub());
    // The derived field must be present for formula resolution to substitute it.
    expect(data.system.isBroken).toBe(true);
    // Persisted fields survive too.
    expect(data.system.quantity).toBe(1);
  });

  it('preserves documentName and type for schema lookups', () => {
    const data = toFormulaDataObject(makeDocStub());
    expect(data.documentName).toBe('Item');
    expect(data.type).toBe('weapon');
  });

  it('passes through a plain POJO (no toObject) unchanged', () => {
    const pojo = { documentName: 'Item', type: 'weapon', system: { isBroken: false } };
    const data = toFormulaDataObject(pojo);
    expect(data).toBe(pojo);
    expect(data.system.isBroken).toBe(false);
  });

  it('seeds the self context with derived fields via buildDocumentDataMap', () => {
    const map = buildDocumentDataMap(makeDocStub());
    expect((map.self as unknown as {system: {isBroken: boolean}}).system.isBroken).toBe(true);
  });
});
