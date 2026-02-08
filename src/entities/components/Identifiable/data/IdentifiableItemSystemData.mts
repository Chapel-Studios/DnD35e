interface IdentifiableItemSystemSource {
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

type IdentifiableItemSystemData = IdentifiableItemSystemSource;

export type { IdentifiableItemSystemSource, IdentifiableItemSystemData };
