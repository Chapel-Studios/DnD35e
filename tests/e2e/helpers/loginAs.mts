import type { BrowserContext, Page } from '@playwright/test';

export type FoundryRole = 'gm' | 'player';

/**
 * Logs the given browser context in to Foundry as the named role.
 * Returns the authenticated Page.
 *
 * STORY 1 SKELETON — wired up in Story 3 Layer C / Story 6 once the
 * test-world fixture exists and the spec needs real login flow.
 */
export async function loginAs (_context: BrowserContext, _role: FoundryRole): Promise<Page> {
  throw new Error('loginAs() not yet implemented — Story 3 Layer C wires it up.');
}
