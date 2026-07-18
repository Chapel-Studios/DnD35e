import { expect, test } from '@playwright/test';

import { clearWorld, createItem, stowItemViaDrop } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';

/**
 * E2E test for container nesting and data rollup.
 *
 * Tests a complex hierarchy:
 * - Actor owns a "chest" container
 * - In chest: a "sword" (5 lb, 5 gp, qty 1) and a "coin purse" container
 * - In coin purse: 10 pp + 50 cp (displayed as 10 cp in purse), 1 lb, qty 1
 *   - Contains 5 "ninja stars" (0.1 lb each, 5 sp each, qty 5)
 *
 * Verifies:
 * 1. Coin purse header shows correct rollup: 5 items, 1.7 lb, value includes purse + stars
 * 2. Chest header shows correct rollup: 2 items, all weights, all values
 * 3. Individual item data is preserved correctly
 *
 * Nesting is driven through the real drop handler (`stowItemViaDrop` →
 * `ContainerSheet._onDrop` → `syncContainmentAe`) so the test exercises the
 * production containment code path rather than mutating `containerUuid` directly.
 */

test.describe('container nesting and data rollup', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('actor with nested containers: verify data travels and rolls up correctly', async ({ page }) => {
    await gotoGame(page);

    // Create actor and all items directly on the actor
    const uuids = await page.evaluate(
      async () => {
        const actor = await (globalThis as any).Actor.create({ 
          type: 'character', 
          name: 'Test Actor', 
        });

        // Create all items on the actor
        const [chest, sword, coinPurse, ninjaStar] = await actor.createEmbeddedDocuments('Item', [
          {
            type: 'container',
            name: 'Chest',
            system: {
              weight: 2,
              quantity: 1,
            },
          },
          {
            type: 'weapon',
            name: 'Sword',
            system: {
              weight: 5,
              quantity: 1,
              price: { stacks: [{ coinId: 'srd_gp', count: 5 }], srdEquivalent: 5 },
            },
          },
          {
            type: 'container',
            name: 'Coin Purse',
            system: {
              weight: 1,
              quantity: 1,
              containedCurrency: {
                stacks: [
                  { coinId: 'srd_pp', count: 10 },
                  { coinId: 'srd_cp', count: 50 },
                ],
                srdEquivalent: 10.5,
              },
            },
          },
          {
            type: 'weapon',
            name: 'Ninja Star',
            system: {
              weight: 0.1,
              quantity: 5,
              price: { stacks: [{ coinId: 'srd_sp', count: 5 }], srdEquivalent: 0.5 },
            },
          },
        ]);

        return {
          actorUuid: actor.uuid,
          chestUuid: chest.uuid,
          swordUuid: sword.uuid,
          coinPurseUuid: coinPurse.uuid,
          ninjaStarUuid: ninjaStar.uuid,
        };
      }
    );

    const { chestUuid, swordUuid, coinPurseUuid, ninjaStarUuid } = uuids;

    // Build the hierarchy via the real drop handler (exercises syncContainmentAe):
    //   chest ← sword, chest ← coinPurse, coinPurse ← ninjaStar
    await stowItemViaDrop(page, swordUuid, chestUuid);
    await stowItemViaDrop(page, coinPurseUuid, chestUuid);
    await stowItemViaDrop(page, ninjaStarUuid, coinPurseUuid);

    // Open coin purse sheet
    const coinPurseSheet = await openDocumentSheet(page, coinPurseUuid);

    // Wait for the container summary to be visible
    await page.locator(`${coinPurseSheet} .container-summary`).waitFor({ state: 'visible', timeout: 10_000 });

    // Verify coin purse header data
    // Expected: 5 items (5 ninja stars), 1.7 lb (1 lb purse + 0.1*5 stars + 1.2 lb coins),
    // value 10pp + 3gp (10pp + 50cp own currency + 25sp from stars, consolidated: 50cp + 25sp = 30sp = 3gp)
    const coinPurseCountText = await page.locator(`${coinPurseSheet} .container-summary .count`).textContent();
    expect(coinPurseCountText).toContain('5');

    const coinPurseWeightText = await page.locator(`${coinPurseSheet} .container-summary .weight`).textContent();
    expect(coinPurseWeightText).toMatch(/1\.7|1\.70/);

    const coinPurseValueText = await page.locator(`${coinPurseSheet} .container-summary .value`).textContent();
    // Consolidated value: 10 pp, 3 gp
    expect(coinPurseValueText).toMatch(/10.*pp.*3.*gp/i);

    // Verify ninja star data is intact
    const ninjaStar = await page.evaluate(
      async (uuid) => {
        const item = await (globalThis as any).fromUuid(uuid);
        return {
          name: item.name,
          weight: item.system.weight,
          quantity: item.system.quantity,
          price: item.system.price.stacks,
        };
      },
      ninjaStarUuid
    );

    expect(ninjaStar.name).toBe('Ninja Star');
    expect(ninjaStar.weight).toBe(0.1);
    expect(ninjaStar.quantity).toBe(5);
    expect(ninjaStar.price).toEqual([{ coinId: 'srd_sp', count: 5 }]);

    // Close coin purse and open chest sheet
    await closeAllSheets(page);
    await page.waitForTimeout(500); // Give it a moment to close

    const chestSheet = await openDocumentSheet(page, chestUuid);

    // Wait for the container summary to be visible
    await page.locator(`${chestSheet} .container-summary`).waitFor({ state: 'visible', timeout: 10_000 });

    // Verify chest header data
    // Expected: 2 items (sword + coin purse, direct children), 7.7 lb (5 lb sword + 1 lb purse
    // + 0.5 lb stars + 1.2 lb coins, deep rollup), value 10pp + 8gp (5gp sword + coin purse's
    // 10pp+3gp rolled up, consolidated)
    const chestCountText = await page.locator(`${chestSheet} .container-summary .count`).textContent();
    expect(chestCountText).toContain('2');

    const chestWeightText = await page.locator(`${chestSheet} .container-summary .weight`).textContent();
    expect(chestWeightText).toMatch(/7\.7|7\.70/);

    const chestValueText = await page.locator(`${chestSheet} .container-summary .value`).textContent();
    // Consolidated value: 10 pp, 8 gp
    expect(chestValueText).toMatch(/10.*pp.*8.*gp/i);

    // Verify sword data is intact
    const sword = await page.evaluate(
      async (uuid) => {
        const item = await (globalThis as any).fromUuid(uuid);
        return {
          name: item.name,
          weight: item.system.weight,
          quantity: item.system.quantity,
          price: item.system.price.stacks,
        };
      },
      swordUuid
    );

    expect(sword.name).toBe('Sword');
    expect(sword.weight).toBe(5);
    expect(sword.quantity).toBe(1);
    expect(sword.price).toEqual([{ coinId: 'srd_gp', count: 5 }]);

    // Verify coin purse data is intact
    const coinPurse = await page.evaluate(
      async (uuid) => {
        const item = await (globalThis as any).fromUuid(uuid);
        return {
          name: item.name,
          weight: item._source.system.weight,
          quantity: item.system.quantity,
          containedCurrency: item.system.containedCurrency.stacks,
        };
      },
      coinPurseUuid
    );

    expect(coinPurse.name).toBe('Coin Purse');
    expect(coinPurse.weight).toBe(1);
    expect(coinPurse.quantity).toBe(1);
    expect(coinPurse.containedCurrency).toEqual([
      { coinId: 'srd_pp', count: 10 },
      { coinId: 'srd_cp', count: 50 },
    ]);
  });

  test('unowned items: verify nesting and rollup work on world items', async ({ page }) => {
    await gotoGame(page);

    // Create items NOT on an actor (world items, simulating compendium)
    const chestUuid = await createItem(page, 'container', {
      name: 'Chest from Compendium',
      'system.weight': 2,
      'system.quantity': 1,
    });

    const swordUuid = await createItem(page, 'weapon', {
      name: 'Sword from Compendium',
      'system.weight': 5,
      'system.quantity': 1,
      'system.price': { stacks: [{ coinId: 'srd_gp', count: 5 }], srdEquivalent: 5 },
    });

    const coinPurseUuid = await createItem(page, 'container', {
      name: 'Coin Purse from Compendium',
      'system.weight': 1,
      'system.quantity': 1,
      'system.containedCurrency': {
        stacks: [
          { coinId: 'srd_pp', count: 10 },
          { coinId: 'srd_cp', count: 50 },
        ],
        srdEquivalent: 10.5,
      },
    });

    const ninjaStarUuid = await createItem(page, 'weapon', {
      name: 'Ninja Star from Compendium',
      'system.weight': 0.1,
      'system.quantity': 5,
      'system.price': { stacks: [{ coinId: 'srd_sp', count: 5 }], srdEquivalent: 0.5 },
    });

    // Build the nesting hierarchy via the real drop handler (exercises syncContainmentAe):
    //   chest ← sword, chest ← coinPurse, coinPurse ← ninjaStar
    await stowItemViaDrop(page, swordUuid, chestUuid);
    await stowItemViaDrop(page, coinPurseUuid, chestUuid);
    await stowItemViaDrop(page, ninjaStarUuid, coinPurseUuid);

    // Open chest sheet and verify rollup
    const chestSheet = await openDocumentSheet(page, chestUuid);

    // Wait for the container summary to be visible
    await page.locator(`${chestSheet} .container-summary`).waitFor({ state: 'visible', timeout: 10_000 });

    const chestCountText = await page.locator(`${chestSheet} .container-summary .count`).textContent();
    expect(chestCountText).toContain('2');

    const chestWeightText = await page.locator(`${chestSheet} .container-summary .weight`).textContent();
    expect(chestWeightText).toMatch(/7\.7|7\.70/);

    // Verify the entire nesting chain is intact on the (unowned) world items
    const chestChain = await page.evaluate(
      async (uuid) => {
        const item = await (globalThis as any).fromUuid(uuid);
        const contents = item.getContentsSync().map((c: any) => ({
          name: c.name,
          type: c.type,
          containerUuid: c.system.containerUuid,
        }));
        return {
          name: item.name,
          contents,
        };
      },
      chestUuid
    );

    expect(chestChain.name).toBe('Chest from Compendium');
    expect(chestChain.contents).toHaveLength(2);
    expect(chestChain.contents).toContainEqual(
      expect.objectContaining({ name: 'Sword from Compendium', type: 'weapon' })
    );
    expect(chestChain.contents).toContainEqual(
      expect.objectContaining({ name: 'Coin Purse from Compendium', type: 'container' })
    );
  });
});
