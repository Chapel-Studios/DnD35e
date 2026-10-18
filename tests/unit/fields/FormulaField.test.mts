import { describe, expect, it } from 'vitest';

/**
 * Unit tests for FormulaField's remaining AE-change surface.
 *
 * `add`/`subtract` now target the `.formula` leaf directly (see `RollFormulaStringField` + its
 * own test); FormulaField only handles the Secret-AE mask `override` path, which replaces the
 * authored `formula` text with the masked value and clears the resolved cache.
 */

const { FormulaField } = await import('@helpers/formulae/FormulaField.mjs');

function mkField(expectedType: 'string' | 'rollFormula' = 'rollFormula'): any {
  return new FormulaField({ expectedType }) as any;
}

describe('FormulaField AE change handling', () => {
  describe('_castChangeDelta', () => {
    it('casts the raw change value to a string', () => {
      expect(mkField()._castChangeDelta(42)).toBe('42');
      expect(mkField()._castChangeDelta('1d8')).toBe('1d8');
    });

    it('coerces null/undefined to an empty string', () => {
      expect(mkField()._castChangeDelta(null)).toBe('');
      expect(mkField()._castChangeDelta(undefined)).toBe('');
    });
  });

  describe('_applyChangeOverride', () => {
    it('replaces formula with the override delta and clears the resolved cache', () => {
      const result = mkField()._applyChangeOverride({ formula: '1d8', resolvedValue: '1d8' }, '2d6', {}, {});
      expect(result.formula).toBe('2d6');
      expect(result.resolvedValue).toBeNull();
    });

    it('preserves other fields on the current value', () => {
      const result = mkField()._applyChangeOverride({ formula: '1d8', expectedType: 'rollFormula' }, '2d6', {}, {});
      expect(result.expectedType).toBe('rollFormula');
    });

    it('treats a null current value as an empty base', () => {
      const result = mkField()._applyChangeOverride(null, 'Longsword', {}, {});
      expect(result.formula).toBe('Longsword');
      expect(result.resolvedValue).toBeNull();
    });
  });
});
