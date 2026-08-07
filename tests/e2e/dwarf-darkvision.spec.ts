import { expect, test } from '@playwright/test';

import {
  activateScene,
  controlToken,
  deleteTokens,
  getTokenVisionData,
  placeToken,
  releaseAllTokens,
} from './helpers/canvas.mjs';
import { clearWorld, createActor } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';

/**
 * End-to-end coverage for poc.9 Story 3 (`buildTokenVisionFromSenses`) that the unit tests
 * can't reach: a real Character actor with a darkvision sense, placed on a real dark scene,
 * produces a live `PointVisionSource` on the canvas with the darkvision mode and a non-zero
 * radius - not just the correct `sight`/`detectionModes` values on the `TokenDocument`.
 */
test.describe('Darkvision on a dark scene', () => {
  const tokenIds: string[] = [];
  let sceneId: string;
  let originalEnvironment: Record<string, unknown>;

  test.beforeEach(async ({ page }) => {
    await gotoGame(page);
    sceneId = await activateScene(page, 'Test Scene');
    originalEnvironment = await page.evaluate((id) => {
      const scene = (globalThis as any).game.scenes.get(id);
      return foundry.utils.deepClone(scene.environment);
    }, sceneId);
    // Fully dark scene: no ambient/global light at all.
    await page.evaluate((id) => {
      const scene = (globalThis as any).game.scenes.get(id);
      return scene.update({ environment: { darknessLevel: 1, globalLight: { enabled: false } } });
    }, sceneId);
  });

  test.afterEach(async ({ page }) => {
    await releaseAllTokens(page).catch(() => {});
    await deleteTokens(page, tokenIds).catch(() => {});
    tokenIds.length = 0;
    await page.evaluate(({ id, environment }) => {
      const scene = (globalThis as any).game.scenes.get(id);
      return scene.update({ environment });
    }, { id: sceneId, environment: originalEnvironment });
    await clearWorld(page);
  });

  test('a character with 60ft darkvision gets a live darkvision vision source in the dark', async ({ page }) => {
    const darkvisionActorUuid = await createActor(page, 'character', {
      name: 'Dwarf Test Scout',
      system: { bio: { senses: [{ type: 'darkvision', distance: 12 }] } },
    });
    const basicActorUuid = await createActor(page, 'character', { name: 'Human Test Scout' });

    const darkvisionTokenId = await placeToken(page, darkvisionActorUuid, { x: 200, y: 200 });
    const basicTokenId = await placeToken(page, basicActorUuid, { x: 400, y: 400 });
    tokenIds.push(darkvisionTokenId, basicTokenId);

    // The TokenDocument itself carries the darkvision-derived sight/detectionModes,
    // proving Character._preCreate -> buildTokenVisionFromSenses reached the real document.
    const sightData = await page.evaluate((id) => {
      const doc = (globalThis as any).canvas.tokens.get(id).document;
      return { sight: foundry.utils.deepClone(doc.sight), detectionModes: foundry.utils.deepClone(doc.detectionModes) };
    }, darkvisionTokenId);
    expect(sightData.sight).toMatchObject({ visionMode: 'darkvision', range: 60 });
    expect(sightData.detectionModes).toMatchObject({ basicSight: { range: 60 } });

    // Controlling the token initializes a real vision source with the darkvision mode and a
    // non-zero radius - proving the canvas actually picks up the mapping, not just the schema.
    await controlToken(page, darkvisionTokenId);
    const darkvisionVision = await getTokenVisionData(page, darkvisionTokenId);
    expect(darkvisionVision?.visionMode).toBe('darkvision');
    expect(darkvisionVision?.radius).toBeGreaterThan(0);

    // A token with only basic (non-darkvision) sight gets no meaningful vision radius in a
    // fully dark scene with no light sources - the contrast confirms the darkvision result
    // above isn't just "every controlled token gets a big radius regardless of sense data".
    await controlToken(page, basicTokenId);
    const basicVision = await getTokenVisionData(page, basicTokenId);
    expect(basicVision?.visionMode).not.toBe('darkvision');
    expect(basicVision?.radius ?? 0).toBeLessThanOrEqual(darkvisionVision?.radius ?? 0);
  });
});
