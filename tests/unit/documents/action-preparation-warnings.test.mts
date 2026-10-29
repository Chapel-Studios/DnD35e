import type { PreparationWarning } from '@documents/document/preparationWarnings.mjs';
import type { FormulaDataSource } from '@helpers/formulae/index.mjs';
import { FormulaData, FormulaField } from '@helpers/formulae/index.mjs';
import { ActionDataModel } from '@items/baseItem/actions/ActionDataModel.mjs';
import type { ActionResult } from '@items/baseItem/actions/types.mjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

class FixtureAction extends ActionDataModel {
  isTargetRequired = true;
  attackFormula: FormulaDataSource = { formula: '0', expectedType: 'rollFormula', resolvedValue: null };
  damageFormula: FormulaDataSource = { formula: '1d8', expectedType: 'rollFormula', resolvedValue: null };
  protected async _executeCheck(): Promise<ActionResult> { return { cancelled: false, warnings: [], reason: 'success' }; }
  protected async _postExecute(): Promise<void> {}
  protected async _continue(): Promise<ActionResult> { return { cancelled: false, warnings: [], reason: 'success' }; }
}

function makeAction(id = 'one', owned = true) {
  const item = {
    documentName: 'Item',
    name: 'Sword',
    uuid: 'Actor.hero.Item.sword',
    actor: owned ? { documentName: 'Actor', name: 'Hero' } : undefined,
    _preparationWarnings: [] as PreparationWarning[],
  };
  const action = new FixtureAction({});
  Object.defineProperties(action, { _id: { value: id }, parent: { value: { parent: item } } });
  return { action, item };
}

describe('shared action roll-formula preparation diagnostics (melee first)', () => {
  const validate = vi.fn();
  beforeEach(() => {
    Object.defineProperty(FixtureAction, 'schema', {
      configurable: true,
      value: { fields: {
        attackFormula: new FormulaField({ expectedType: 'rollFormula', contexts: [
          { contextName: 'Actor', resolvePath: 'item.actor', documentType: 'Actor', aliases: ['self'], fallbackSubtypes: ['character'] },
        ] }),
        damageFormula: new FormulaField({ expectedType: 'rollFormula' }),
      } },
    });
    vi.stubGlobal('Roll', { validate });
    validate.mockReset().mockReturnValue(true);
    vi.spyOn(FormulaData, 'resolveSource').mockImplementation((source, _map, _fallback, _excluded, onFailure) => {
      if (source.formula.includes('#')) {
        onFailure?.('Unresolved reference');
        return null;
      }
      return source.formula;
    });
  });

  it('accepts zero attack bonuses and valid default damage without rolling dice', () => {
    const { action, item } = makeAction();
    action.resolveFormulaFields();
    expect(item._preparationWarnings).toEqual([]);
    expect(validate.mock.calls).toEqual([['0'], ['1d8']]);
    expect(action.damageFormula.resolvedValue).toBe('1d8');
  });

  it('reports missing formulas and invalid resolved roll syntax as banner-default errors', () => {
    const { action, item } = makeAction();
    action.attackFormula.formula = ' ';
    action.damageFormula.formula = '1d8 + (';
    validate.mockReturnValue(false);
    action.resolveFormulaFields();
    expect(item._preparationWarnings).toMatchObject([
      { id: 'action:one:formula:attackFormula', severity: 'error', message: 'dnd35e.COMMON.PreparationWarningMissingFormula' },
      { id: 'action:one:formula:damageFormula', severity: 'error', message: 'dnd35e.COMMON.PreparationWarningInvalidFormula' },
    ]);
    expect(action.attackFormula.resolvedValue).toBeNull();
  });

  it('keeps stable identities across formula edits and separates actions on the same item', () => {
    const first = makeAction('one');
    first.action.attackFormula.formula = '#self.badPath';
    first.action.resolveFormulaFields();
    const original = first.item._preparationWarnings[0];
    first.item._preparationWarnings = [];
    first.action.attackFormula.formula = '#self.anotherBadPath';
    first.action.resolveFormulaFields();
    expect(first.item._preparationWarnings[0].id).toBe(original.id);
    const second = makeAction('two');
    second.action.attackFormula.formula = '#self.badPath';
    second.action.resolveFormulaFields();
    expect(second.item._preparationWarnings[0].id).not.toBe(original.id);
  });

  it('defers missing owner contexts but reports broken references when that context exists', () => {
    const unowned = makeAction('one', false);
    unowned.action.attackFormula.formula = '#self.badPath';
    unowned.action.resolveFormulaFields();
    expect(unowned.item._preparationWarnings).toEqual([]);
    const owned = makeAction();
    owned.action.attackFormula.formula = '#self.badPath';
    owned.action.resolveFormulaFields();
    expect(owned.item._preparationWarnings).toMatchObject([{ severity: 'error', message: 'Unresolved reference' }]);
  });
});
