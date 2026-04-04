/**
 * Schema Walker – Builds AspectGroup trees by walking a TypeDataModel's defineSchema().
 *
 * Replaces the hand-written familiar builder files (physicalFamiliar, weaponFamiliar, etc.)
 * by reading field metadata directly from schema declarations.
 *
 * Field handling:
 * - Field whose constructor has `isFamiliarField === true` (e.g. Dnd35eField) → auto-leaf
 *   - Can be explicitly excluded with `familiar: { formulaVisible: false }`
 *   - For compound wrappers (SchemaField with a `value` sub-field): accessPath targets `.value`
 * - Field with `options.familiar.formulaVisible === true` → manual opt-in leaf
 * - SchemaField without the above → recurse into children (grouping node)
 * - All other fields → skipped
 *
 * @module
 */

import type { DocumentContext } from './registry.mjs';
import type { AspectGroup, FieldAspect,FormulaFieldMeta } from './types.mjs';

const {
  NumberField,
  SchemaField,
} = foundry.data.fields;

/**
 * Document-level fields that live outside `system` but should appear in familiar.
 * These are merged into the top level of every AspectGroup.
 */
const DOCUMENT_LEVEL_ASPECTS: Record<string, Omit<FieldAspect, 'value'>> = {
  name: { display: 'Name', type: 'string', accessPath: 'name' },
};

/**
 * Infer a familiar type from a DataField class.
 * NumberField → 'number', everything else → 'string'.
 */
function inferFieldType(field: foundry.data.fields.DataField): 'string' | 'number' {
  if (field instanceof NumberField) return 'number';
  return 'string';
}

/**
 * Resolve a live value from a context document and coerce it to the target type.
 *
 * For scalar values this is straightforward.  For objects (e.g. a DataModel
 * like PriceData), we call `toString()` only if the instance provides a
 * custom override — a plain `[object Object]` fallback is treated as missing.
 */
function resolveValue(
  context: DocumentContext,
  accessPath: string,
  type: 'string' | 'number'
): string | number | undefined {
  const raw = foundry.utils.getProperty(context as object, accessPath) as unknown;
  if (raw === undefined || raw === null) return undefined;

  if (type === 'number') return Number(raw);

  // Scalar → coerce directly
  if (typeof raw !== 'object') return String(raw);

  // Object with a custom toString (e.g. PriceData DataModel) → use it
  if (typeof (raw as Record<string, unknown>).toString === 'function'
    && (raw as object).toString !== Object.prototype.toString) {
    return String(raw);
  }

  return undefined;
}

/**
 * Recursively walk a record of DataField instances, building an AspectGroup.
 *
 * @param fields      The fields to walk (e.g. from defineSchema() or SchemaField.fields)
 * @param context     Optional live document for resolving property values
 * @param pathPrefix  Dot-separated path accumulated so far (e.g. 'system' or 'system.hp')
 * @param output      The AspectGroup being built (mutated in-place)
 */
function walkFields(
  fields: Record<string, foundry.data.fields.DataField>,
  context: DocumentContext | undefined,
  pathPrefix: string,
  output: AspectGroup
): void {
  for (const [key, field] of Object.entries(fields)) {
    const meta = (field.options as Record<string, unknown>).familiar as FormulaFieldMeta | undefined;
    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    const isAutoEligible = (field.constructor as unknown as Record<string, unknown>).isFamiliarField === true;

    if (meta?.formulaVisible === false) {
      // ── Explicit opt-out — skip this field entirely ──
      continue;
    } else if (isAutoEligible || meta?.formulaVisible) {
      // ── Leaf: auto-eligible field type or explicitly opted in ──
      const type = meta?.aspectType ?? inferFieldType(field);
      const aspectKey = meta?.aspectKey ?? key;

      // For compound wrappers (Dnd35eField), the real data lives at .value
      const isCompound = field instanceof SchemaField
        && 'value' in ((field as foundry.data.fields.SchemaField).fields ?? {});
      const accessPath = isCompound ? `${currentPath}.value` : currentPath;

      const prop: FieldAspect = {
        display: (field.options as Record<string, unknown>).label as string ?? key,
        type,
        accessPath,
      };

      if (context) {
        const resolved = resolveValue(context, accessPath, type);
        if (resolved !== undefined) prop.value = resolved;
      }

      output[aspectKey] = prop;
    } else if (field instanceof SchemaField) {
      // ── Branch: recurse into nested SchemaField children ──
      const childFields = (field as foundry.data.fields.SchemaField).fields as
        Record<string, foundry.data.fields.DataField> | undefined;
      if (childFields) {
        const branch: AspectGroup = {};
        walkFields(childFields, context, currentPath, branch);
        // Only add the branch if it has any visible children
        if (Object.keys(branch).length > 0) {
          output[key] = branch;
        }
      }
    }
    // else: plain field without familiar → skip
  }
}

/**
 * Build an AspectGroup from a DataModel class's schema.
 *
 * Walks `ModelClass.defineSchema()` and collects all auto-eligible fields
 * (those whose constructor has `isFamiliarField === true`, e.g. Dnd35eField)
 * plus fields with explicit `familiar.formulaVisible === true`,
 * plus standard document-level fields.
 *
 * @param ModelClass  A DataModel class (or any object with a static `defineSchema()`)
 * @param context     Optional live Foundry document – when provided, property values are resolved inline
 * @returns           An AspectGroup ready for use in FormulaFormGroup
 *
 * @example
 * ```ts
 * // Static schema (no live values)
 * const schema = gatherAspectsFromSchema(WeaponSystemModel);
 *
 * // With live document (values populated)
 * const schema = gatherAspectsFromSchema(WeaponSystemModel, weaponDocument);
 * ```
 */
function gatherAspectsFromSchema(
  ModelClass: { defineSchema(): Record<string, foundry.data.fields.DataField> },
  context?: DocumentContext
): AspectGroup {
  const schema = ModelClass.defineSchema();
  const result: AspectGroup = {};

  // Walk system-level fields (all schema fields live under document.system)
  walkFields(schema, context, 'system', result);

  // Merge document-level fields (name, img, etc.)
  for (const [key, meta] of Object.entries(DOCUMENT_LEVEL_ASPECTS)) {
    const prop: FieldAspect = { ...meta };
    if (context) {
      const resolved = resolveValue(context, meta.accessPath, meta.type);
      if (resolved !== undefined) prop.value = resolved;
    }
    result[key] = prop;
  }

  return result;
}

export { DOCUMENT_LEVEL_ASPECTS, gatherAspectsFromSchema };
