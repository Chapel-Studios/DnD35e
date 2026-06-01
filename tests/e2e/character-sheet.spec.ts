import { expect, test } from '@playwright/test';

import { clearWorld, createActor } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

/**
 * Character sheet E2E — Story 1 acceptance tests.
 *
 * Proves the character actor sheet renders correctly end-to-end:
 *   1. Editing a base score (STR 10 → 14) on the abilities tab persists and
 *      the derived modifier updates reactively to +2.
 *   2. Notes tab renders both the Biography (system.description) and
 *      Session Notes (system.notes) rich-text editors.
 */
test.describe('character sheet — Story 1', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('abilities tab — editing STR base score updates modifier to +2', async ({ page }) => {
    await gotoGame(page);
    const uuid = await createActor(page, 'character', { name: 'Test Character' });
    const sheet = await openDocumentSheet(page, uuid);

    // Default tab is `summary` (Story 2). AbilityScoresSection renders on it,
    // so we can edit STR without switching tabs.
    await page.locator(`${sheet} .summary-tab`).waitFor({ state: 'visible' });

    // Edit the STR base input (10 → 14). Scope to the summary tab to avoid
    // strict-mode collisions with the attributes tab (both render the same
    // AbilityScoresSection).
    const strInput = page.locator(
      `${sheet} .summary-tab [data-field-path="system.abilities.str.base"] input[type="number"]`
    );
    await dismissOverlays(page);
    await strInput.click({ clickCount: 3 });
    await strInput.fill('14');
    // Tab triggers blur → @change handler → Foundry document update → derived mod recomputed.
    await page.keyboard.press('Tab');

    // The STR modifier cell updates reactively once prepareDerivedData() runs.
    const strMod = page.locator(
      `${sheet} .summary-tab .ability-row:has([data-field-path="system.abilities.str.base"]) .ability-mod`
    );
    await expect(strMod).toHaveText('+2', { timeout: 5_000 });
  });

  test('notes tab renders biography and session notes editors', async ({ page }) => {
    await gotoGame(page);
    const uuid = await createActor(page, 'character', { name: 'Test Character' });
    const sheet = await openDocumentSheet(page, uuid);

    // Wait for Vue to fully mount (summary is the default tab in Story 2).
    await page.locator(`${sheet} .summary-tab`).waitFor({ state: 'visible' });

    // Switch to the Notes tab.
    await dismissOverlays(page);
    await page.locator(`${sheet} [data-tab="notes"]`).click();

    // Biography editor — system.description (ActorDescriptionTab via CreatureDescriptionTab).
    await expect(
      page.locator(`${sheet} .form-group[data-field-path="system.description"]`)
    ).toBeVisible({ timeout: 5_000 });

    // Session Notes editor — system.notes (CharacterDescriptionTab only).
    await expect(
      page.locator(`${sheet} .form-group[data-field-path="system.notes"]`)
    ).toBeVisible({ timeout: 5_000 });
  });
});
