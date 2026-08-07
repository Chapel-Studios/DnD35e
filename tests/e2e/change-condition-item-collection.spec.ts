import { expect, test } from '@playwright/test';

import { clearWorld } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets } from './helpers/sheets.mjs';

/**
 * End-to-end: an AE change's `condition` formula uses poc §7.2c's item-collection
 * context (`#self.weapons`) to gate a bonus on whether the actor is carrying
 * any weapon at all.
 *
 * `#self` in a change's Value/Condition formula resolves to the change's own
 * target document (here, `target: 'actor'` -> the actor itself), so
 * `#self.weapons` walks the actor's live embedded Item collection, filtered
 * to `weaponItemType` by `withItemCollectionAspects()`. Proves the
 * heterogeneous per-element array resolution added in poc §7.2c works against a
 * real actor's real embedded items, not just the unit-test fixtures.
 */
test.describe('AE change condition using #self.weapons (poc §7.2c)', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('a bonus gated on carrying any weapon appears and disappears as weapons are added/removed', async ({ page }) => {
    await gotoGame(page);

    const actorUuid = await page.evaluate(async () => {
      const actor = await (globalThis as any).Actor.create({
        type: 'character',
        name: 'Item Collection Condition Test',
      });
      await actor.createEmbeddedDocuments('ActiveEffect', [{
        name: 'Armed Confidence (any weapon)',
        type: 'general',
        disabled: false,
        system: {
          changes: [{
            target: 'actor',
            key: 'system.saves.will',
            type: 'add',
            value: '1',
            condition: '$count(#self.weapons) > 0',
            phase: 'initial',
            priority: 10,
            isSystem: false,
          }],
        },
      }]);
      return actor.uuid as string;
    });

    const readWill = () => page.evaluate(async (uuid) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      return actor?.system?.saves?.will as number;
    }, actorUuid);

    // No weapons yet: condition false -> change skipped -> 0.
    await expect.poll(readWill).toBe(0);

    // Add a weapon (and a non-weapon item, to prove the filterTypes narrowing
    // isn't accidentally matching everything in the collection).
    const { weaponId, potionId } = await page.evaluate(async (uuid) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      const [weapon] = await actor.createEmbeddedDocuments('Item', [{ type: 'weapon', name: 'Test Dagger' }]);
      const [potion] = await actor.createEmbeddedDocuments('Item', [{ type: 'container', name: 'Test Sack' }]);
      return { weaponId: weapon.id as string, potionId: potion.id as string };
    }, actorUuid);

    await expect.poll(readWill).toBe(1);

    // Delete the weapon but keep the non-weapon item: condition should go
    // false again, proving `#self.weapons` really filters by type.
    await page.evaluate(async ({ uuid, weaponId }) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      await actor.deleteEmbeddedDocuments('Item', [weaponId]);
    }, { uuid: actorUuid, weaponId });

    await expect.poll(readWill).toBe(0);

    // Sanity: the non-weapon item is still there (didn't get deleted too).
    const remaining = await page.evaluate(async ({ uuid, potionId }) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      return actor.items.get(potionId)?.id ?? null;
    }, { uuid: actorUuid, potionId });
    expect(remaining).toBe(potionId);
  });
});
