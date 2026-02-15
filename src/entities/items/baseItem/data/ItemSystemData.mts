// * -------------------------------------------------
// Grant system is for tracking, let's hold off on that until we're ready to integrate that feature
//
// type ItemGrantDeleteAction = 'cascade' | 'detach' | 'restrict';

import { BaseDnd35eSystemData } from '@ec/CoreMixin/index.mjs';


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
}

// whats actually stored in the DB
interface ItemSystemSource extends BaseDnd35eSystemData {
    origin?: ItemOrigin;
    isPsionic: boolean;
    isEpic: boolean;
}

// This is ItemSystemSource after going through the ItemSystemModel.prepareDerivedData() process
type ItemSystemData = ItemSystemSource;

export type {
  ItemSystemSource,
  ItemSystemData,
};
