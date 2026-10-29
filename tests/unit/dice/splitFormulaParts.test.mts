import { CRIT_EXEMPT_MARKER } from '@constants/critDiceMarkers.mjs';
import { splitFormulaParts } from '@source/dice/d20Formula.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class TermStub {
  constructor(
    readonly expression: string,
    readonly isDeterministic: boolean,
    readonly flavor = ''
  ) {}

  get formula(): string {
    return `${this.expression}${this.flavor ? `[${this.flavor}]` : ''}`;
  }
}

class OperatorTermStub extends TermStub {
  constructor(readonly operator: string) {
    super(operator, true);
  }

  override get formula(): string {
    return ` ${this.operator} `;
  }
}

class ParentheticalTermStub extends TermStub {
  constructor(readonly term: string, flavor = '') {
    super(`(${term})`, false, flavor);
  }
}

describe('splitFormulaParts', () => {
  const parsed = new Map<string, TermStub[]>();
  const parse = vi.fn((formula: string) => {
    const terms = parsed.get(formula);
    if (!terms) throw new Error(`Invalid formula: ${formula}`);
    return terms;
  });
  const die = (expression: string, flavor = '') => new TermStub(expression, false, flavor);
  const flat = (expression: string, flavor = '') => new TermStub(expression, true, flavor);
  const op = (operator: string) => new OperatorTermStub(operator);
  const parens = (expression: string, flavor = '') => new ParentheticalTermStub(expression, flavor);

  beforeEach(() => {
    parsed.clear();
    parse.mockClear();
    vi.stubGlobal('Roll', { parse });
    vi.stubGlobal('foundry', {
      dice: { terms: { OperatorTerm: OperatorTermStub, ParentheticalTerm: ParentheticalTermStub } },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps individual dice and flat terms, including flavors, modifiers, and zero', () => {
    parsed.set('mixed', [
      die('1d6', 'Fire'), op('+'), flat('3', 'Fire'), op('+'),
      die('2d20kh1', 'Attack'), op('+'), flat('0'), op('+'), flat('2'),
    ]);
    expect(splitFormulaParts('mixed')).toEqual({
      dice: ['1d6[Fire]', '2d20kh1[Attack]'],
      flatTerms: ['3[Fire]', '0', '2'],
    });
  });

  it('propagates a parenthetical flavor to both dice and flat terms', () => {
    parsed.set('(1d6 + 3)[Fire] + 2', [parens('1d6 + 3', 'Fire'), op('+'), flat('2')]);
    parsed.set('1d6 + 3', [die('1d6'), op('+'), flat('3')]);
    expect(splitFormulaParts('(1d6 + 3)[Fire] + 2', 'Weapon')).toEqual({
      dice: ['1d6[Fire]'],
      flatTerms: ['3[Fire]', '2[Weapon]'],
    });
  });

  it('prefers explicit inner flavors over inherited flavors and defaults', () => {
    parsed.set('outer', [parens('middle + 2', 'Outer')]);
    parsed.set('middle + 2', [parens('1d6 + 3', 'Inner'), op('+'), flat('2')]);
    parsed.set('1d6 + 3', [die('1d6', 'Explicit'), op('+'), flat('3')]);
    expect(splitFormulaParts('outer', 'Default')).toEqual({
      dice: ['1d6[Explicit]'],
      flatTerms: ['3[Inner]', '2[Outer]'],
    });
  });

  it('leaves unflavored terms unflavored through nested parentheses without a default', () => {
    parsed.set('outer', [parens('1d6 + 3')]);
    parsed.set('1d6 + 3', [die('1d6'), op('+'), flat('3')]);
    expect(splitFormulaParts('outer')).toEqual({ dice: ['1d6'], flatTerms: ['3'] });
    expect(splitFormulaParts('outer', 'Default')).toEqual({
      dice: ['1d6[Default]'], flatTerms: ['3[Default]'],
    });
  });

  it('preserves subtraction when distributing a parenthetical group', () => {
    parsed.set('subtraction', [flat('4'), op('-'), parens('1d6 - 3', 'Fire')]);
    parsed.set('1d6 - 3', [die('1d6'), op('-'), flat('3')]);
    expect(splitFormulaParts('subtraction')).toEqual({
      dice: ['-(1d6[Fire])'], flatTerms: ['4', '3[Fire]'],
    });
  });

  it('keeps multiplicative expressions intact instead of treating their factors as additive', () => {
    parsed.set('products', [
      die('1d6'), op('*'), flat('2'), op('+'),
      flat('2'), op('*'), flat('3'), op('-'), die('1d4'), op('*'), die('1d8'),
    ]);
    expect(splitFormulaParts('products')).toEqual({
      dice: ['1d6 * 2', '-(1d4 * 1d8)'], flatTerms: ['2 * 3'],
    });
  });

  it('keeps functions and pools intact and applies defaults without replacing explicit flavors', () => {
    parsed.set('compound', [
      die('floor(1d6 / 2)', 'Fire'), op('+'), flat('floor(3 / 2)'), op('+'),
      die('{1d6, 1d8}kh1'), op('+'), die('1d4', CRIT_EXEMPT_MARKER),
    ]);
    expect(splitFormulaParts('compound', 'Default')).toEqual({
      dice: ['floor(1d6 / 2)[Fire]', '{1d6, 1d8}kh1[Default]', `1d4[${CRIT_EXEMPT_MARKER}]`],
      flatTerms: ['floor(3 / 2)[Default]'],
    });
  });

  it('inherits flavor within inseparable products without replacing a factor flavor', () => {
    parsed.set('outer', [parens('1d6 * 2 + 3', 'Fire')]);
    parsed.set('1d6 * 2 + 3', [die('1d6', 'Explicit'), op('*'), flat('2'), op('+'), flat('3')]);
    expect(splitFormulaParts('outer', 'Default')).toEqual({
      dice: ['1d6[Explicit] * 2[Fire]'], flatTerms: ['3[Fire]'],
    });
  });

  it('preserves Foundry negative dice wrappers and signed numeric terms', () => {
    parsed.set('negative', [parens('1d6 * -1'), op('+'), flat('-3')]);
    parsed.set('1d6 * -1', [die('1d6'), op('*'), flat('-1')]);
    expect(splitFormulaParts('negative')).toEqual({ dice: ['1d6 * -1'], flatTerms: ['-3'] });
  });

  it('does not mutate parsed terms or merge matching dice', () => {
    const terms = [die('1d6'), op('+'), die('1d6'), op('+'), flat('3')];
    parsed.set('repeat', terms);
    expect(splitFormulaParts('repeat', 'Default')).toEqual({
      dice: ['1d6[Default]', '1d6[Default]'], flatTerms: ['3[Default]'],
    });
    expect(terms.map(term => term.formula)).toEqual(['1d6', ' + ', '1d6', ' + ', '3']);
  });

  it('returns empty arrays for blank input without invoking the parser', () => {
    expect(splitFormulaParts(' \n ')).toEqual({ dice: [], flatTerms: [] });
    expect(parse).not.toHaveBeenCalled();
  });

  it('propagates parser errors instead of returning a success-shaped fallback', () => {
    expect(() => splitFormulaParts('invalid')).toThrow('Invalid formula: invalid');
  });
});
