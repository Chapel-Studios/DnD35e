import { test as base } from '@playwright/test';

/**
 * Playwright fixture providing a clean Foundry world per test.
 * Copies the pristine snapshot into a temp dir, launches Foundry against
 * it, returns the running base URL, and tears it all down afterward.
 *
 * STORY 1 SKELETON — fixture creation and Foundry process management
 * land in Story 3 Layer C / Story 6 alongside the first real E2E spec.
 */
export const test = base.extend<{ testWorldUrl: string }>({
  testWorldUrl: async ({}, use) => {
    throw new Error('withTestWorld fixture not yet implemented — Story 3 Layer C wires it up.');
    // eslint-disable-next-line no-unreachable
    await use('');
  },
});

export { expect } from '@playwright/test';
