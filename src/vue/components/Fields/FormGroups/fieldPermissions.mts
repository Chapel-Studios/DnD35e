/**
 * Field permission types for FormGroup visibility and editability controls.
 * 
 * These allow GMs to override the default visibility and editability of individual
 * form fields on a per-document basis, stored in document flags.
 */

/**
 * Who can see a field.
 * - 'everyone': All users can see (default)
 * - 'ownerPlus': Only owners and GMs can see
 * - 'gmOnly': Only GMs can see
 */
type FieldVisibility = 'everyone' | 'ownerPlus' | 'gmOnly';

/**
 * Who can edit a field.
 * - 'normal': Anyone with document edit permission
 * - 'gmOnly': Only GMs can edit
 */
type FieldEditability = 'normal' | 'gmOnly';

/**
 * Override settings for a single field, stored in document flags.
 */
interface FieldOverride {
  visibility?: FieldVisibility;
  editability?: FieldEditability;
}

/**
 * Map of field paths to their override settings.
 * Stored at `document.flags.dnd35e.fieldOverrides`
 */
type FieldOverrides = Record<string, FieldOverride>;

/**
 * Flag path where field overrides are stored on documents.
 */
const FIELD_OVERRIDES_FLAG_PATH = 'flags.dnd35e.fieldOverrides';

export {
  FIELD_OVERRIDES_FLAG_PATH,
};

export type {
  FieldEditability,
  FieldOverride,
  FieldOverrides,
  FieldVisibility,
};
