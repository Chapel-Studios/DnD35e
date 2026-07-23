import { expect, test } from '@playwright/test';

import { clearWorld, createActor, createItem } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { setSystemSetting } from './helpers/setSystemSetting.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

const DISPLAY_UNITS_KEY = 'units';
const DISTANCE_PATH = 'system.speed.land';
const WEIGHT_PATH = 'system.weight';

async function openAttributesTab (page: any, sheet: string): Promise<void> {
  const tab = page.locator(`${sheet} nav.sheet-tabs a[data-tab="attributes"]`).first();
  await tab.waitFor({ state: 'visible', timeout: 10_000 });
  await tab.click();
}

async function openDetailsTab (page: any, sheet: string): Promise<void> {
  const tab = page.locator(`${sheet} nav.sheet-tabs a[data-tab="details"]`).first();
  await tab.waitFor({ state: 'visible', timeout: 10_000 });
  await tab.click();
}

test.describe('Projection-pair display (Distance field)', () => {
  test.afterEach(async ({ page }) => {
    await setSystemSetting(page, DISPLAY_UNITS_KEY, 'imperial').catch(() => {});
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('distance editor writes speed base value to source field (imperial)', async ({ page }) => {
    await gotoGame(page);
    await setSystemSetting(page, DISPLAY_UNITS_KEY, 'imperial');

    const actorUuid = await createActor(page, 'character', {
      name: 'Projection Distance Character',
      system: { speed: { land: 30 } },
    });

    const sheet = await openDocumentSheet(page, actorUuid);
    await openAttributesTab(page, sheet);

    const input = page.locator(`${sheet} [data-field-path="${DISTANCE_PATH}"] input[type="number"]`).first();

    await expect(input).toBeVisible();
    await expect(input).toHaveValue('30');

    await dismissOverlays(page);
    await input.click();
    await input.fill('35');
    await page.keyboard.press('Tab');

    await expect.poll(async () => {
      return await page.evaluate(async (uuid) => {
        const actor = await (globalThis as any).fromUuid(uuid);
        return actor?._source?.system?.speed?.land ?? null;
      }, actorUuid);
    }).toBe(35);
  });

  test('distance projection honors metric unit conversion (localized input -> stored feet)', async ({ page }) => {
    await gotoGame(page);
    await setSystemSetting(page, DISPLAY_UNITS_KEY, 'metric');

    const actorUuid = await createActor(page, 'character', {
      name: 'Projection Distance Metric Character',
      system: { speed: { land: 30 } },
    });

    const sheet = await openDocumentSheet(page, actorUuid);
    await openAttributesTab(page, sheet);

    const input = page.locator(`${sheet} [data-field-path="${DISTANCE_PATH}"] input[type="number"]`).first();

    // Stored 30 ft is displayed as 9 m in metric mode: (30 / 5) * 1.5 = 9.
    await expect(input).toHaveValue('9');

    await dismissOverlays(page);
    await input.click();
    await input.fill('12');
    await page.keyboard.press('Tab');

    await expect.poll(async () => {
      return await page.evaluate(async (uuid) => {
        const actor = await (globalThis as any).fromUuid(uuid);
        return actor?._source?.system?.speed?.land ?? null;
      }, actorUuid);
    }).toBe(40);

    await expect(input).toHaveValue('12');
  });

  test('weight projection honors metric unit conversion on item sheet', async ({ page }) => {
    await gotoGame(page);
    await setSystemSetting(page, DISPLAY_UNITS_KEY, 'metric');

    const itemUuid = await createItem(page, 'weapon', {
      name: 'Projection Weight Metric Weapon',
      system: { weight: 10 },
    });

    const sheet = await openDocumentSheet(page, itemUuid);
    await openDetailsTab(page, sheet);

    const input = page.locator(`${sheet} [data-field-path="${WEIGHT_PATH}"] input[type="number"]`).first();

    // Stored 10 lb is displayed as 5 kg in metric mode: 10 * 0.5 = 5.
    await expect(input).toHaveValue('5');

    await dismissOverlays(page);
    await input.click();
    await input.fill('8');
    await page.keyboard.press('Tab');

    await expect.poll(async () => {
      return await page.evaluate(async (uuid) => {
        const item = await (globalThis as any).fromUuid(uuid);
        return item?._source?.system?.weight ?? null;
      }, itemUuid);
    }).toBe(16);

    await expect(input).toHaveValue('8');
  });
});
