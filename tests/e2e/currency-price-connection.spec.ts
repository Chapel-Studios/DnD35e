import { expect, test } from '@playwright/test';

import { clearWorld, createItem } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { getSystemSetting, setSystemSetting } from './helpers/setSystemSetting.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

const CURRENCY_CONFIG_KEY = 'currencyConfig';

type CoinageDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  valueInGp: number;
  weightLbs: number;
  isSystem: boolean;
  enabled: boolean;
  visibility: 'everyone' | 'gmSelect' | 'gmOnly';
  excludeFromRollUp: boolean;
};

type CurrencyConfig = {
  coinages: CoinageDefinition[];
  defaultDisplayCoin: string;
  rollUpTargetCoin: string;
  autoIdCounter: number;
};

async function openDetailsTab(page: any, sheet: string): Promise<void> {
  const tab = page.locator(`${sheet} nav.sheet-tabs a[data-tab="details"]`).first();
  await tab.waitFor({ state: 'visible', timeout: 10_000 });
  await tab.click();
}

test.describe('Currency settings -> item price integration', () => {
  let originalCurrencyConfig: CurrencyConfig;

  test.beforeEach(async ({ page }) => {
    await gotoGame(page);
    originalCurrencyConfig = await getSystemSetting<CurrencyConfig>(page, CURRENCY_CONFIG_KEY);
  });

  test.afterEach(async ({ page }) => {
    await setSystemSetting(page, CURRENCY_CONFIG_KEY, originalCurrencyConfig).catch(() => {});
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('item price field uses configured default coin and unit options, and persists stack updates', async ({ page }) => {
    const customConfig: CurrencyConfig = {
      coinages: [
        {
          id: 'srd_sp',
          label: 'Silver Piece',
          shortLabel: 'spx',
          valueInGp: 0.1,
          weightLbs: 0.02,
          isSystem: true,
          enabled: true,
          visibility: 'everyone',
          excludeFromRollUp: false,
        },
        {
          id: 'srd_gp',
          label: 'Gold Piece',
          shortLabel: 'gpx',
          valueInGp: 1,
          weightLbs: 0.02,
          isSystem: true,
          enabled: true,
          visibility: 'everyone',
          excludeFromRollUp: false,
        },
      ],
      defaultDisplayCoin: 'srd_sp',
      rollUpTargetCoin: 'srd_gp',
      autoIdCounter: 0,
    };

    await setSystemSetting(page, CURRENCY_CONFIG_KEY, customConfig);

    const itemUuid = await createItem(page, 'weapon', {
      name: 'Currency Settings Integration Sword',
      system: {
        price: { stacks: [] },
      },
    });

    const sheet = await openDocumentSheet(page, itemUuid);
    await openDetailsTab(page, sheet);

    const priceField = page.locator(`${sheet} [data-field-path="system.price"]`).first();
    await expect(priceField).toBeVisible();

    // Empty price display should honor currencyConfig.defaultDisplayCoin.shortLabel.
    await expect(priceField.locator('.zero-value')).toContainText('0 spx');

    // Add a stack and verify default coin selection comes from configured coin order.
    await dismissOverlays(page);
    await priceField.locator('.add-item-btn').click();

    const unitSelect = priceField.locator('select.vui-unit:not(.select-sizer)').first();
    const valueInput = priceField.locator('input.vui-value').first();

    await expect(unitSelect).toHaveValue('srd_sp');

    // Select labels should reflect custom short labels from settings.
    await expect(unitSelect.locator('option[value="srd_sp"]')).toHaveText('spx');
    await expect(unitSelect.locator('option[value="srd_gp"]')).toHaveText('gpx');

    // Update count and unit through UI, then assert persisted source shape.
    await dismissOverlays(page);
    await valueInput.click();
    await valueInput.fill('7');
    await page.keyboard.press('Tab');

    await unitSelect.selectOption('srd_gp');

    await expect.poll(async () => {
      return await page.evaluate(async (uuid) => {
        const item = await (globalThis as any).fromUuid(uuid);
        return item?._source?.system?.price?.stacks ?? null;
      }, itemUuid);
    }).toEqual([{ coinId: 'srd_gp', count: 7 }]);
  });
});
