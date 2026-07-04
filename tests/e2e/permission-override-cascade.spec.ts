import type { BrowserContext } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearWorld, createActor } from './helpers/documents.mjs';
import { clearFieldOverride, setFieldOverride, waitForFieldOverride } from './helpers/fieldOverrides.mjs';
import { gotoGame, loginAs } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet, rerenderSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

const PARENT_PATH = 'system.abilities.str';
const CHILD_PATH = 'system.abilities.str.score';

const childGroup = (page: any, sheet: string) =>
  page.locator(`${sheet} [data-field-path="${CHILD_PATH}"]`).first();

const switchToEditMode = async (page: any, sheet: string) => {
  const editBtn = page.locator(`${sheet} .view-mode-bar .view-mode-btn`).filter({ has: page.locator('i.fa-pen-to-square') });
  await dismissOverlays(page);
  await expect(editBtn).toBeVisible();
  if (await editBtn.evaluate((el: HTMLElement) => el.classList.contains('active'))) return;
  // dispatchEvent instead of click(): the toggle handler is a plain @click, and
  // under heavy canvas load Playwright's actionability "stable" gate can hang
  // indefinitely on the jittering view-mode bar. dispatchEvent sidesteps both
  // the stability check and any residual overlay interception.
  await editBtn.dispatchEvent('click');
  await expect(editBtn).toHaveClass(/active/);
};

test.describe('Permission override cascades', () => {
  let playerContext: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    playerContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  });

  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
    await playerContext.close();
  });

  test('parent visibility override hides child field from player; clearing restores it', async ({ page }) => {
    await gotoGame(page);

    const actorUuid = await createActor(page, 'character', {
      name: 'Visibility Cascade Actor',
      ownership: { default: 3 },
    });

    const playerPage = await loginAs(playerContext, 'player');
    const playerSheet = await openDocumentSheet(playerPage, actorUuid);

    await switchToEditMode(playerPage, playerSheet);

    await expect(childGroup(playerPage, playerSheet)).toBeVisible();

    await setFieldOverride(page, actorUuid, PARENT_PATH, 'visibility', 'gmOnly');
    await waitForFieldOverride(playerPage, actorUuid, PARENT_PATH, 'visibility', 'gmOnly');
    await rerenderSheet(playerPage, actorUuid);
    await switchToEditMode(playerPage, playerSheet).catch(() => {});

    await expect.poll(() => childGroup(playerPage, playerSheet).isHidden()).toBe(true);

    await clearFieldOverride(page, actorUuid, PARENT_PATH, 'visibility');
    await waitForFieldOverride(playerPage, actorUuid, PARENT_PATH, 'visibility', null);
    await rerenderSheet(playerPage, actorUuid);
    await switchToEditMode(playerPage, playerSheet).catch(() => {});

    await expect.poll(() => childGroup(playerPage, playerSheet).isVisible()).toBe(true);
  });

  test('parent editability override disables child input for player', async ({ page }) => {
    await gotoGame(page);

    const actorUuid = await createActor(page, 'character', {
      name: 'Editability Cascade Actor',
      ownership: { default: 3 },
    });

    const playerPage = await loginAs(playerContext, 'player');
    const playerSheet = await openDocumentSheet(playerPage, actorUuid);

    await switchToEditMode(playerPage, playerSheet);

    const input = playerPage.locator(`${playerSheet} [data-field-path="${CHILD_PATH}"] input[type="number"]`).first();
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();

    await setFieldOverride(page, actorUuid, PARENT_PATH, 'editability', 'gmOnly');
    await waitForFieldOverride(playerPage, actorUuid, PARENT_PATH, 'editability', 'gmOnly');
    await rerenderSheet(playerPage, actorUuid);
    await switchToEditMode(playerPage, playerSheet).catch(() => {});

    await expect.poll(() => input.count()).toBe(0);
    await expect(childGroup(playerPage, playerSheet)).toBeVisible();
  });
});
