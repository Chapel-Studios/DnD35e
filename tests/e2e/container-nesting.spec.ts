import type { Container } from '@items/physical/container/Container.mjs';
import type { PhysicalItemLike } from '@items/physical/physicalItem/index.mjs';
import { expect, test } from '@playwright/test';

import { clearWorld, createActor, createItem, stowItemViaDrop, updateDocument } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

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

  test('GM expands inventory containers and distinguishes stowed actions from same-named ready weapons', async ({ page }) => {
    await gotoGame(page);
    const weapon = (id: string, actionId: string) => ({
      _id: id, name: 'Battle Axe', type: 'weapon',
      system: { actions: [{
        _id: actionId, type: 'melee_weapon_attack', isTopLevel: true, isSystemCreated: false,
        name: { formula: 'Axe attack', expectedType: 'string' },
        attackFormula: { formula: '1d20', expectedType: 'rollFormula' },
        damageFormula: { formula: '1d8', expectedType: 'rollFormula' },
      }] },
    });
    const actorUuid = await createActor(page, 'character', {
      name: 'Inventory visibility fixture',
      items: [
        weapon('readyWeapon00001', 'readyAttack00001'),
        weapon('stowedWeapon0001', 'stowedAttack0001'),
        { _id: 'outerBag00000001', name: 'Bag', type: 'container' },
        { _id: 'innerBag00000001', name: 'Inner Bag', type: 'container' },
      ],
    });
    const readyUuid = `${actorUuid}.Item.readyWeapon00001`;
    const stowedUuid = `${actorUuid}.Item.stowedWeapon0001`;
    const outerBagUuid = `${actorUuid}.Item.outerBag00000001`;
    const innerBagUuid = `${actorUuid}.Item.innerBag00000001`;
    await stowItemViaDrop(page, stowedUuid, innerBagUuid);
    await stowItemViaDrop(page, innerBagUuid, outerBagUuid);
    await closeAllSheets(page);
    const sheet = page.locator(await openDocumentSheet(page, actorUuid));
    await dismissOverlays(page);
    await sheet.locator('[data-tab="inventory"]').click();
    const outer = sheet.locator(`.inventory-row[data-container-uuid="${outerBagUuid}"]`);
    await outer.locator('.container-expand-btn').click();
    const inner = sheet.locator(`.inventory-row[data-container-uuid="${innerBagUuid}"]`);
    await expect(inner).toBeVisible();
    await inner.locator('.container-expand-btn').click();
    await expect(sheet.locator(`.inventory-row[data-container-uuid="${stowedUuid}"]`)).toBeVisible();

    await sheet.locator('[data-tab="actions"]').click();
    const actions = sheet.locator('.actions-section');
    await expect(actions.locator('.weapon-row')).toHaveCount(2);
    await expect(actions.locator('.category-tab-btn')).toHaveCount(2);
    await expect(actions.locator('[data-item-id="stowedWeapon0001"] .weapon-location')).toContainText('Inner Bag');
    await updateDocument(page, readyUuid, { 'system.isCarried': false });
    await expect(actions.locator('.weapon-row')).toHaveCount(1);
    await expect(actions.locator('[data-item-id="stowedWeapon0001"]')).toBeVisible();
    await updateDocument(page, stowedUuid, { 'system.isCarried': false });
    await expect(actions.locator('.weapon-row')).toHaveCount(0);

    await closeAllSheets(page);
    const bagSheet = page.locator(await openDocumentSheet(page, innerBagUuid));
    await dismissOverlays(page);
    await bagSheet.locator('[data-tab="inventory"]').click();
    await expect(bagSheet.locator(`.inventory-row[data-container-uuid="${stowedUuid}"]`)).toBeVisible();
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

  test('GM changes nested container currency settings and ancestor rollups and capacity checks stay current', async ({ page }) => {
    await gotoGame(page);
    const outerUuid = await createItem(page, 'container', {
      name: 'Outer Bag',
      system: { weight: 0, quantity: 1 },
    });
    const middleUuid = await createItem(page, 'container', {
      name: 'Middle Bag',
      system: { weight: 2, quantity: 1 },
    });
    const innerUuid = await createItem(page, 'container', {
      name: 'Currency Bag',
      system: {
        weight: 1, quantity: 1, allowsCurrency: true,
        containedCurrency: { stacks: [{ coinId: 'srd_gp', count: 50 }] },
      },
    });
    const probeUuid = await createItem(page, 'weapon', {
      name: 'Capacity Probe',
      system: { weight: 1, quantity: 1 },
    });
    await stowItemViaDrop(page, innerUuid, middleUuid);
    await stowItemViaDrop(page, middleUuid, outerUuid);
    await updateDocument(page, outerUuid, { system: { maxContentWeight: 4.5 } });
    await updateDocument(page, middleUuid, { system: { maxContentWeight: 2.5 } });

    const readState = () => page.evaluate(async ({ outerUuid, middleUuid, innerUuid, probeUuid }) => {
      const inner = await fromUuid<Container>(innerUuid);
      const probe = await fromUuid<PhysicalItemLike>(probeUuid);
      if (!inner || !probe) throw new Error('Missing currency synchronization fixture');
      const parents = await Promise.all([outerUuid, middleUuid].map(async uuid => {
        const container = await fromUuid<Container>(uuid);
        if (!container) throw new Error(`Missing ancestor container ${uuid}`);
        return {
          weight: container.system.contentsWeight,
          value: container.system.contentsValue.srdEquivalent,
          acceptsProbe: container.canAddItemToContents(probe),
        };
      }));
      return {
        allowsCurrency: inner.system.allowsCurrency,
        coins: inner.system.containedCurrency.stacks,
        parents,
      };
    }, { outerUuid, middleUuid, innerUuid, probeUuid });

    const enabled = {
      allowsCurrency: true,
      coins: [{ coinId: 'srd_gp', count: 50 }],
      parents: [
        { weight: 4, value: 50, acceptsProbe: false },
        { weight: 2, value: 50, acceptsProbe: false },
      ],
    };
    const disabled = {
      ...enabled,
      allowsCurrency: false,
      parents: [
        { weight: 3, value: 0, acceptsProbe: true },
        { weight: 1, value: 0, acceptsProbe: true },
      ],
    };
    await expect.poll(readState).toEqual(enabled);
    await updateDocument(page, innerUuid, { system: { allowsCurrency: false } });
    await expect.poll(readState).toEqual(disabled);
    await updateDocument(page, innerUuid, { system: { allowsCurrency: true } });
    await expect.poll(readState).toEqual(enabled);
    await updateDocument(page, innerUuid, { system: { allowsCurrency: false } });
    await expect.poll(readState).toEqual(disabled);
    await updateDocument(page, innerUuid, { system: { containerType: 'purse' } });
    await expect.poll(readState).toEqual(enabled);
  });

  test('GM rechecks nested capacity using complete coin, weightless-content, and stacked-container contributions', async ({ page }) => {
    await gotoGame(page);
    const parentUuid = await createItem(page, 'container', { name: 'Capacity parent' });
    const innerUuid = await createItem(page, 'container', {
      name: 'Capacity inner', system: {
        weight: 1, containedCurrency: { stacks: [{ coinId: 'srd_gp', count: 50 }] },
      },
    });
    const ammoUuid = await createItem(page, 'ammo', {
      name: 'Capacity contents', system: { weight: 3 },
    });
    await stowItemViaDrop(page, innerUuid, parentUuid);
    await updateDocument(page, parentUuid, { system: { maxContentWeight: 1.5 } });
    const readCapacity = () => page.evaluate(async ({ parentUuid, innerUuid }) => {
      const parent = await fromUuid<Container>(parentUuid);
      const inner = await fromUuid<Container>(innerUuid);
      if (!parent || !inner) throw new Error('Missing nested-capacity fixture');
      return {
        weight: parent.system.contentsWeight,
        displayedWeight: inner.system.weight,
        contentsWeight: inner.system.contentsWeight,
        quantity: inner.system.quantity,
        accepted: parent.canAddItemToContents(inner),
      };
    }, { parentUuid, innerUuid });
    await expect.poll(readCapacity).toEqual({
      weight: 2, displayedWeight: 1, contentsWeight: 1, quantity: 1, accepted: false,
    });
    await updateDocument(page, parentUuid, { system: { maxContentWeight: 2 } });
    await expect.poll(readCapacity).toEqual({
      weight: 2, displayedWeight: 1, contentsWeight: 1, quantity: 1, accepted: true,
    });
    await stowItemViaDrop(page, ammoUuid, innerUuid);
    await updateDocument(page, innerUuid, { system: { contentsAreWeightless: true } });
    await updateDocument(page, parentUuid, { system: { maxContentWeight: 4.5 } });
    await expect.poll(readCapacity).toEqual({
      weight: 5, displayedWeight: 1, contentsWeight: 4, quantity: 1, accepted: false,
    });
    await updateDocument(page, innerUuid, { system: { contentsAreWeightless: false, quantity: 2 } });
    await updateDocument(page, parentUuid, { system: { maxContentWeight: 6 } });
    await expect.poll(readCapacity).toEqual({
      weight: 6, displayedWeight: 4, contentsWeight: 4, quantity: 2, accepted: true,
    });
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
