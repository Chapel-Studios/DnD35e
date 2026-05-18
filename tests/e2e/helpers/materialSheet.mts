import type { Locator, Page } from '@playwright/test';

import { openDocumentSheet } from './sheets.mjs';

/**
 * Page object for the Material Active Effect sheet.
 *
 * Encapsulates the surfaces shared by the Cycle E specs: opening the sheet,
 * switching between Details / Duration / Changes tabs, and reading the rows
 * rendered in the Changes panel.
 *
 * Returns a bag of locators and helpers scoped to a single sheet selector
 * so successive operations stay isolated to the AE under test.
 */
export interface MaterialSheetPO {
  /** AppV2 root selector for the AE sheet (e.g. `#MaterialSheet-abc123`). */
  sheetSelector: string;
  sheet: Locator;
  detailsTab: Locator;
  changesTab: Locator;
  /** Click the tab nav anchor for `tabId`. */
  activateTab: (tabId: 'details' | 'duration' | 'changes') => Promise<void>;
  /** Locator for the `.change-row` at the given zero-based index. */
  changeRow: (index: number) => Locator;
  /** Locator for all `.change-row` elements (in order). */
  changeRows: () => Locator;
  /**
   * Read the `[name="system.changes.{i}.key"]` input value for every row.
   * Used to assert which fields a Material AE is emitting changes for.
   */
  readChangeKeys: () => Promise<string[]>;
}

/**
 * Open the AE sheet for `effectUuid` and return the page-object handle.
 */
export async function openMaterialSheet (page: Page, effectUuid: string): Promise<MaterialSheetPO> {
  const sheetSelector = await openDocumentSheet(page, effectUuid);
  const sheet = page.locator(sheetSelector);

  const tabAnchor = (tabId: string) => sheet.locator(`nav.sheet-tabs a[data-tab="${tabId}"]`);

  return {
    sheetSelector,
    sheet,
    detailsTab: tabAnchor('details'),
    changesTab: tabAnchor('changes'),
    activateTab: async (tabId) => {
      const anchor = tabAnchor(tabId);
      // Wait for the Vue-rendered tab nav to mount before clicking.
      await anchor.waitFor({ state: 'visible', timeout: 10_000 });
      await anchor.click();
    },
    changeRow: (index: number) => sheet.locator(`.change-row[data-index="${index}"]`),
    changeRows: () => sheet.locator('.changes-list .change-row'),
    readChangeKeys: async () => {
      const inputs = sheet.locator('.changes-list .change-row .aspect-picker-input');
      const count = await inputs.count();
      const values: string[] = [];
      for (let i = 0; i < count; i++) {
        values.push(await inputs.nth(i).inputValue());
      }
      return values;
    },
  };
}
