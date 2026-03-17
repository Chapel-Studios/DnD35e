/**
 * Field permission types for FormGroup visibility and editability controls.
 * 
 * These allow GMs to override the default visibility and editability of individual
 * form fields on a per-document basis, stored in document flags.
 */

// ============================================================================
// Field Visibility
// ============================================================================

/** All users can see (default) */
const everyoneVisibility = 'everyone';
type EveryoneVisibility = typeof everyoneVisibility;

/** Only owners and GMs can see */
const ownerPlusVisibility = 'ownerPlus';
type OwnerPlusVisibility = typeof ownerPlusVisibility;

/** Only GMs can see */
const gmOnlyVisibility = 'gmOnly';
type GmOnlyVisibility = typeof gmOnlyVisibility;

const FIELD_VISIBILITIES = {
  everyone: everyoneVisibility,
  ownerPlus: ownerPlusVisibility,
  gmOnly: gmOnlyVisibility,
} as const;

/** Who can see a field */
type FieldVisibility = EveryoneVisibility | OwnerPlusVisibility | GmOnlyVisibility;

// ============================================================================
// Field Editability
// ============================================================================

/** Anyone with document edit permission (default) */
const normalEditability = 'normal';
type NormalEditability = typeof normalEditability;

/** Only GMs can edit */
const gmOnlyEditability = 'gmOnly';
type GmOnlyEditability = typeof gmOnlyEditability;

const FIELD_EDITABILITIES = {
  normal: normalEditability,
  gmOnly: gmOnlyEditability,
} as const;

/** Who can edit a field */
type FieldEditability = NormalEditability | GmOnlyEditability;

// ============================================================================
// Field Override Storage
// ============================================================================

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
 * Keys use encoded format (dots replaced with __) to avoid Foundry nested object issues.
 */
type FieldOverrides = Record<string, FieldOverride>;

/**
 * Flag key for field overrides. Used with document.getFlag('dnd35e', key).
 */
const FIELD_OVERRIDES_FLAG = 'fieldOverrides';

/**
 * Encode a field path for storage as a flag key.
 * Replaces dots with __ to avoid Foundry interpreting them as nested paths.
 */
const encodeFieldPath = (fieldPath: string): string => fieldPath.replace(/\./g, '__');

/**
 * Decode a stored flag key back to the original field path.
 */
const decodeFieldPath = (encodedPath: string): string => encodedPath.replace(/__/g, '.');

export {
  decodeFieldPath,
  encodeFieldPath,
  everyoneVisibility,
  FIELD_EDITABILITIES,
  FIELD_OVERRIDES_FLAG,
  FIELD_VISIBILITIES,
  gmOnlyEditability,
  gmOnlyVisibility,
  normalEditability,
  ownerPlusVisibility,
};

export type {
  FieldEditability,
  FieldOverride,
  FieldOverrides,
  FieldVisibility,
};
