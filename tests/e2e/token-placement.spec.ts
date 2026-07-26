import { expect, test } from '@playwright/test';

import {
  activateScene,
  controlToken,
  deleteTokens,
  getTokenPosition,
  placeToken,
  releaseAllTokens,
} from './helpers/canvas.mjs';
import { clearWorld, createActor } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';

/**
 * End-to-end coverage for poc.9 Story 1 (token size/HP-bar/actor-link derivation) that the
 * unit tests (`tokenDocument.model.test.mts`, `buildPrototypeTokenDefaults.test.mts`) can't
 * reach: a real `TokenDocument` created from a real `Character` actor, through Foundry's own
 * `Actor#getTokenDocument` + embedded-creation pipeline (the same path `placeToken` uses -
 * see its doc comment for why this stands in for a literal sidebar drag-and-drop).
 */
test.describe('Token placement', () => {
  const tokenIds: string[] = [];

  test.afterEach(async ({ page }) => {
    await releaseAllTokens(page).catch(() => {});
    await deleteTokens(page, tokenIds).catch(() => {});
    tokenIds.length = 0;
    await clearWorld(page);
  });

  test('placing a Large character actor creates a linked 2x2 token with a working HP bar', async ({ page }) => {
    await gotoGame(page);
    await activateScene(page, 'Test Scene');

    const actorUuid = await createActor(page, 'character', {
      name: 'Large Test Fighter',
      system: { size: 'large', hp: { current: 24, max: 30 } },
    });
    const tokenId = await placeToken(page, actorUuid, { x: 200, y: 200 });
    tokenIds.push(tokenId);

    const tokenData = await page.evaluate((id) => {
      const doc = (globalThis as any).canvas.tokens.get(id).document;
      return {
        width: doc.width,
        height: doc.height,
        actorLink: doc.actorLink,
        bar1: doc.getBarAttribute('bar1'),
      };
    }, tokenId);

    expect(tokenData.width).toBe(2);
    expect(tokenData.height).toBe(2);
    expect(tokenData.actorLink).toBe(true);
    expect(tokenData.bar1).toMatchObject({ attribute: 'hp', value: 24 });
    expect(tokenData.bar1?.max).toBeGreaterThan(0);
  });

  test('a moved token keeps its new position across a page reload', async ({ page }) => {
    await gotoGame(page);
    await activateScene(page, 'Test Scene');

    const actorUuid = await createActor(page, 'character', { name: 'Reload Test Fighter' });
    const tokenId = await placeToken(page, actorUuid, { x: 200, y: 200 });
    tokenIds.push(tokenId);
    await controlToken(page, tokenId);

    await page.evaluate((id) => {
      const doc = (globalThis as any).canvas.tokens.get(id).document;
      return doc.update({ x: 500, y: 500 });
    }, tokenId);
    await page.waitForFunction((id) => {
      const doc = (globalThis as any).canvas.tokens.get(id)?.document;
      return doc?.x === 500 && doc?.y === 500;
    }, tokenId);
    const beforeReload = await getTokenPosition(page, tokenId);

    await gotoGame(page);
    await activateScene(page, 'Test Scene');
    const afterReload = await getTokenPosition(page, tokenId);

    expect(afterReload.x).toBeCloseTo(beforeReload.x, 0);
    expect(afterReload.y).toBeCloseTo(beforeReload.y, 0);
  });
});
