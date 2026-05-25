import type { Page } from '@playwright/test';

import type { FieldEditability, FieldOverrideKey, FieldVisibility } from '../../../src/vue/components/fields/formGroups/fieldPermissions.mjs';
import { encodeFieldPath, FIELD_OVERRIDES_FLAG } from '../../../src/vue/components/fields/formGroups/fieldPermissions.mjs';

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
  await page.evaluate(async ({ docUuid, encoded, key, value, flagKey }: {
    docUuid: string;
    encoded: string;
    key: FieldOverrideKey;
    value: FieldVisibility | FieldEditability;
    flagKey: string;
  }) => {
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
  await page.evaluate(async ({ docUuid, encoded, key, flagKey }: {
    docUuid: string;
    encoded: string;
    key: FieldOverrideKey;
    flagKey: string;
  }) => {
    const doc = await (globalThis as any).fromUuid(docUuid);
    if (!doc) throw new Error(`clearFieldOverride: doc not found at ${docUuid}`);
    const flag = doc.getFlag('dnd35e', flagKey) ?? {};
    const entry = { ...(flag[encoded] ?? {}) };
    delete entry[key];
    // Use setFlag with the `-=key` convention embedded in the value object.
    // Foundry's mergeObject handles `-=` prefixes at any nesting depth, and
    // setFlag avoids the server-side `_updateDocuments` path that fails with
    // deeply-nested dotted deletion paths in V14.
    if (Object.keys(entry).length === 0) {
      await doc.setFlag('dnd35e', flagKey, { [`-=${encoded}`]: null });
    } else {
      await doc.setFlag('dnd35e', flagKey, { [encoded]: { [`-=${key}`]: null } });
    }
  }, { docUuid, encoded, key, flagKey: FIELD_OVERRIDES_FLAG });
}

/**
 * Wait until a given page's view of the document's field-override flag matches
 * the expected value (or absence). Use this on the player page after a GM-side
 * setFieldOverride / clearFieldOverride so the websocket-propagated update has
 * landed before forcing a sheet re-render.
 *
 * Pass `expected === null` to wait for the key to be absent.
 */
export async function waitForFieldOverride (
  page: Page,
  docUuid: string,
  fieldPath: string,
  key: FieldOverrideKey,
  expected: FieldVisibility | FieldEditability | null,
  timeoutMs = 3000
): Promise<void> {
  const encoded = encodeFieldPath(fieldPath);
  await page.waitForFunction(
    ({ docUuid, encoded, key, expected, flagKey }: {
      docUuid: string;
      encoded: string;
      key: FieldOverrideKey;
      expected: FieldVisibility | FieldEditability | null;
      flagKey: string;
    }) => {
      const doc = (globalThis as any).fromUuidSync?.(docUuid);
      if (!doc) return false;
      const flag = doc.getFlag('dnd35e', flagKey) ?? {};
      const actual = flag[encoded]?.[key] ?? null;
      return actual === expected;
    },
    { docUuid, encoded, key, expected, flagKey: FIELD_OVERRIDES_FLAG },
    { timeout: timeoutMs }
  );
}
