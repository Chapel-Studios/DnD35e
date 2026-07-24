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
      name: 'Test Item',
      ...data,
      type, // enforced last — caller cannot override the explicit type parameter
    });
    if (!created?.uuid) throw new Error('Item.create returned no uuid');
    return created.uuid as string;
  }, { type, data });
  return uuid;
}

/**
 * Programmatic actor creation via Foundry's Actor.create().
 *
 * Returns the created actor's UUID. Caller must be authenticated as GM.
 */
export async function createActor (
  page: Page,
  type: string,
  data: Record<string, unknown> = {}
): Promise<string> {
  const uuid = await page.evaluate(async ({ type, data }) => {
    const Actor = (globalThis as any).Actor;
    const created = await Actor.create({
      name: 'Test Actor',
      ...data,
      type, // enforced last — caller cannot override the explicit type parameter
    });
    if (!created?.uuid) throw new Error('Actor.create returned no uuid');
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
 * Stow an item into a container by driving the container sheet's real
 * `_onDrop` handler with a synthetic Foundry drag payload.
 *
 * This exercises the exact production code path a user's drag-and-drop takes:
 * `ContainerSheet._onDrop` → `#onItemDrop` → `syncContainmentAe`, which is what
 * actually creates the item-contribution ActiveEffect on the container (and
 * sets the item's `system.containerUuid`).
 *
 * Prefer this over setting `system.containerUuid` directly: a direct update
 * bypasses the "add" branch of `syncContainmentAe` (the item already reports as
 * being in the right container, so no contribution AE is created).
 *
 * Caller must be authenticated as GM. Both documents must already exist.
 */
export async function stowItemViaDrop (
  page: Page,
  itemUuid: string,
  containerUuid: string
): Promise<void> {
  await page.evaluate(async ({ itemUuid, containerUuid }) => {
    const fromUuid = (globalThis as any).fromUuid;
    const container = await fromUuid(containerUuid);
    if (!container) throw new Error(`stowItemViaDrop: container not found at ${containerUuid}`);
    const item = await fromUuid(itemUuid);
    if (!item) throw new Error(`stowItemViaDrop: item not found at ${itemUuid}`);

    // Build the Foundry drag payload the sheet's _onDrop expects.
    const dragData = JSON.stringify({ type: 'Item', uuid: itemUuid });
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', dragData);
    const dropEvent = new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true });

    // container.sheet is a ContainerSheet; _onDrop routes to syncContainmentAe.
    const sheet = container.sheet;
    if (!sheet) throw new Error('stowItemViaDrop: container has no sheet');
    await sheet._onDrop(dropEvent);
  }, { itemUuid, containerUuid });
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
    // Delete sequentially (not Promise.all): containers run cleanup handlers on
    // their contents when destroyed. Deleting a container and its contents
    // concurrently races the cleanup `update` against the sibling delete, which
    // the server rejects ("Cannot read properties of undefined (reading '_id')").
    // Actors first (embedded items go with them), then remaining world items.
    for (const a of [...g.actors]) await a.delete();
    for (const i of [...g.items]) await i.delete();
    for (const m of [...g.messages]) await m.delete();
    // Scenes intentionally NOT cleared — the snapshot's "Test Scene" is
    // expected to persist. If a test creates extra scenes, it should
    // delete them itself.
  });
}
