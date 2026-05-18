import type { Page } from '@playwright/test';

/**
 * Programmatic item creation via Foundry's Item.create().
 *
 * Returns the created item's UUID. The caller's page must already be on
 * `/game` with `game.ready === true` and authenticated as a user that has
 * permission to create world items (i.e. GM).
 */
export async function createItem (
  page: Page,
  type: string,
  data: Record<string, unknown> = {}
): Promise<string> {
  const uuid = await page.evaluate(async ({ type, data }) => {
    const Item = (globalThis as any).Item;
    const created = await Item.create({
      type,
      name: (data as any).name ?? 'Test Item',
      ...data,
    });
    if (!created?.uuid) throw new Error('Item.create returned no uuid');
    return created.uuid as string;
  }, { type, data });
  return uuid;
}

/**
 * Programmatic Active Effect creation on a parent document.
 *
 * Returns the created AE's UUID. Caller must be authenticated as GM (or a
 * user with permission to edit the parent document).
 */
export async function createActiveEffect (
  page: Page,
  parentUuid: string,
  data: Record<string, unknown>
): Promise<string> {
  const uuid = await page.evaluate(async ({ parentUuid, data }) => {
    const fromUuid = (globalThis as any).fromUuid;
    const parent = await fromUuid(parentUuid);
    if (!parent) throw new Error(`createActiveEffect: parent not found at ${parentUuid}`);
    const created = await parent.createEmbeddedDocuments('ActiveEffect', [data]);
    const ae = created?.[0];
    if (!ae?.uuid) throw new Error('createEmbeddedDocuments returned no uuid');
    return ae.uuid as string;
  }, { parentUuid, data });
  return uuid;
}

/**
 * Wipe all world-level documents Foundry's UI exposes to a GM.
 *
 * Call from `afterEach` in any spec that creates documents, so the next test
 * starts from a clean slate without paying the cost of a full world reboot.
 *
 * Pattern lifted from D35E's `test/e2e/helpers.js#clearWorld`.
 */
export async function clearWorld (page: Page): Promise<void> {
  await page.evaluate(async () => {
    const g = (globalThis as any).game;
    if (!g?.ready) return;
    await Promise.all([
      ...g.actors.map((a: any) => a.delete()),
      ...g.items.map((i: any) => i.delete()),
      ...g.messages.map((m: any) => m.delete()),
      // Scenes intentionally NOT cleared — the snapshot's "Test Scene" is
      // expected to persist. If a test creates extra scenes, it should
      // delete them itself.
    ]);
  });
}
