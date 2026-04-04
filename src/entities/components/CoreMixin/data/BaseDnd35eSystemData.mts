import type { Dnd35eFieldData } from '@helpers/fields/Dnd35eField.mjs';
import type { FormulaData } from '@helpers/formulae/FormulaData.mjs';

type ItemDescription = {
    value: string;
};

type BaseDnd35eSystemSource = {
    version: string;
    slug?: string;
    derivedName: string;
    nameFormula: Dnd35eFieldData<FormulaData>;
    description: ItemDescription;
};

interface BaseDnd35eSystemData extends BaseDnd35eSystemSource {}

export type {
  BaseDnd35eSystemData,
  BaseDnd35eSystemSource,
  ItemDescription,
};
