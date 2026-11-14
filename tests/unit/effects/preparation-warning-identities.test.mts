import type { PreparationWarning, PreparationWarningHost } from '@documents/document/preparationWarnings.mjs';
import type { ActiveEffectDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_PHASE, EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import { evaluateChangeCondition } from '@effects/baseActiveEffect/logic/evaluateChangeCondition.mjs';
import { resolveActiveEffectChangeKey } from '@effects/baseActiveEffect/logic/resolveChangeKey.mjs';
import { resolveActiveEffectChangeValue } from '@effects/baseActiveEffect/logic/resolveChangeValue.mjs';
import { FormulaData } from '@helpers/formulae/index.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@fields/getSchemaField.mjs', () => ({ getSchemaField: () => undefined }));
vi.mock('@helpers/formulae/index.mjs', async importOriginal => ({
  ...await importOriginal<typeof import('@helpers/formulae/index.mjs')>(),
  buildDocumentDataMap: () => ({}),
}));

function fixture() {
  const item = {
    name: 'Sword', uuid: 'Item.sword', documentName: 'Item', type: 'weapon',
    _preparationWarnings: [] as PreparationWarning[],
  };
  const effect = {
    name: 'Broken effect', uuid: 'Item.sword.ActiveEffect.effect', parent: item,
    _preparationWarnings: [] as PreparationWarning[],
  };
  return { item, effect, document: effect as unknown as ActiveEffectDnd35e };
}

function change(id: string): EffectChangeDataDnd35e {
  return {
    id, key: 'system.hardness', value: '#item.missing', condition: '#item.missing',
    target: EFFECT_CHANGE_TARGET.ITEM, priority: 0, isSystem: false,
    type: EFFECT_CHANGE_TYPE.ADD, phase: EFFECT_CHANGE_PHASE.INITIAL,
  };
}

describe('ActiveEffect preparation diagnostic identities', () => {
  beforeEach(() => {
    vi.spyOn(game.i18n, 'format').mockImplementation(key => key);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(FormulaData, 'resolveSource').mockImplementation((_source, _map, _fallback, _excluded, onFailure) => {
      onFailure?.('Unresolved reference');
      return null;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('distinguishes rows and key/value/condition rules while sharing identity across hosts', () => {
    const { item, effect, document } = fixture();
    const first = change('first');
    const second = change('second');
    resolveActiveEffectChangeValue(document, first, item);
    resolveActiveEffectChangeValue(document, second, item);
    evaluateChangeCondition(first, {}, item, effect);
    resolveActiveEffectChangeKey(document, { ...first, key: '$conditional(' }, item);
    expect(effect._preparationWarnings.map(warning => warning.id)).toEqual([
      'change:first:value:formula', 'change:second:value:formula',
      'change:first:condition:formula', 'change:first:key:resolution',
    ]);
    expect(item._preparationWarnings).toEqual(effect._preparationWarnings);
    expect(effect._preparationWarnings.every(warning => warning.sourceUuid === effect.uuid)).toBe(true);

    effect._preparationWarnings = [];
    item._preparationWarnings = [];
    resolveActiveEffectChangeValue(document, { ...first, key: 'system.weight', value: '#item.otherMissing' }, item);
    expect(effect._preparationWarnings[0].id).toBe('change:first:value:formula');
    expect(game.i18n.format).toHaveBeenCalledWith('dnd35e.COMMON.PreparationWarningValueFormulaFailed', {
      formula: '#item.otherMissing', reason: 'Unresolved reference',
    });
  });

  it('identifies missing-context diagnostics separately from formula resolution failures', () => {
    const effect: PreparationWarningHost = { uuid: 'ActiveEffect.effect', _preparationWarnings: [] };
    const document = { ...effect, parent: null } as unknown as ActiveEffectDnd35e;
    resolveActiveEffectChangeValue(document, change('first'));
    evaluateChangeCondition(change('first'), undefined, effect);
    expect(effect._preparationWarnings.map(warning => warning.id)).toEqual([
      'change:first:value:context', 'change:first:condition:context',
    ]);
    expect(game.i18n.format).toHaveBeenCalledWith('dnd35e.COMMON.PreparationWarningValueContextMissing', {
      formula: '#item.missing', target: EFFECT_CHANGE_TARGET.ITEM,
    });
  });
});
