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
};

interface IdentifiableItemSystemData extends IdentifiableItemSystemSource {};

export type { IdentifiableItemSystemSource, IdentifiableItemSystemData };
