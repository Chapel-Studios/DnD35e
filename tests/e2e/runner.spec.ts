import { expect, test } from '@playwright/test';

/**
 * Pure infrastructure check — confirms Playwright + TS transform work.
 * Does NOT launch a browser or require Foundry. Real smoke spec (login flow,
 * world bring-up) lands in Story 3 Layer C once helpers and the test-world
 * fixture exist.
 */
test('playwright runner is alive', () => {
  expect(1 + 1).toBe(2);
});
