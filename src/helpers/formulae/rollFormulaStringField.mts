import type { EffectChangeData } from '@common/documents/active-effect.mjs';

const { StringField } = foundry.data.fields;

/**
 * Joins `term` onto `base` as a properly separated/signed roll-formula term (e.g.
 * `appendRollFormulaTerm('1d8', '2')` -> `'1d8 + 2'`, never the un-computable `'1d82'`).
 * `negate` flips the term's own sign (used by AE Subtract). A blank `base` starts fresh
 * without a leading operator; a blank/zero `term` is a no-op.
 */
function appendRollFormulaTerm(base: string, term: string, negate = false): string {
  const trimmed = term.trim();
  if (!trimmed || trimmed === '0') return base;
  const negative = negate !== trimmed.startsWith('-');
  const unsigned = trimmed.startsWith('-') || trimmed.startsWith('+')
    ? trimmed.slice(1).trim()
    : trimmed;

  if (!base.trim()) {
    return negative
      ? `-${unsigned}`
      : unsigned;
  }

  const sign = negative ? '-' : '+';
  return `${base} ${sign} ${unsigned}`;
}

/**
 * A `StringField` for `FormulaData.formula` that AE `add`/`subtract` changes target **directly**
 * at the leaf path (`system.actions.0.attackFormula.formula`), not the parent `FormulaField`.
 *
 * The leaf is a terminal string, so core's `setProperty()` write-back lands and survives — unlike
 * assigning a POJO to the parent `FormulaField` (an `EmbeddedDataField`), which Foundry re-casts
 * back into a fresh `FormulaData` from `_source`, dropping the written value.
 *
 * For `rollFormula`-typed formulas the add/subtract is roll-aware (`appendRollFormulaTerm`, so
 * `$scaleDamage(1d8)` + `2` -> `$scaleDamage(1d8) + 2`, never the un-computable `$scaleDamage(1d8)2`);
 * other expected types (e.g. a `string` `nameFormula`) keep plain concatenation. The owning
 * `FormulaData`'s `expectedType` is read back from the model via the change's parent path, since
 * `DataField#applyChange` is handed the host Document as `model`, not the sibling-bearing `FormulaData`.
 */
class RollFormulaStringField extends StringField {
  private _isRollFormula(model: foundry.abstract.DataModel, change: EffectChangeData): boolean {
    const key = change?.key;
    if (typeof key !== 'string' || !key.endsWith('.formula')) return false;
    // `change.key` is Document-rooted (`system.actions.0.attackFormula.formula`); `getProperty`
    // walks it from the host Document to the parent `FormulaData` to read its `expectedType`.
    const parentPath = key.slice(0, -'.formula'.length);
    const parent = foundry.utils.getProperty(model, parentPath) as { expectedType?: unknown } | undefined;
    return parent?.expectedType === 'rollFormula';
  }

  override _applyChangeAdd(value: unknown, delta: unknown, model: foundry.abstract.DataModel, change: EffectChangeData): string {
    const base = (value as string | null | undefined) ?? '';
    return this._isRollFormula(model, change)
      ? appendRollFormulaTerm(base, String(delta))
      : base + String(delta);
  }

  override _applyChangeSubtract(value: unknown, delta: unknown, model: foundry.abstract.DataModel, change: EffectChangeData): string {
    const base = (value as string | null | undefined) ?? '';
    return this._isRollFormula(model, change)
      ? appendRollFormulaTerm(base, String(delta), true)
      : base;
  }
}

export { appendRollFormulaTerm, RollFormulaStringField };
