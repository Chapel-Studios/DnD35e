import type { Page } from '@playwright/test';

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
