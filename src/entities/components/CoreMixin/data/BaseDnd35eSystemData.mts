import type { FormulaData } from '@helpers/formulae/FormulaData.mjs';

type BaseDnd35eSystemSource = {
    version: string;
    slug?: string;
    nameFormula: FormulaData;
    description: string;
};

interface BaseDnd35eSystemData extends BaseDnd35eSystemSource {}

export type {
  BaseDnd35eSystemData,
  BaseDnd35eSystemSource,
};
