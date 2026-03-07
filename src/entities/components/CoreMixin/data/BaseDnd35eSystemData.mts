import type { FormulaFieldData } from '@helpers/formulae/types.mjs';

type ItemDescription = {
    value: string;
};

type BaseDnd35eSystemData = {
    version: string;
    uniqueId?: string;
    derivedName: string;
    nameFormula?: FormulaFieldData | null;
    description: ItemDescription;
};

export type {
  BaseDnd35eSystemData,
  ItemDescription,
};
