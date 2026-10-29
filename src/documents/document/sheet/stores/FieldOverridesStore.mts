/**
 * FieldOverridesStore — composable for managing per-field visibility/editability overrides.
 *
 * Overrides are stored in document flags (`flags.dnd35e.fieldOverrides`).
 * Field *defaults* (defaultVisibility, defaultEditability, canVisibilityBeChanged,
 * canEditabilityBeChanged) come from the schema field options set at definition time
 * (useDnd35eField / withFamiliar / FormulaField constructor options).
 *
 * Follows the same composable pattern as {@link TabStore}.
 *
 * @module
 */

import { getSchemaField as resolveSchemaField } from '@fields/getSchemaField.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import type {
  FieldEditability,
  FieldOverride,
  FieldOverrideKey,
  FieldOverrides,
  FieldVisibility,
} from '@vc/fields/formGroups/fieldPermissions.mjs';
import {
  encodeFieldPath,
  everyoneVisibility,
  FIELD_OVERRIDES_FLAG,
  normalEditability,
} from '@vc/fields/formGroups/fieldPermissions.mjs';
import type { ComputedRef, ShallowRef } from 'vue';
import { computed } from 'vue';

import type { FieldOverrideValue } from './cascadeFieldOverride.mjs';
import { cascadeFieldOverride, OVERRIDE_DEFAULTS, OVERRIDE_RANKS } from './cascadeFieldOverride.mjs';

type DataField = foundry.data.fields.DataField;
type SchemaField = foundry.data.fields.SchemaField;

/**
 * Custom options stashed on fields via useDnd35eField / withFamiliar / FormulaField at schema definition time.
 * Foundry preserves unknown keys in `field.options`; this interface describes the ones we read back.
 */
interface OverrideOptions {
  identifiable?: boolean;
  defaultVisibility?: FieldVisibility;
  defaultEditability?: FieldEditability;
  canVisibilityBeChanged?: boolean;
  canEditabilityBeChanged?: boolean;
}

// ---------------------------------------------------------------------------
// Per-key restrictiveness ranking imported from cascadeFieldOverride.mjs
// ---------------------------------------------------------------------------

/** Maps each override key to its corresponding schema default option name. */
const SCHEMA_DEFAULT_KEYS: { [K in FieldOverrideKey]: keyof OverrideOptions } = {
  visibility: 'defaultVisibility',
  editability: 'defaultEditability',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FieldMeta = {
  /** Whether field supports visibility/editability overrides. */
  hasOverrides: boolean;
  /** Whether this field supports identified/unidentified variants. */
  identifiable: boolean;
  /** Whether the GM can change visibility on this field. */
  canVisibilityBeChanged: boolean;
  /** Whether the GM can change editability on this field. */
  canEditabilityBeChanged: boolean;
  defaultVisibility: FieldVisibility;
  defaultEditability: FieldEditability;
};

type FieldOverridesStoreOptions = {
  document: ShallowRef<{ getFlag: (scope: string, key: string) => unknown; system?: unknown }>;
  updateFlag: (key: string, value: unknown) => Promise<boolean>;
};

type FieldOverridesStoreGetters = {
  fieldOverrides: ComputedRef<FieldOverrides>;
};

type FieldOverridesStoreUtils = {
  getFieldOverride: <K extends FieldOverrideKey>(fieldPath: string, key: K) => FieldOverrideValue<K> | undefined;
  getOwnFieldOverride: <K extends FieldOverrideKey>(fieldPath: string, key: K) => FieldOverrideValue<K> | undefined;
  resolveFieldMeta: (fieldPath: string) => FieldMeta | null;
  resolveVisibility: (fieldPath: string, additionalRestriction?: FieldVisibility) => FieldVisibility;
  getIsVisible: (fieldPath: string, currentVisibility: FieldVisibility, additionalRestriction?: FieldVisibility) => boolean;
  resolveEditability: (fieldPath: string, additionalRestriction?: FieldEditability) => FieldEditability;
  getIsEditable: (fieldPath: string, currentEditability: FieldEditability, additionalRestriction?: FieldEditability) => boolean;
  /** Look up a schema field by its system-relative path. */
  getSchemaField: (fieldPath: string) => DataField | undefined;
  /** Resolve a localized field label/hint from schema or LOCALIZATION_PREFIXES fallback. */
  getFieldLocalization: (fieldPath: string, kind: 'label' | 'hint') => string;
  /** Resolve a localized field label. */
  getFieldLabel: (fieldPath: string) => string;
  /** Resolve a localized field hint. */
  getFieldHint: (fieldPath: string) => string;
  /** Resolve the canonical measurement unit tagged on a numeric schema field (distance/weight), if any. */
  getFieldMeasurementUnit: (fieldPath: string) => 'distance' | 'weight' | undefined;
};

type FieldOverridesStoreActions = {
  setFieldOverride: <K extends FieldOverrideKey>(fieldPath: string, key: K, value: FieldOverrideValue<K> | null) => Promise<boolean>;
};

type FieldOverridesStore = {
  fieldOverridesGetters: FieldOverridesStoreGetters;
  fieldOverridesUtils: FieldOverridesStoreUtils;
  fieldOverridesActions: FieldOverridesStoreActions;
};

type FieldOverrideDocument = { getFlag: (scope: string, key: string) => unknown; system?: unknown };

/** Shared live resolver for sheets and controls that run outside a sheet store. */
const resolveDocumentFieldOverride = <K extends FieldOverrideKey>(
  document: FieldOverrideDocument,
  fieldPath: string,
  key: K,
  overrides = (document.getFlag(SYSTEM_ID, FIELD_OVERRIDES_FLAG) as FieldOverrides | undefined) ?? {}
): FieldOverrideValue<K> | undefined => {
  return cascadeFieldOverride(fieldPath, key, <T extends FieldOverrideKey>(path: string, overrideKey: T): FieldOverrideValue<T> | undefined => {
    const flagValue = overrides[encodeFieldPath(path)]?.[overrideKey];
    if (flagValue != null) return flagValue as FieldOverrideValue<T>;
    if (!path.startsWith('system.')) return OVERRIDE_DEFAULTS[overrideKey];
    const field = resolveSchemaField(document, path);
    const options = field?.options as OverrideOptions | undefined;
    return options?.[SCHEMA_DEFAULT_KEYS[overrideKey]] as FieldOverrideValue<T> | undefined;
  });
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

const useFieldOverridesStore = (options: FieldOverridesStoreOptions): FieldOverridesStore => {
  const { document, updateFlag } = options;

  const fieldOverrides = computed((): FieldOverrides => {
    return (document.value.getFlag(SYSTEM_ID, FIELD_OVERRIDES_FLAG) as FieldOverrides | undefined) ?? {};
  });

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** Look up a schema field on this store's document. */
  const getSchemaField = (fieldPath: string): DataField | undefined =>
    resolveSchemaField(document.value, fieldPath);

  const getFieldLocalization = (fieldPath: string, kind: 'label' | 'hint'): string => {
    const schemaField = getSchemaField(fieldPath);
    const schemaText = schemaField?.options?.[kind];
    if (typeof schemaText === 'string' && schemaText.length > 0) return schemaText;

    if (!fieldPath.startsWith('system.')) return '';

    const systemPath = fieldPath.replace(/^system\./, '');
    const systemModel = document.value.system as (foundry.abstract.DataModel & { constructor?: { LOCALIZATION_PREFIXES?: string[] } }) | undefined;
    const prefixes = systemModel?.constructor?.LOCALIZATION_PREFIXES ?? [];

    for (const prefix of [...prefixes].reverse()) {
      const localizationKey = `${prefix}.FIELDS.${systemPath}.${kind}`;
      if (game.i18n.has(localizationKey)) {
        return game.i18n.localize(localizationKey);
      }
    }

    return '';
  };

  const getFieldLabel = (fieldPath: string): string => getFieldLocalization(fieldPath, 'label');

  const getFieldHint = (fieldPath: string): string => getFieldLocalization(fieldPath, 'hint');

  const getFieldMeasurementUnit = (fieldPath: string): 'distance' | 'weight' | undefined => {
    const schemaField = getSchemaField(fieldPath) as { options?: { measurementUnit?: 'distance' | 'weight' } } | undefined;
    return schemaField?.options?.measurementUnit;
  };

  /** Read our custom override options from a DataField. */
  const getOverrideOptions = (field: DataField): OverrideOptions =>
    field.options as unknown as OverrideOptions;

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Get the effective value for a single override key at a path.
   *
   * Resolution at each level: flag → schema default.
   * Cascades up the path tree (section → field), picking most-restrictive at each parent.
   */
  const getFieldOverride = <K extends FieldOverrideKey>(fieldPath: string, key: K): FieldOverrideValue<K> | undefined => {
    return resolveDocumentFieldOverride(document.value, fieldPath, key, fieldOverrides.value);
  };

  /**
   * Get only the field's OWN flag value for a single override key (no cascade, no schema defaults).
   * Used by FieldControls to display what was explicitly set on this field.
   */
  const getOwnFieldOverride = <K extends FieldOverrideKey>(fieldPath: string, key: K): FieldOverrideValue<K> | undefined => {
    const encodedPath = encodeFieldPath(fieldPath);
    return fieldOverrides.value[encodedPath]?.[key] as FieldOverrideValue<K> | undefined;
  };

  /**
   * Resolve schema field metadata for visibility/editability defaults.
    * Reads field options set at schema definition time (useDnd35eField / withFamiliar / FormulaField).
   * Returns null for non-schema fields (name, img, etc.).
   */
  const resolveFieldMeta = (fieldPath: string): FieldMeta | null => {
    const field = getSchemaField(fieldPath);
    if (!field) return null;

    const opts = getOverrideOptions(field);
    const fields = (field as SchemaField).fields as Record<string, DataField> | undefined;

    const supportsOverrides = (f: DataField): boolean => {
      const fieldOpts = getOverrideOptions(f);
      return fieldOpts.identifiable !== undefined
        || fieldOpts.defaultVisibility !== undefined
        || fieldOpts.defaultEditability !== undefined
        || fieldOpts.canVisibilityBeChanged !== undefined
        || fieldOpts.canEditabilityBeChanged !== undefined;
    };

    const hasOverrides = supportsOverrides(field)
      || (fields
        ? Object.values(fields).some(child => supportsOverrides(child))
        : false);

    const identifiable = opts.identifiable
      ?? (fields
        ? Object.values(fields).some(child => getOverrideOptions(child).identifiable === true)
        : false);

    return {
      hasOverrides,
      identifiable,
      canVisibilityBeChanged: opts.canVisibilityBeChanged ?? true,
      canEditabilityBeChanged: opts.canEditabilityBeChanged ?? true,
      defaultVisibility: opts.defaultVisibility ?? everyoneVisibility,
      defaultEditability: opts.defaultEditability ?? normalEditability,
    };
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Set or clear a single override key for a field. Always writes to flags.
   * Pass `null` to remove that key; the entire entry is cleaned up when empty.
   */
  const setFieldOverride = async <K extends FieldOverrideKey>(
    fieldPath: string, key: K, value: FieldOverrideValue<K> | null
  ): Promise<boolean> => {
    const encodedPath = encodeFieldPath(fieldPath);
    const current = { ...fieldOverrides.value };
    const entry = { ...current[encodedPath] };

    if (value === null) {
      delete entry[key];
      if (Object.keys(entry).length === 0) {
        delete current[encodedPath];
      } else {
        current[encodedPath] = entry;
      }
    } else {
      entry[key] = value as FieldOverride[K];
      current[encodedPath] = entry;
    }

    return await updateFlag(FIELD_OVERRIDES_FLAG, current);
  };

  const resolveVisibility = (fieldPath: string, localDefault?: FieldVisibility): FieldVisibility => {
    const override = getFieldOverride(fieldPath, 'visibility');
    if (override) {
      return override;
    }
    if (localDefault) {
      return localDefault;
    }
    return resolveFieldMeta(fieldPath)?.defaultVisibility ?? everyoneVisibility;
  };

  const getIsVisible = (fieldPath: string, currentVisibility: FieldVisibility, additionalRestriction?: FieldVisibility): boolean => {
    const visibility = resolveVisibility(fieldPath, additionalRestriction);

    return OVERRIDE_RANKS.visibility[visibility] <= OVERRIDE_RANKS.visibility[currentVisibility];
  };

  const resolveEditability = (fieldPath: string, localDefault?: FieldEditability): FieldEditability => {
    const override = getFieldOverride(fieldPath, 'editability');
    if (override) {
      return override;
    }
    if (localDefault) {
      return localDefault;
    }
    return resolveFieldMeta(fieldPath)?.defaultEditability ?? normalEditability;
  };

  const getIsEditable = (fieldPath: string, currentEditability: FieldEditability, additionalRestriction?: FieldEditability): boolean => {
    const editability = resolveEditability(fieldPath, additionalRestriction);
    return OVERRIDE_RANKS.editability[editability] <= OVERRIDE_RANKS.editability[currentEditability];
  };

  return {
    fieldOverridesGetters: {
      fieldOverrides,
    },
    fieldOverridesUtils: {
      getFieldOverride,
      getOwnFieldOverride,
      resolveFieldMeta,
      resolveVisibility,
      getIsVisible,
      resolveEditability,
      getIsEditable,
      getSchemaField,
      getFieldLocalization,
      getFieldLabel,
      getFieldHint,
      getFieldMeasurementUnit,
    },
    fieldOverridesActions: {
      setFieldOverride,
    },
  };
};

const FieldOverridesStoreSymbol = Symbol('FieldOverridesStore');

export {
  FieldOverridesStoreSymbol,
  resolveDocumentFieldOverride,
  useFieldOverridesStore,
};

export type {
  FieldMeta,
  FieldOverridesStore,
  FieldOverridesStoreActions,
  FieldOverridesStoreGetters,
  FieldOverridesStoreOptions,
  FieldOverridesStoreUtils,
  FieldOverrideValue,
};
