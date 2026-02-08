type ItemDescription = {
    value: string;
};

type BaseDnd35eSystemData = {
    version: string;
    uniqueId?: string;
    // Name
    isNameFromFormula: boolean;
    nameFormula?: string | null;
    description: ItemDescription;
};

export type {
  BaseDnd35eSystemData,
  ItemDescription,
};
