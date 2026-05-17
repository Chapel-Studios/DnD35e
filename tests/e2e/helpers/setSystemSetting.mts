import type { Page } from '@playwright/test';

const SYSTEM_ID = 'dnd35e';

/**
 * Programmatically set a system-level Foundry setting via
 * `game.settings.set(SYSTEM_ID, key, value)`. Caller's page must already be on
 * `/game` with `game.ready === true` and authenticated as a user who can mutate
 * world settings (GM).
 */
export async function setSystemSetting<TValue> (
  page: Page,
  key: string,
  value: TValue
): Promise<void> {
  await page.evaluate(async ({ systemId, key, value }) => {
    await (globalThis as any).game.settings.set(systemId, key, value);
  }, { systemId: SYSTEM_ID, key, value });
}

/** Read a current system-level setting value. */
export async function getSystemSetting<TValue> (page: Page, key: string): Promise<TValue> {
  return await page.evaluate(({ systemId, key }) => {
    return (globalThis as any).game.settings.get(systemId, key) as TValue;
  }, { systemId: SYSTEM_ID, key });
}
