import { evaluateBooleanExpression } from '@helpers/formulae/evaluateBooleanExpression.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Story A (§7.2a, Phase 7) — boolean-typed formula grammar.
 *
 * `evaluateBooleanExpression()` operates on an already-substituted formula
 * string (all `#context.property` tokens replaced with literal values by
 * `resolveFormula()`), so these tests exercise it directly with literal
 * expressions rather than full document resolution.
 */
describe('evaluateBooleanExpression — comparison & logical grammar', () => {
  describe('comparison operators', () => {
    it('evaluates ">" true/false on both sides of the threshold', () => {
      expect(evaluateBooleanExpression('6 > 5')).toBe(true);
      expect(evaluateBooleanExpression('4 > 5')).toBe(false);
    });

    it('evaluates "<", ">=", "<="', () => {
      expect(evaluateBooleanExpression('4 < 5')).toBe(true);
      expect(evaluateBooleanExpression('5 >= 5')).toBe(true);
      expect(evaluateBooleanExpression('6 <= 5')).toBe(false);
    });

    it('evaluates "==" and "!=" for numbers and strings', () => {
      expect(evaluateBooleanExpression('5 == 5')).toBe(true);
      expect(evaluateBooleanExpression('5 != 5')).toBe(false);
      expect(evaluateBooleanExpression('Longsword == Longsword')).toBe(true);
      expect(evaluateBooleanExpression('Longsword != Dagger')).toBe(true);
    });

    it('throws when an ordering operator is used on non-numeric operands', () => {
      expect(() => evaluateBooleanExpression('Longsword > Dagger')).toThrow();
    });
  });

  describe('logical operators and grouping', () => {
    it('evaluates "&&"', () => {
      expect(evaluateBooleanExpression('true && true')).toBe(true);
      expect(evaluateBooleanExpression('true && false')).toBe(false);
    });

    it('evaluates "||"', () => {
      expect(evaluateBooleanExpression('false || true')).toBe(true);
      expect(evaluateBooleanExpression('false || false')).toBe(false);
    });

    it('evaluates unary "!"', () => {
      expect(evaluateBooleanExpression('!false')).toBe(true);
      expect(evaluateBooleanExpression('!true')).toBe(false);
    });

    it('evaluates parenthesized grouping with correct precedence', () => {
      expect(evaluateBooleanExpression('(3 > 2) && (1 == 1)')).toBe(true);
      expect(evaluateBooleanExpression('!(3 > 2) && true')).toBe(false);
      expect(evaluateBooleanExpression('2 > 1 && 1 > 5 || 3 == 3')).toBe(true);
    });

    it('evaluates the doc example: compound ability/BAB gate', () => {
      expect(evaluateBooleanExpression('2 >= 2 && 1 > 0')).toBe(true);
      expect(evaluateBooleanExpression('1 >= 2 && 1 > 0')).toBe(false);
    });
  });

  describe('arithmetic operators in comparison operands', () => {
    it('evaluates "+", "-", "*", "/" with standard precedence', () => {
      expect(evaluateBooleanExpression('2 + 3 * 4 == 14')).toBe(true);
      expect(evaluateBooleanExpression('(2 + 3) * 4 == 20')).toBe(true);
      expect(evaluateBooleanExpression('10 - 4 / 2 == 8')).toBe(true);
    });

    it('evaluates the doc example: a half-hp threshold check', () => {
      expect(evaluateBooleanExpression('20 > (100 / 2)')).toBe(false);
      expect(evaluateBooleanExpression('60 > (100 / 2)')).toBe(true);
    });

    it('evaluates unary minus', () => {
      expect(evaluateBooleanExpression('-5 < 0')).toBe(true);
      expect(evaluateBooleanExpression('5 * -1 == -5')).toBe(true);
    });

    it('tokenizes arithmetic operators without surrounding whitespace', () => {
      expect(evaluateBooleanExpression('20/2==10')).toBe(true);
      expect(evaluateBooleanExpression('5+3==8')).toBe(true);
    });

    it('throws when an arithmetic operator is used on non-numeric operands', () => {
      expect(() => evaluateBooleanExpression('Longsword + 1 == 2')).toThrow();
    });
  });

  describe('invalid expressions', () => {
    it('throws (does not silently return a value) on incomplete syntax', () => {
      expect(() => evaluateBooleanExpression('5 >')).toThrow();
      expect(() => evaluateBooleanExpression('&& true')).toThrow();
      expect(() => evaluateBooleanExpression('(true')).toThrow();
    });

    it('throws on an empty expression', () => {
      expect(() => evaluateBooleanExpression('')).toThrow();
      expect(() => evaluateBooleanExpression('   ')).toThrow();
    });
  });

  describe('quoted strings — single and double quotes both accepted', () => {
    it('accepts single- or double-quoted string literals interchangeably', () => {
      expect(evaluateBooleanExpression('"Longsword" == "Longsword"')).toBe(true);
      expect(evaluateBooleanExpression('\'Longsword\' == \'Longsword\'')).toBe(true);
      expect(evaluateBooleanExpression('"Longsword" == \'Longsword\'')).toBe(true);
      expect(evaluateBooleanExpression('"Longsword" != \'Dagger\'')).toBe(true);
    });

    it('allows a comma (or other separator-like characters) inside a quoted string', () => {
      expect(evaluateBooleanExpression('"," == ","')).toBe(true);
      expect(evaluateBooleanExpression('\',\' == \',\'')).toBe(true);
    });
  });

  describe('non-boolean condition values are coerced truthy (like a bare condition, not compared)', () => {
    it('a non-empty resolved string (bareword) is truthy', () => {
      expect(evaluateBooleanExpression('Aragorn')).toBe(true);
    });

    it('a nonzero resolved number is truthy, zero is falsy', () => {
      expect(evaluateBooleanExpression('5')).toBe(true);
      expect(evaluateBooleanExpression('0')).toBe(false);
    });

    it('a quoted empty string is falsy, a quoted non-empty string is truthy', () => {
      expect(evaluateBooleanExpression('""')).toBe(false);
      expect(evaluateBooleanExpression('"x"')).toBe(true);
    });

    it('an empty expression throws rather than silently being falsy — callers treat the throw as false', () => {
      // e.g. #self.name resolving to an empty string leaves the condition text
      // empty; resolveConditionalFormula's evaluateCondition callback catches
      // this and treats the whole when() clause as not matching.
      expect(() => evaluateBooleanExpression('')).toThrow();
    });
  });
});
