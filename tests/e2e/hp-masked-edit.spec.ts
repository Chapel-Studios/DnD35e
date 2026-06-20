import { expect, test } from '@playwright/test';

import { clearWorld, createActiveEffect, createActor, createItem } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

const HP_CURRENT_PATH = 'system.hp.current';

const playButton = (page: any, sheet: string) =>
  page.locator(`${sheet} .view-mode-bar .view-mode-btn`).filter({ has: page.locator('i.fa-dice-d20') });

test.describe('HP masked edit (delta-mirror strategy)', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test.skip('TODO(poc.6): actor mask read/write path is incomplete mid-phase; re-enable after actor mask implementation + final phase 6 E2E pass', async ({ page }) => {
    await gotoGame(page);

    const actorUuid = await createActor(page, 'character', {
      name: 'Delta Mirror Actor',
      ownership: { default: 3 },
      system: { hp: { current: 100, max: 100, temp: 0, nonlethal: 0 } },
    });

    await createActiveEffect(page, actorUuid, {
      type: 'secret',
      name: 'Masked HP',
      disabled: false,
      changes: [{
        key: HP_CURRENT_PATH,
        value: 80,
        type: 'mask',
        target: 'actor',
        priority: 10,
        phase: 'core',
      }],
    });

    const sheet = await openDocumentSheet(page, actorUuid);
    await dismissOverlays(page);

    const input = page.locator(`${sheet} [data-field-path="${HP_CURRENT_PATH}"] input[type="number"]`).first();

    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue('100');

    await input.click({ clickCount: 3 });
    await input.fill('110');
    await page.keyboard.press('Tab');

    await expect.poll(async () => {
      return await page.evaluate(async ({ uuid, fieldPath }) => {
        const actor = await (globalThis as any).fromUuid(uuid);
        const playerEditSecret = actor?.effects?.find((e: any) => e?.system?.isPlayerEditSecret);
        const playerEditChange = playerEditSecret?.system?.changes?.find((c: any) => c?.key === fieldPath);
        return {
          source: actor?._source?.system?.hp?.current ?? null,
          mask: playerEditChange?.value ?? null,
        };
      }, { uuid: actorUuid, fieldPath: HP_CURRENT_PATH });
    }).toEqual({ source: 110, mask: 90 });

    await expect(input).toHaveValue('110');
  });

  test('GM edit-mode HP change mirrors delta into effective play-mode mask value', async ({ page }) => {
    await gotoGame(page);

    const itemUuid = await createItem(page, 'weapon', {
      name: 'Delta Mirror Weapon',
      ownership: { default: 3 },
      system: { hp: { current: 100, max: 100 } },
    });

    await createActiveEffect(page, itemUuid, {
      type: 'secret',
      name: 'Masked HP',
      disabled: false,
      changes: [{
        key: HP_CURRENT_PATH,
        value: 70,
        type: 'mask',
        target: 'item',
        priority: 10,
        phase: 'core',
      }],
    });

    const sheet = await openDocumentSheet(page, itemUuid);
    await dismissOverlays(page);

    const input = page.locator(`${sheet} [data-field-path="${HP_CURRENT_PATH}"] input[type="number"]`).first();
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('100');

    await input.click({ clickCount: 3 });
    await input.fill('120');
    await page.keyboard.press('Tab');

    await expect.poll(async () => {
      return await page.evaluate(async (uuid) => {
        const item = await (globalThis as any).fromUuid(uuid);
        return item?._source?.system?.hp?.current ?? null;
      }, itemUuid);
    }).toBe(120);

    await expect.poll(async () => {
      return await page.evaluate(async ({ uuid, fieldPath }) => {
        const item = await (globalThis as any).fromUuid(uuid);
        return item?._masks?.[fieldPath] ?? null;
      }, { uuid: itemUuid, fieldPath: HP_CURRENT_PATH });
    }).toBe(90);

    await playButton(page, sheet).click();
    await expect(page.locator(`${sheet} .item-hp-section .hp-display`).first()).toContainText('90');
  });
});
