import type { FormulaData } from '@helpers/formulae/FormulaData.mjs';

type ItemDescription = {
    value: string;
};

type BaseDnd35eSystemSource = {
    version: string;
    slug?: string;
    derivedName: string;
    nameFormula: FormulaData | null;
    description: ItemDescription;
};

interface BaseDnd35eSystemData extends BaseDnd35eSystemSource {}

export type {
  BaseDnd35eSystemData,
  BaseDnd35eSystemSource,
  ItemDescription,
};
