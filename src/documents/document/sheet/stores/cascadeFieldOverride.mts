/**
 * Pure cascade helpers for field overrides.
 *
 * Extracted from {@link FieldOverridesStore} so the cascade logic can be unit-tested
 * without mounting a document, schema, or Vue reactivity. The store wires these
 * helpers up to its document/flag/schema resolver; tests pass in a synthetic
 * resolver function.
 *
 * @module
 */

import type {
  FieldEditability,
  FieldOverride,
  FieldOverrideKey,
  FieldVisibility,
} from '@vc/Fields/FormGroups/fieldPermissions.mjs';
import {
  everyoneVisibility,
  normalEditability,
} from '@vc/Fields/FormGroups/fieldPermissions.mjs';

/** Resolved (non-optional) value type for a given override key. */
export type FieldOverrideValue<K extends FieldOverrideKey> = NonNullable<FieldOverride[K]>;

/**
 * Per-key restrictiveness ranking. Higher number = more restrictive.
 *
 * Visibility: `everyone` (0) < `ownerPlus` (1) < `gmOnly` (2).
 * Editability: `normal` (0) < `gmOnly` (1).
 */
export const OVERRIDE_RANKS: { [K in FieldOverrideKey]: Record<string, number> } = {
  visibility: { everyone: 0, ownerPlus: 1, gmOnly: 2 },
  editability: { normal: 0, gmOnly: 1 },
};

/** Default override values for each key (used for document-level / non-schema paths). */
export const OVERRIDE_DEFAULTS: { [K in FieldOverrideKey]: FieldOverrideValue<K> } = {
  visibility: everyoneVisibility as FieldVisibility,
  editability: normalEditability as FieldEditability,
};

/**
 * Pick the more restrictive of two values for a given override key.
 * Returns `undefined` only when both inputs are `undefined`.
 */
export function pickMoreRestrictive<K extends FieldOverrideKey>(
  key: K,
  a: FieldOverrideValue<K> | undefined,
  b: FieldOverrideValue<K> | undefined
): FieldOverrideValue<K> | undefined {
  if (a == null) return b;
  if (b == null) return a;
  const ranks = OVERRIDE_RANKS[key];
  return (ranks[a] ?? -1) >= (ranks[b] ?? -1) ? a : b;
}

/**
 * Resolver for a single (path, key) lookup with no cascade — i.e. flag override
 * at that path, or schema/document default at that path, or `undefined`.
 */
export type ResolveAtPath = <K extends FieldOverrideKey>(
  fieldPath: string,
  key: K,
) => FieldOverrideValue<K> | undefined;

/**
 * Cascade a single override key from a field path up through its `system.*` ancestor chain.
 *
 * Resolution rules:
 * - Non-system paths (e.g. `name`, `img`) are not cascaded — the resolver's value is returned as-is.
 * - For `system.a.b.c.d`, the cascade walks ancestors `system.a.b.c`, `system.a.b`, `system.a`
 *   (but **not** the bare `system` root), picking the most-restrictive value seen at each level.
 * - The child path's own value is the starting point; each ancestor can only tighten it.
 *
 * @param fieldPath - the dotted field path (e.g. `system.hp.value`)
 * @param key - which override key to cascade (`visibility` or `editability`)
 * @param resolveAtPath - resolver returning the override value at a single path with no cascade
 */
export function cascadeFieldOverride<K extends FieldOverrideKey>(
  fieldPath: string,
  key: K,
  resolveAtPath: ResolveAtPath
): FieldOverrideValue<K> | undefined {
  let result = resolveAtPath(fieldPath, key);

  if (!fieldPath.startsWith('system.')) return result;

  const parts = fieldPath.split('.');
  for (let i = parts.length - 1; i > 1; i--) {
    const parentPath = parts.slice(0, i).join('.');
    const parentValue = resolveAtPath(parentPath, key);
    if (parentValue != null) {
      result = pickMoreRestrictive(key, result, parentValue);
    }
  }

  return result;
}
