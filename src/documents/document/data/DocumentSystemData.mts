import type { FormulaData } from '@helpers/formulae/FormulaData.mjs';

type DocumentSystemSource = {
    origin: {
        migrationVersion: string | null;
    };
    slug?: string;
    nameFormula: FormulaData;
    description: string;
};

interface DocumentSystemData extends DocumentSystemSource {}

export type {
  DocumentSystemData,
  DocumentSystemSource,
};
