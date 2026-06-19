import { expect, test } from '@playwright/test';

import { clearWorld, createActor } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

const STR_BASE_PATH = 'system.abilities.str.base';

test.describe('Projection-pair display (Distance field)', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('number editor writes STR base value to source field', async ({ page }) => {
    await gotoGame(page);

    const actorUuid = await createActor(page, 'character', {
      name: 'Projection Character',
      system: { abilities: { str: { base: 10 } } },
    });

    const sheet = await openDocumentSheet(page, actorUuid);
    const input = page.locator(`${sheet} [data-field-path="${STR_BASE_PATH}"] input[type="number"]`).first();

    await expect(input).toBeVisible();
    await expect(input).toHaveValue('10');

    await dismissOverlays(page);
    await input.click();
    await input.fill('14');
    await page.keyboard.press('Tab');

    await expect.poll(async () => {
      return await page.evaluate(async (uuid) => {
        const actor = await (globalThis as any).fromUuid(uuid);
        return actor?.system?.abilities?.str?.base ?? null;
      }, actorUuid);
    }).toBe(14);
  });

  test('projection round-trip recomputes STR modifier from updated base', async ({ page }) => {
    await gotoGame(page);

    const actorUuid = await createActor(page, 'character', {
      name: 'Projection Roundtrip Character',
      system: { abilities: { str: { base: 12 } } },
    });

    const sheet = await openDocumentSheet(page, actorUuid);
    const input = page.locator(`${sheet} [data-field-path="${STR_BASE_PATH}"] input[type="number"]`).first();

    await expect(input).toHaveValue('12');

    await dismissOverlays(page);
    await input.click();
    await input.fill('18');
    await page.keyboard.press('Tab');

    await expect.poll(async () => {
      return await page.evaluate(async (uuid) => {
        const actor = await (globalThis as any).fromUuid(uuid);
        return actor?.system?.abilities?.str?.mod ?? null;
      }, actorUuid);
    }).toBe(4);

    await expect(input).toHaveValue('18');
  });
});
