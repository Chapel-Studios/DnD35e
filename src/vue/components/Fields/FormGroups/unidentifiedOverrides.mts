/**
 * Unidentified override system for identifiable items.
 * 
 * When an item is identifiable, GMs can set different values for fields
 * when the item is unidentified. These overrides are stored in document flags.
 * 
 * Similar pattern to fieldPermissions.mts but for value overrides instead of permission overrides.
 */

/**
 * Map of field paths to their unidentified values.
 * Stored at `document.flags.dnd35e.unidentifiedOverrides`
 * Keys use encoded format (dots replaced with __) to avoid Foundry nested object issues.
 */
type UnidentifiedOverrides = Record<string, unknown>;

import { decodeFieldPath, encodeFieldPath } from './fieldPermissions.mjs';

/**
 * Flag key for unidentified overrides. Used with document.getFlag('dnd35e', key).
 */
const UNIDENTIFIED_OVERRIDES_FLAG = 'unidentifiedOverrides';

export {
  decodeFieldPath,
  encodeFieldPath,
  UNIDENTIFIED_OVERRIDES_FLAG,
};

export type {
  UnidentifiedOverrides,
};
