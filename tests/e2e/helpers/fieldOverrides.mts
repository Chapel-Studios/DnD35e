import type { Page } from '@playwright/test';

import type { FieldEditability, FieldOverrideKey, FieldVisibility } from '../../../src/vue/components/Fields/FormGroups/fieldPermissions.mjs';
import { encodeFieldPath, FIELD_OVERRIDES_FLAG } from '../../../src/vue/components/Fields/FormGroups/fieldPermissions.mjs';

export type { FieldEditability, FieldOverrideKey, FieldVisibility };

/**
 * Programmatically set a single field-permission override on a document.
 *
 * Writes to `flags.dnd35e.fieldOverrides.{encodedPath}.{key}`, the same flag
 * path the in-app `setFieldOverride` action targets. Caller must be
 * authenticated as a user that can edit the document (GM in practice).
 */
export async function setFieldOverride (
  page: Page,
  docUuid: string,
  fieldPath: string,
  key: FieldOverrideKey,
  value: FieldVisibility | FieldEditability
): Promise<void> {
  const encoded = encodeFieldPath(fieldPath);
  await page.evaluate(async ({ docUuid, encoded, key, value, flagKey }) => {
    const doc = await (globalThis as any).fromUuid(docUuid);
    if (!doc) throw new Error(`setFieldOverride: doc not found at ${docUuid}`);
    const flag = doc.getFlag('dnd35e', flagKey) ?? {};
    const entry = { ...(flag[encoded] ?? {}) };
    entry[key] = value;
    await doc.setFlag('dnd35e', flagKey, { ...flag, [encoded]: entry });
  }, { docUuid, encoded, key, value, flagKey: FIELD_OVERRIDES_FLAG });
}

/**
 * Programmatically clear a single field-permission override key on a document.
 * Removes the entry entirely when both override keys are absent.
 */
export async function clearFieldOverride (
  page: Page,
  docUuid: string,
  fieldPath: string,
  key: FieldOverrideKey
): Promise<void> {
  const encoded = encodeFieldPath(fieldPath);
  await page.evaluate(async ({ docUuid, encoded, key, flagKey }) => {
    const doc = await (globalThis as any).fromUuid(docUuid);
    if (!doc) throw new Error(`clearFieldOverride: doc not found at ${docUuid}`);
    const flag = doc.getFlag('dnd35e', flagKey) ?? {};
    const entry = { ...(flag[encoded] ?? {}) };
    delete entry[key];
    // Foundry `setFlag` merges; explicit deletion uses the `-=` prefix.
    if (Object.keys(entry).length === 0) {
      await doc.update({
        [`flags.dnd35e.${flagKey}.-=${encoded}`]: null,
      });
    } else {
      await doc.update({
        [`flags.dnd35e.${flagKey}.${encoded}.-=${key}`]: null,
      });
    }
  }, { docUuid, encoded, key, flagKey: FIELD_OVERRIDES_FLAG });
}
