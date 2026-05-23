/**
 * Type-safe UUID helpers for resolving compendium documents.
 *
 * Foundry's `fromUuid` returns `ClientDocument | null`, which is untyped at the
 * call site. These wrappers provide typed returns and consistent null-on-error
 * semantics so callers never have to catch UUID resolution failures themselves.
 */

/** UUID format: `Compendium.<scope>.<pack>.<id>` or `<Type>.<id>` (world). */
const UUID_PATTERN = /^(?:Compendium\.[^.]+\.[^.]+\.[A-Za-z0-9]{16}|[A-Za-z]+\.[A-Za-z0-9]{16})$/;

/**
 * Returns `true` if `uuid` matches Foundry's expected UUID shape.
 * Does not verify the document actually exists.
 */
export function isValidUuid(uuid: string): boolean {
  return UUID_PATTERN.test(uuid);
}

/**
 * Resolves a single UUID to a typed document. Returns `null` if the UUID is
 * invalid, the document doesn't exist, or resolution throws for any reason.
 */
export async function fromCompendiumUuid<T extends foundry.abstract.Document>(
  uuid: string
): Promise<T | null> {
  if (!isValidUuid(uuid)) return null;
  try {
    const doc = await fromUuid(uuid);
    return (doc as T | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves an array of UUIDs in parallel. Returns a `Map` keyed by UUID where
 * each value is the resolved document or `null` for any that failed.
 */
export async function resolveUuids<T extends foundry.abstract.Document>(
  uuids: string[]
): Promise<Map<string, T | null>> {
  const entries = await Promise.all(
    uuids.map(async (uuid) => [uuid, await fromCompendiumUuid<T>(uuid)] as const)
  );
  return new Map(entries);
}
