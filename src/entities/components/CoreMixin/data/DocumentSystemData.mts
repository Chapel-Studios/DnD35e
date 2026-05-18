import type { FormulaData } from '@helpers/formulae/FormulaData.mjs';

type DocumentSystemSource = {
    version: string;
    slug?: string;
    nameFormula: FormulaData;
    description: string;
};

interface DocumentSystemData extends DocumentSystemSource {}

export type {
  DocumentSystemData,
  DocumentSystemSource,
};
