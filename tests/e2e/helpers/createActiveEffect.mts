import type { Page } from '@playwright/test';

/**
 * Programmatic Active Effect creation on a parent document via `page.evaluate`.
 *
 * STORY 1 SKELETON — concrete impl lands in Story 3 Layer C / Story 6.
 */
export async function createActiveEffect (
  _page: Page,
  _parentUuid: string,
  _data: Record<string, unknown>
): Promise<string> {
  throw new Error('createActiveEffect() not yet implemented — Story 3 Layer C wires it up.');
}
