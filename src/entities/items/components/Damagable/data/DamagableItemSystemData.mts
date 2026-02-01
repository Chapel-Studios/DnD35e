interface DamagableItemSystemSource {
    hp: {
        value: number;
        max: number;
    };
    hardness: number;
};

interface DamagableItemSystemData extends DamagableItemSystemSource {};

export type { DamagableItemSystemData, DamagableItemSystemSource };
