interface IdentifiableDocumentSystemSource {
    isIdentifiable: boolean;
    unidentifiedInfo?: {
        unidentifiedName: string;
        unidentifiedDescription: string;
        unidentifiedPrice: number | null;
        isIdentified: boolean;
        unidentifiedNameFormula?: string | null;
        isUnidentifiedNameFromFormula: boolean;
    };
}

type IdentifiableDocumentSystemData = IdentifiableDocumentSystemSource;

export type {
  IdentifiableDocumentSystemData,
  IdentifiableDocumentSystemSource,
};
