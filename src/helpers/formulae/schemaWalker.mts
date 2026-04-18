/**
 * Schema Walker – Builds AspectGroup trees by walking a TypeDataModel's defineSchema().
 *
 * Replaces the hand-written familiar builder files (physicalFamiliar, weaponFamiliar, etc.)
 * by reading field metadata directly from schema declarations.
 *
 * Field handling (all fields are **included by default** — opt-out via `formulaVisible: false`):
 * - Field with `options.familiar.formulaVisible === false` → excluded (opt-out)
 * - Field whose constructor has `isFamiliarField === true` (e.g. Dnd35eField) → compound leaf
 *   - For compound wrappers (SchemaField with a `value` sub-field): accessPath targets `.value`
 * - Field whose constructor has `isFamiliarLeaf === true` (e.g. PriceField, FormulaField) → opaque leaf
 *   - Treated as a single value; inner fields are NOT recursed into
 * - SchemaField without the above markers → recurse into children (grouping node)
 * - All other fields (NumberField, StringField, BooleanField, etc.) → included as simple leaves
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
 * Add a leaf entry to an AspectGroup.
 */
function addLeafToGroup(
  field: foundry.data.fields.DataField,
  meta: FormulaFieldMeta | undefined,
  key: string,
  accessPath: string,
  context: DocumentContext | undefined,
  output: AspectGroup
): void {
  const type = meta?.aspectType ?? inferFieldType(field);
  const aspectKey = meta?.aspectKey ?? key;

  const prop: FieldAspect = {
    display: (field.options as Record<string, unknown>).label as string ?? key,
    type,
    accessPath,
  };

  if (meta?.aliases?.length) {
    prop.aliases = meta.aliases;
  }

  if (context) {
    const resolved = resolveValue(context, accessPath, type);
    if (resolved !== undefined) prop.value = resolved;
  }

  output[aspectKey] = prop;
}

/**
 * Recursively walk a record of DataField instances, building an AspectGroup.
 *
 * All fields are included by default. Fields opt out with `familiar: { formulaVisible: false }`.
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

    if (meta?.formulaVisible === false) {
      // ── Explicit opt-out — skip this field entirely ──
      continue;
    }

    const ctor = field.constructor as unknown as Record<string, unknown>;
    const isCompoundWrapper = ctor.isFamiliarField === true;
    const isOpaqueLeaf = ctor.isFamiliarLeaf === true;

    if (isCompoundWrapper) {
      // ── Compound wrapper (Dnd35eField) — access .value sub-field ──
      const isCompound = field instanceof SchemaField
        && 'value' in ((field as foundry.data.fields.SchemaField).fields ?? {});
      const accessPath = isCompound ? `${currentPath}.value` : currentPath;
      addLeafToGroup(field, meta, key, accessPath, context, output);
    } else if (isOpaqueLeaf) {
      // ── Opaque leaf (PriceField, FormulaField) — single value, no recursion ──
      addLeafToGroup(field, meta, key, currentPath, context, output);
    } else if (field instanceof SchemaField) {
      // ── Branch: recurse into nested SchemaField children ──
      const childFields = (field as foundry.data.fields.SchemaField).fields as
        Record<string, foundry.data.fields.DataField> | undefined;
      if (childFields) {
        const branch: AspectGroup = {};
        walkFields(childFields, context, currentPath, branch);
        if (Object.keys(branch).length > 0) {
          output[key] = branch;
        }
      }
    } else {
      // ── Default: include as simple leaf ──
      addLeafToGroup(field, meta, key, currentPath, context, output);
    }
  }
}

/**
 * Build an AspectGroup from a DataModel class's schema.
 *
 * Walks `ModelClass.defineSchema()` and collects all fields by default.
 * Fields opt out with `familiar: { formulaVisible: false }`. Compound wrappers
 * (Dnd35eField, `isFamiliarField`) and opaque leaves (PriceField, FormulaField,
 * `isFamiliarLeaf`) are recognized by static markers on their constructors.
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
