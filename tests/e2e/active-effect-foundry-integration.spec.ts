import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { activateScene, deleteTokens, placeToken } from './helpers/canvas.mjs';
import { createCombatForTokens, deleteCombat, disableTurnMarkerAnimation, nextCombatTurn, startCombat } from './helpers/combat.mjs';
import { clearWorld, createActiveEffect, createActor } from './helpers/documents.mjs';
import { gotoGame, loginAs } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';

async function trackEffectDeleteCalls (page: Page, effectUuid: string): Promise<void> {
  await page.evaluate(async (uuid) => {
    const effect = await (globalThis as any).fromUuid(uuid);
    if (!effect) throw new Error(`trackEffectDeleteCalls: effect not found at ${uuid}`);
    const originalDelete = effect.delete.bind(effect);
    (globalThis as any).__effectDeleteCalls = 0;
    effect.delete = async (...args: unknown[]) => {
      (globalThis as any).__effectDeleteCalls++;
      return await originalDelete(...args);
    };
  }, effectUuid);
}

async function readEffectDeleteCalls (page: Page): Promise<number> {
  return page.evaluate(() => (globalThis as any).__effectDeleteCalls ?? 0);
}

async function hasDocument (page: Page, uuid: string): Promise<boolean> {
  return page.evaluate(async (docUuid) => !!await (globalThis as any).fromUuid(docUuid), uuid);
}

async function readChanges (page: Page, effectUuid: string): Promise<unknown[]> {
  return page.evaluate(async (uuid) => {
    const effect = await (globalThis as any).fromUuid(uuid);
    return effect?.system?.changes ?? [];
  }, effectUuid);
}

test.describe('Foundry v14 Active Effect integration', () => {
  let playerContext: BrowserContext;
  const tokenIds: string[] = [];
  let combatId: string | undefined;
  let packCollection: string | undefined;

  test.beforeEach(async ({ browser }) => {
    playerContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  });

  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    const playerPage = playerContext.pages()[0];
    if (playerPage) await closeAllSheets(playerPage).catch(() => {});
    if (combatId) await deleteCombat(page, combatId).catch(() => {});
    combatId = undefined;
    await deleteTokens(page, tokenIds).catch(() => {});
    tokenIds.length = 0;
    if (packCollection) {
      await page.evaluate(async (collection) => {
        const pack = (globalThis as any).game.packs.get(collection);
        if (!pack) return;
        await pack.configure({ locked: false });
        await pack.deleteCompendium();
      }, packCollection).catch(() => {});
      packCollection = undefined;
    }
    await clearWorld(page);
    await playerContext.close();
  });

  test('GM advances combat and only the initiating client deletes an effect expiring on its owner\'s next turn', async ({ page }) => {
    test.setTimeout(360_000);
    await gotoGame(page);
    await activateScene(page, 'Test Scene');
    await disableTurnMarkerAnimation(page);
    await gotoGame(page);
    const sceneId = await activateScene(page, 'Test Scene');

    const firstActorUuid = await createActor(page, 'character', {
      name: 'Expiry Turn One',
      ownership: { default: 2 },
    });
    const secondActorUuid = await createActor(page, 'character', {
      name: 'Expiry Turn Two',
      ownership: { default: 2 },
    });
    const firstTokenId = await placeToken(page, firstActorUuid, { x: 300, y: 300 });
    const secondTokenId = await placeToken(page, secondActorUuid, { x: 500, y: 300 });
    tokenIds.push(firstTokenId, secondTokenId);
    ({ combatId } = await createCombatForTokens(page, sceneId, [firstTokenId, secondTokenId]));
    await startCombat(page);

    const activeActorUuid = await page.evaluate(() => {
      const combat = (globalThis as any).game.combat;
      const actor = combat?.combatant?.actor;
      if (!actor?.uuid) throw new Error('Expiry test: combat did not start with an active actor');
      return actor.uuid as string;
    });
    const effectUuid = await createActiveEffect(page, activeActorUuid, {
      name: 'Expires on the next turn',
      type: 'general',
      img: 'icons/svg/aura.svg',
      duration: { value: 1, units: 'turns' },
      system: { deleteOnExpiry: true },
    });
    const playerPage = await loginAs(playerContext, 'player');
    await trackEffectDeleteCalls(page, effectUuid);
    await trackEffectDeleteCalls(playerPage, effectUuid);

    // The effect must survive the other combatant’s turn.
    await nextCombatTurn(page);
    await expect.poll(() => hasDocument(page, effectUuid)).toBe(true);
    await expect.poll(() => hasDocument(playerPage, effectUuid)).toBe(true);

    // Returning to the effect owner’s turn triggers Foundry’s native turn-duration expiry.
    await nextCombatTurn(page);
    await expect.poll(() => hasDocument(page, effectUuid), { timeout: 10_000 }).toBe(false);
    await expect.poll(() => hasDocument(playerPage, effectUuid), { timeout: 10_000 }).toBe(false);
    expect(await readEffectDeleteCalls(page)).toBe(1);
    expect(await readEffectDeleteCalls(playerPage)).toBe(0);
  });

  test('locked compendium keeps Active Effect change mutation controls disabled and inert', async ({ page }) => {
    test.setTimeout(120_000);
    await gotoGame(page);
    packCollection = await page.evaluate(async () => {
      const pack = await (globalThis as any).foundry.documents.collections.CompendiumCollection.createCompendium({
        label: 'E2E Locked Active Effects',
        type: 'ActiveEffect',
      });
      if (!pack?.collection) throw new Error('Locked compendium test: could not create a world pack');
      return pack.collection as string;
    });
    const effectUuid = await page.evaluate(async (collection) => {
      const pack = (globalThis as any).game.packs.get(collection);
      const ActiveEffect = (globalThis as any).ActiveEffect;
      const [effect] = await ActiveEffect.create([{
        name: 'Locked Effect',
        type: 'general',
        img: 'icons/svg/aura.svg',
        system: {
          changes: [{
            id: 'fixture-change',
            key: 'system.hp.value',
            type: 'add',
            value: 1,
            phase: 'final',
            priority: 10,
            target: 'actor',
          }],
        },
      }], { pack: collection });
      if (!effect?.uuid) throw new Error('Locked compendium test: could not create an effect entry');
      await pack.configure({ locked: true });
      if (!pack.locked || effect.sheet.isEditable) {
        throw new Error('Locked compendium test: the pack entry is still editable');
      }
      return effect.uuid as string;
    }, packCollection);
    const sheetSelector = await openDocumentSheet(page, effectUuid);
    const sheet = page.locator(sheetSelector);
    const changesTab = sheet.locator('nav.sheet-tabs a[data-tab="changes"]');
    await changesTab.waitFor({ state: 'visible', timeout: 10_000 });
    await changesTab.click();

    const addButton = sheet.locator('.add-change');
    const deleteButtons = sheet.locator('.change-row .delete-change');
    await expect(addButton).toBeDisabled();
    await expect(deleteButtons.first()).toBeDisabled();

    const originalChanges = await readChanges(page, effectUuid);
    await addButton.dispatchEvent('click');
    await deleteButtons.first().dispatchEvent('click');
    await expect.poll(() => readChanges(page, effectUuid)).toEqual(originalChanges);
  });
});
