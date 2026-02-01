// * -------------------------------------------------
// Grant system is for tracking, let's hold off on that until we're ready to integrate that feature
//
// type ItemGrantDeleteAction = 'cascade' | 'detach' | 'restrict';

// interface ItemGrantSource {
//     /** The ID of a granting or granted item */
//     id: string;
//     /** The action taken when the user attempts to delete the item referenced by `id` */
//     onDelete?: ItemGrantDeleteAction;
// };

// interface ItemGranterSource extends ItemGrantSource {
//     /** Is this granted item visually nested under its granter: only applies to feats and features */
//     nested?: boolean | null;
// };

// // interface ItemGranterData extends Required<ItemGranterSource> {};

// type ItemGrantData = Required<ItemGrantSource>;
// * -----------------------------------------------------

interface ItemOrigin {
    originId: string;
    originVersion: string;
    originPack: string;
};

interface ItemDescription {
    value: string;
};

// whats actually stored in the DB
interface ItemSystemSource {
    version: string;
    uniqueId?: string;
    origin?: ItemOrigin;
    // Name
    isNameFromFormula: boolean;
    nameFormula?: string | null;
    // Description
    description: ItemDescription;
    isPsionic: boolean;
    isEpic: boolean;
};

// This is ItemSystemSource after going through the ItemSystemModel.prepareDerivedData() process
interface ItemSystemData extends ItemSystemSource {};

export type {
  ItemSystemSource,
  ItemSystemData,
};