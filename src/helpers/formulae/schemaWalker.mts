/**
 * Schema Walker – Builds AspectGroup trees by walking a TypeDataModel's defineSchema().
 *
 * Replaces the hand-written familiar builder files (physicalFamiliar, weaponFamiliar, etc.)
 * by reading field metadata directly from schema declarations.
 *
 * Field handling (all fields are **included by default** — opt-out via `formulaVisible: false`):
 * - Field with `options.familiar.formulaVisible === false` → excluded (opt-out)
 * - Field whose constructor has `isFamiliarLeaf === true` (e.g. CurrencyField, FormulaField) → opaque leaf
 *   - Treated as a single value; inner fields are NOT recursed into
 * - SchemaField without the above marker → recurse into children (grouping node)
 * - All other fields (NumberField, StringField, BooleanField, etc.) → included as simple leaves
 *
 * @module
 */

import type { DocumentContext } from './registry.mjs';
import type { ArrayElementInfo, AspectGroup, FieldAspect, FormulaFieldMeta } from './types.mjs';

const {
  ArrayField,
  BooleanField,
  NumberField,
  SchemaField,
} = foundry.data.fields;

/**
 * Convert a display label into a valid formula-variable identifier segment.
 * Strips non-letter/non-digit characters (Unicode-aware) and PascalCases the result.
 * Used by `localizeFormula` / `canonicalizeFormula` to map between typed variable
 * names and localized display labels — NOT used for AspectGroup keys (those are
 * always the canonical schema field name).
 *
 * Examples (English): "Hit Points" → "HitPoints", "Hardness" → "Hardness"
 * Examples (Polish):   "Twardość"  → "Twardość", "Punkty Wytrzymałości" → "PunktyWytrzymałości"
 *
 * Returns `undefined` when the label is empty or produces no word segments.
 *
 * @todo Community hardening: PascalCasing is inappropriate for some languages.
 *   Japanese has no concept of letter casing (passthrough — no spaces to strip either).
 *   German capitalizes only nouns. Arabic, Hebrew, Thai, and CJK scripts have no uppercase.
 *   Planned fix: `CONFIG.dnd35e.localization[locale].normalizeIdentifier(label)` hook.
 *   System ships with the EN implementation (current behavior). Mods / locale packs
 *   can override per locale. Changing the function for a locale is a storage-breaking
 *   migration for any formula that used localized identifiers in that locale.
 *   Tracked: docs/migration-plan/release/phase-07-community-hardening.md
 */
export function normalizeLabel(label: string | undefined): string | undefined {
  if (!label) return undefined;
  // \p{L} = any Unicode letter, \p{N} = any Unicode digit
  const words = label.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!words.length) return undefined;
  // PascalCase: capitalize first letter of every word, preserve the rest
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Document-level fields that live outside `system` but should appear in familiar.
 * These are merged into the top level of every AspectGroup.
 * The `display` is intentionally a plain key — localized at call time in gatherAspectsFromSchema.
 */
const DOCUMENT_LEVEL_ASPECTS: Record<string, Omit<FieldAspect, 'value'>> = {
  name: { display: 'Name', type: 'string', accessPath: 'name' },
};

/**
 * Infer a familiar type from a DataField class.
 * NumberField → 'number', BooleanField → 'boolean', ArrayField → 'array', everything else → 'string'.
 */
function inferFieldType(field: foundry.data.fields.DataField): 'string' | 'number' | 'boolean' | 'array' {
  if (field instanceof NumberField) return 'number';
  if (field instanceof BooleanField) return 'boolean';
  if (field instanceof ArrayField) return 'array';
  return 'string';
}

/**
 * Describe an ArrayField's element shape (poc §7.2b) — primitive scalar elements vs.
 * a uniform object shape (`ArrayField(SchemaField)`, e.g. `senses`/`attacks`).
 *
 * `accessPath`/`localizationPrefixes` are the array field's OWN values (already
 * computed by the caller) — used only to derive `elementAccessPath` for the
 * object-kind case, matching Foundry's real localization path for
 * `ArrayField(SchemaField)` members (`<field>.element.<subfield>`).
 */
function inferArrayElementInfo(
  field: foundry.data.fields.DataField,
  accessPath: string,
  localizationPrefixes: string[]
): ArrayElementInfo {
  const element = (field as InstanceType<typeof ArrayField>).element;
  if (element instanceof SchemaField) {
    const schemaPath = accessPath.startsWith('system.') ? accessPath.substring('system.'.length) : accessPath;
    return {
      kind: 'object',
      elementFields: element.fields as Record<string, foundry.data.fields.DataField>,
      elementAccessPath: `${schemaPath}.element`,
      localizationPrefixes,
    };
  }
  return { kind: 'primitive', type: element instanceof NumberField ? 'number' : 'string' };
}

/**
 * Resolve a live value from a context document and coerce it to the target type.
 *
 * For scalar values this is straightforward.  For objects (e.g. a DataModel
 * like CurrencyData), we call `toString()` only if the instance provides a
 * custom override — a plain `[object Object]` fallback is treated as missing.
 */
function resolveValue(
  context: DocumentContext,
  accessPath: string,
  type: 'string' | 'number' | 'boolean' | 'array'
): string | number | undefined {
  const raw = foundry.utils.getProperty(context as object, accessPath) as unknown;
  if (raw === undefined || raw === null) return undefined;

  if (type === 'number') return Number(raw);
  if (type === 'boolean') return raw ? 'true' : 'false';
  if (type === 'array') return Array.isArray(raw) ? raw.length : undefined;

  // Scalar → coerce directly
  if (typeof raw !== 'object') return String(raw);

  // Object with a custom toString (e.g. CurrencyData DataModel) → use it
  if (typeof (raw as Record<string, unknown>).toString === 'function'
    && (raw as object).toString !== Object.prototype.toString) {
    return String(raw);
  }

  return undefined;
}

function resolveLocalizedLabelKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  const localized = game.i18n.localize(key);
  return localized !== key ? localized : undefined;
}

function resolveLocalizedRawValue(key: string): unknown {
  const primary = foundry.utils.getProperty(game.i18n.translations as object, key);
  if (primary !== undefined) return primary;
  const fallback = foundry.utils.getProperty((game.i18n as unknown as { _fallback?: object })._fallback ?? {}, key);
  return fallback;
}

function normalizeAliasValue(alias: string): string {
  const localized = resolveLocalizedLabelKey(alias);
  if (!localized) return alias;
  return normalizeLabel(localized) ?? localized;
}

function getPathBasedFamiliarLabel(
  accessPath: string,
  localizationPrefixes: string[]
): string | undefined {
  const schemaPath = accessPath.startsWith('system.')
    ? accessPath.substring('system.'.length)
    : accessPath;

  for (const prefix of localizationPrefixes) {
    const localized = resolveLocalizedLabelKey(`${prefix}.FIELDS.${schemaPath}.familiarLabel`);
    if (localized) return localized;
  }

  return undefined;
}

function getPathBasedFamiliarAliases(
  accessPath: string,
  localizationPrefixes: string[]
): string[] {
  const schemaPath = accessPath.startsWith('system.')
    ? accessPath.substring('system.'.length)
    : accessPath;

  for (const prefix of localizationPrefixes) {
    const raw = resolveLocalizedRawValue(`${prefix}.FIELDS.${schemaPath}.familiarAliases`);
    if (Array.isArray(raw)) {
      return raw
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .map(v => normalizeLabel(v) ?? v);
    }
    if (typeof raw === 'string' && raw.length > 0) {
      return [normalizeLabel(raw) ?? raw];
    }
  }

  return [];
}

/**
 * Resolve the plain (non-familiar) `.label` localization key for a schema-relative path.
 * Mirrors how Foundry's own `localizeDataModel` sets `field.label` from
 * `${prefix}.FIELDS.${schemaPath}.label` — used for synthetic entries (e.g. Group Change
 * Targets) that have no real DataField to read `field.label` from directly.
 */
function getPathBasedLabel(
  accessPath: string,
  localizationPrefixes: string[]
): string | undefined {
  const schemaPath = accessPath.startsWith('system.')
    ? accessPath.substring('system.'.length)
    : accessPath;

  for (const prefix of localizationPrefixes) {
    const localized = resolveLocalizedLabelKey(`${prefix}.FIELDS.${schemaPath}.label`);
    if (localized) return localized;
  }

  return undefined;
}

/**
 * Add a leaf entry to an AspectGroup.
 *
 * Key: always the canonical schema field name (`key`), or `meta.aspectKey` when
 * explicitly overridden. Localized display labels live in `FieldAspect.display`;
 * they are never used as tree keys.
 *
 * `accessPath` is always the raw Foundry document path used internally at
 * resolution time — users never see it.
 */
function addLeafToGroup(
  field: foundry.data.fields.DataField,
  meta: FormulaFieldMeta | undefined,
  key: string,
  accessPath: string,
  context: DocumentContext | undefined,
  output: AspectGroup,
  localizationPrefixes: string[]
): void {
  const type = meta?.aspectType ?? inferFieldType(field);
  const localizedOverride = resolveLocalizedLabelKey(meta?.familiarLabelKey);
  const pathOverride = getPathBasedFamiliarLabel(accessPath, localizationPrefixes);
  const resolvedOverride = localizedOverride ?? pathOverride ?? meta?.familiarLabel;
  // field.label is set by Foundry's localizeDataModel (via LOCALIZATION_PREFIXES) after i18nInit.
  // field.options.label is only set when explicitly passed in the constructor.
  const officialLabel = (field as unknown as { label?: string }).label
    ?? (field.options as Record<string, unknown>).label as string | undefined;
  const label = resolvedOverride ?? officialLabel;
  const aspectKey = meta?.aspectKey ?? key;

  const prop: FieldAspect = {
    display: label ?? key,
    type,
    accessPath,
  };

  if (type === 'array' && field instanceof ArrayField) {
    prop.arrayElement = inferArrayElementInfo(field, accessPath, localizationPrefixes);
  }

  const aliases: string[] = [
    ...getPathBasedFamiliarAliases(accessPath, localizationPrefixes),
    ...(meta?.aliases ?? []).map(normalizeAliasValue),
  ];
  const localizedIdentifier = normalizeLabel(prop.display);
  if (localizedIdentifier && localizedIdentifier !== key && !aliases.includes(localizedIdentifier)) {
    aliases.unshift(localizedIdentifier);
  }
  // When a familiarLabel override wins, keep the official label's normalized form typeable
  // too (e.g. "Abilities" preferred, but "AbilityScores" — from official label "Ability Scores" —
  // still resolves as a fallback identifier).
  if (resolvedOverride) {
    const officialIdentifier = normalizeLabel(officialLabel);
    if (officialIdentifier && officialIdentifier !== key
      && officialIdentifier !== localizedIdentifier && !aliases.includes(officialIdentifier)) {
      aliases.push(officialIdentifier);
    }
  }
  if (aliases.length) {
    prop.aliases = aliases;
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
  output: AspectGroup,
  localizationPrefixes: string[]
): void {
  for (const [key, field] of Object.entries(fields)) {
    const meta = (field.options as Record<string, unknown>).familiar as FormulaFieldMeta | undefined;
    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (meta?.formulaVisible === false) {
      // ── Explicit opt-out — skip this field entirely ──
      continue;
    }

    const ctor = field.constructor as unknown as Record<string, unknown>;
    const isOpaqueLeaf = ctor.isFamiliarLeaf === true;

    if (isOpaqueLeaf) {
      // ── Opaque leaf (CurrencyField, FormulaField) — single value, no recursion ──
      addLeafToGroup(field, meta, key, currentPath, context, output, localizationPrefixes);
    } else if (field instanceof SchemaField) {
      // ── Branch: recurse into nested SchemaField children ──
      const childFields = (field as foundry.data.fields.SchemaField).fields as
        Record<string, foundry.data.fields.DataField> | undefined;
      if (childFields) {
        const branch: AspectGroup = {};
        const localizedOverride = resolveLocalizedLabelKey(meta?.familiarLabelKey);
        const pathOverride = getPathBasedFamiliarLabel(currentPath, localizationPrefixes);
        const resolvedOverride = localizedOverride ?? pathOverride ?? meta?.familiarLabel;
        const officialLabel = (field as unknown as { label?: string }).label
          ?? (field.options as Record<string, unknown>).label as string | undefined;
        const branchLabel = resolvedOverride ?? officialLabel;
        if (branchLabel) branch._display = branchLabel;

        const aliases: string[] = [
          ...getPathBasedFamiliarAliases(currentPath, localizationPrefixes),
          ...(meta?.aliases ?? []).map(normalizeAliasValue),
        ];
        const localizedIdentifier = normalizeLabel(branchLabel);
        if (localizedIdentifier && localizedIdentifier !== key && !aliases.includes(localizedIdentifier)) {
          aliases.unshift(localizedIdentifier);
        }
        // Same official-label fallback as leaves — e.g. "abilities" prefers "Abilities" but
        // "AbilityScores" (from official label "Ability Scores") still resolves.
        if (resolvedOverride) {
          const officialIdentifier = normalizeLabel(officialLabel);
          if (officialIdentifier && officialIdentifier !== key
            && officialIdentifier !== localizedIdentifier && !aliases.includes(officialIdentifier)) {
            aliases.push(officialIdentifier);
          }
        }
        if (aliases.length) {
          branch._aliases = aliases;
        }

        walkFields(childFields, context, currentPath, branch, localizationPrefixes);
        if (Object.keys(branch).filter(k => !k.startsWith('_')).length > 0) {
          output[key] = branch;
        }
      }
    } else {
      // ── Default: include as simple leaf ──
      addLeafToGroup(field, meta, key, currentPath, context, output, localizationPrefixes);
    }
  }
}

/**
 * Build an AspectGroup from a DataModel class's schema.
 *
 * Uses `ModelClass.schema.fields` (the cached, LOCALIZATION_PREFIXES-mutated schema)
 * rather than `ModelClass.defineSchema()` (which creates fresh unlabeled instances).
 * Fields opt out with `familiar: { formulaVisible: false }`. Opaque leaves
 * (CurrencyField, FormulaField, `isFamiliarLeaf`) are recognized by a static
 * marker on their constructors.
 *
 * @param ModelClass  A TypeDataModel class whose `schema.fields` holds localized field metadata
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ModelClass: {
    schema?: { fields: Record<string, any> };
    defineSchema(): Record<string, foundry.data.fields.DataField>;
    LOCALIZATION_PREFIXES?: string[];
  },
  context?: DocumentContext
): AspectGroup {
  // Prefer the cached schema (fields have localized labels from LOCALIZATION_PREFIXES).
  // Fall back to defineSchema() only if schema is not yet available (e.g. unit tests).
  const fields = (ModelClass.schema?.fields) ?? ModelClass.defineSchema();
  const result: AspectGroup = {};
  const localizationPrefixes = ModelClass.LOCALIZATION_PREFIXES ?? [];

  // Walk system-level fields (all schema fields live under document.system)
  walkFields(fields, context, 'system', result, localizationPrefixes);

  // Merge document-level fields (name, img, etc.) with localized display labels.
  // The tree key is ALWAYS the canonical 'name' — storage must be locale-independent.
  // The localized PascalCase label (e.g. 'Name' in EN, 'Naam' in NL) is added as an alias
  // so users can type either form; localizeFormula() will render the display form on output.
  const nameLabel = (game as { i18n?: { localize?(k: string): string } }).i18n?.localize?.('Name') ?? 'Name';
  const nameProp: FieldAspect = { display: nameLabel, type: 'string', accessPath: 'name' };
  const localizedNameKey = normalizeLabel(nameLabel);
  if (localizedNameKey && localizedNameKey !== 'name') nameProp.aliases = [localizedNameKey];
  if (context) {
    const resolved = resolveValue(context, 'name', 'string');
    if (resolved !== undefined) nameProp.value = resolved;
  }
  result['name'] = nameProp;

  return result;
}

export {
  DOCUMENT_LEVEL_ASPECTS,
  gatherAspectsFromSchema,
  getPathBasedFamiliarAliases,
  getPathBasedFamiliarLabel,
  getPathBasedLabel,
  walkFields,
};
