/**
 * SectionField — A SchemaField that carries override-related options
 * (defaultVisibility, defaultEditability, canVisibilityBeChanged,
 * canEditabilityBeChanged) discoverable at runtime via `field.options`.
 *
 * Used for grouping fields (e.g. `system.hp`) where a FormGroupSection
 * needs schema-level defaults that participate in the override cascade,
 * even though the SchemaField itself is not a Dnd35eField.
 *
 * @module
 */

import type { FieldEditability, FieldVisibility } from '@vc/fields/formGroups/fieldPermissions.mjs';
import { everyoneVisibility, normalEditability } from '@vc/fields/formGroups/fieldPermissions.mjs';

const { SchemaField } = foundry.data.fields;

interface SectionFieldOptions {
  /** Default visibility when no GM override is saved. Default: 'everyone'. */
  defaultVisibility?: FieldVisibility;
  /** Default editability when no GM override is saved. Default: 'normal'. */
  defaultEditability?: FieldEditability;
  /** Whether the GM can change visibility on this section. Default: true. */
  canVisibilityBeChanged?: boolean;
  /** Whether the GM can change editability on this section. Default: true. */
  canEditabilityBeChanged?: boolean;
  label: string;
  hint: string;
}

/**
 * Thin SchemaField wrapper whose only purpose is to carry override options
 * so that `resolveFieldMeta` can discover them via `field.options`.
 */
class SectionField extends SchemaField {
  declare options: {
    defaultVisibility: FieldVisibility;
    defaultEditability: FieldEditability;
    canVisibilityBeChanged: boolean;
    canEditabilityBeChanged: boolean;
    label: string;
    hint: string;
  };
  constructor(
    fields: Record<string, foundry.data.fields.DataField>,
    sectionOptions: SectionFieldOptions = { label: '', hint: '' }
  ) {
    const {
      defaultVisibility,
      defaultEditability,
      canVisibilityBeChanged,
      canEditabilityBeChanged,
      ...schemaOptions
    } = sectionOptions;

    super(fields, schemaOptions);

    this.options.defaultVisibility = defaultVisibility ?? everyoneVisibility;
    this.options.defaultEditability = defaultEditability ?? normalEditability;
    this.options.canVisibilityBeChanged = canVisibilityBeChanged ?? true;
    this.options.canEditabilityBeChanged = canEditabilityBeChanged ?? true;
    this.options.label = sectionOptions.label;
    this.options.hint = sectionOptions.hint;

    const opts = this.options as Record<string, unknown>;
    if (defaultVisibility) opts.defaultVisibility = defaultVisibility;
    if (defaultEditability) opts.defaultEditability = defaultEditability;
    if (canVisibilityBeChanged !== undefined) opts.canVisibilityBeChanged = canVisibilityBeChanged;
    if (canEditabilityBeChanged !== undefined) opts.canEditabilityBeChanged = canEditabilityBeChanged;
  }
}

export { SectionField };
export type { SectionFieldOptions };
