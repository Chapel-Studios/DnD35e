import { describe, expect, it } from 'vitest';

/**
 * Unit tests for RollFormulaStringField's AE Add/Subtract change handling
 * (src/helpers/formulae/rollFormulaStringField.mts).
 *
 * AE `add`/`subtract` changes target a FormulaData's `.formula` leaf directly (e.g. a +2 weapon
 * enhancement targeting `system.actions.0.damageFormula.formula`). The leaf string survives core's
 * `setProperty()` write-back, unlike assigning a value to the parent `FormulaField` (an
 * `EmbeddedDataField`), which Foundry re-casts from `_source` and drops.
 *
 * For `rollFormula`-typed formulas the join is signed/spaced (`$scaleDamage(1d8)` + `2` ->
 * `$scaleDamage(1d8) + 2`, never the un-computable `$scaleDamage(1d8)2`); other expected types
 * (e.g. a `string` `nameFormula`) keep plain concatenation. The owning FormulaData's `expectedType`
 * is read back from the host model via the change's parent path.
 */

const { RollFormulaStringField } = await import('@helpers/formulae/rollFormulaStringField.mjs');

function mkField(): any {
  return new RollFormulaStringField({ blank: true, initial: '' }) as any;
}

/** Host model shaped so `getProperty(model, 'system.x')` resolves to a FormulaData-like node. */
function mkModel(expectedType: string): any {
  return { system: { x: { expectedType } } };
}

const key = 'system.x.formula';

describe('RollFormulaStringField AE change handling', () => {
  describe('_applyChangeAdd', () => {
    it('signed-joins onto a rollFormula base (no un-computable concatenation)', () => {
      const result = mkField()._applyChangeAdd('$scaleDamage(1d8)', '2', mkModel('rollFormula'), { key, value: '2' });
      expect(result).toBe('$scaleDamage(1d8) + 2');
    });

    it('joins a negative delta with " - " for rollFormula', () => {
      const result = mkField()._applyChangeAdd('1d8', '-2', mkModel('rollFormula'), { key, value: '-2' });
      expect(result).toBe('1d8 - 2');
    });

    it('starts fresh (no leading operator) when the base is blank', () => {
      expect(mkField()._applyChangeAdd('', '2', mkModel('rollFormula'), { key, value: '2' })).toBe('2');
    });

    it('is a no-op for a blank/zero delta', () => {
      expect(mkField()._applyChangeAdd('1d8', '0', mkModel('rollFormula'), { key, value: '0' })).toBe('1d8');
      expect(mkField()._applyChangeAdd('1d8', '', mkModel('rollFormula'), { key, value: '' })).toBe('1d8');
    });

    it('plain-concatenates for a string-typed formula (e.g. nameFormula)', () => {
      const result = mkField()._applyChangeAdd('Longsword', ' of Flame', mkModel('string'), { key, value: ' of Flame' });
      expect(result).toBe('Longsword of Flame');
    });
  });

  describe('_applyChangeSubtract', () => {
    it('signed-negated-joins onto a rollFormula base', () => {
      const result = mkField()._applyChangeSubtract('1d8', '2', mkModel('rollFormula'), { key, value: '2' });
      expect(result).toBe('1d8 - 2');
    });

    it('is a no-op for a string-typed formula (no subtract semantics)', () => {
      const result = mkField()._applyChangeSubtract('Longsword', 'x', mkModel('string'), { key, value: 'x' });
      expect(result).toBe('Longsword');
    });
  });
});
