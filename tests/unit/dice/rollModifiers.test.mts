import { buildModifiersDamageFormula } from '@source/dice/rollModifiers.mjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

class DiceTermStub {
  flavor = '';
  formula = '1d6';
}

class NumericTermStub {
  flavor = '';
  formula = '3';
}

class OperatorTermStub {
  constructor(readonly operator: string) {}
}

describe('buildModifiersDamageFormula', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps mixed situational flat damage crit-eligible and exempts only its dice', () => {
    class RollStub {
      static parse(formula: string): object[] {
        if (formula !== '1d6 + 3') throw new Error(`Unexpected formula: ${formula}`);
        return [new DiceTermStub(), new OperatorTermStub('+'), new NumericTermStub()];
      }

      terms: object[] = [];

      constructor(_formula: string) {}
    }

    vi.stubGlobal('Roll', RollStub);
    vi.stubGlobal('foundry', {
      dice: { terms: { DiceTerm: DiceTermStub, NumericTerm: NumericTermStub, OperatorTerm: OperatorTermStub } },
    });

    expect(buildModifiersDamageFormula([{
      label: 'Situational', value: 0, formula: '1d6 + 3',
    }])).toEqual({
      formula: '1d6[Situational] + 3[Situational]',
      exemptDiceIndices: [0],
    });
  });
});
