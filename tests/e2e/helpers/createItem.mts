import type { Page } from '@playwright/test';

/**
 * Programmatic item creation via `page.evaluate(() => game.items.create(…))`.
 * Returns the created item's UUID.
 *
 * STORY 1 SKELETON — concrete impl lands in Story 6 when first consumer ships.
 */
export async function createItem (
  _page: Page,
  _type: string,
  _data: Record<string, unknown> = {}
): Promise<string> {
  throw new Error('createItem() not yet implemented — Story 6 wires it up.');
}
