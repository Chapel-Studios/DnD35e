import { expect, test } from '@playwright/test';

import {
  activateScene,
  controlToken,
  deleteTokens,
  getTokenLightData,
  placeToken,
  releaseAllTokens,
} from './helpers/canvas.mjs';
import { clearWorld, createActor } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';

/**
 * Regression coverage for the low-light-vision light-radius-doubling bug:
 * selecting a low-light-vision token must re-derive its light source data so
 * the 2x dim/bright radius actually renders, and switching control to a
 * non-low-light token must shrink it back down rather than leave it stuck at
 * whatever multiplier last applied.
 *
 * This specifically guards `Hooks.on('controlToken', ...)` in `src/main.mts`
 * calling `initializeLightSource()` directly on placeables — `canvas.
 * perception.update({ initializeLighting: true })` alone is a no-op for this
 * (see `TokenDnd35e#_getLightSourceData`/`AmbientLightDnd35e#_getLightSourceData`).
 */
test.describe('low-light vision light radius', () => {
  const tokenIds: string[] = [];

  test.afterEach(async ({ page }) => {
    await releaseAllTokens(page).catch(() => {});
    await deleteTokens(page, tokenIds).catch(() => {});
    tokenIds.length = 0;
    await clearWorld(page);
  });

  test('selecting a low-light token doubles its radius; selecting a non-low-light token does not', async ({ page }) => {
    await gotoGame(page);
    await activateScene(page, 'Test Scene');

    const lowLightActorUuid = await createActor(page, 'character', {
      name: 'Low-Light Scout',
      system: { bio: { senses: [{ type: 'lowLight', distance: 0 }] } },
    });
    const darkvisionActorUuid = await createActor(page, 'character', {
      name: 'Darkvision Scout',
      system: { bio: { senses: [{ type: 'darkvision', distance: 12 }] } },
    });

    const light = { dim: 40, bright: 20 };
    const lowLightTokenId = await placeToken(page, lowLightActorUuid, { x: 100, y: 100, light });
    const darkvisionTokenId = await placeToken(page, darkvisionActorUuid, { x: 300, y: 300, light });
    tokenIds.push(lowLightTokenId, darkvisionTokenId);

    // Select the non-low-light token: its light must NOT be boosted (and must
    // not be stuck at whatever multiplier applied before it was controlled).
    await controlToken(page, darkvisionTokenId);
    const base = await getTokenLightData(page, darkvisionTokenId);

    // Select the low-light token: its light MUST be boosted to 2x the base
    // (same configured dim/bright as the other token, so this is an exact
    // ratio check, not dependent on scene grid pixel-conversion factors).
    await controlToken(page, lowLightTokenId);
    const boosted = await getTokenLightData(page, lowLightTokenId);

    expect(boosted.dim).toBeCloseTo(base.dim * 2, 1);
    expect(boosted.bright).toBeCloseTo(base.bright * 2, 1);

    // Switch control back to the non-low-light token: it must shrink back
    // down, proving the hook re-derives on every controlToken change rather
    // than leaving a stale doubled value from the prior selection.
    await controlToken(page, darkvisionTokenId);
    const afterSwitch = await getTokenLightData(page, darkvisionTokenId);
    expect(afterSwitch.dim).toBeCloseTo(base.dim, 1);
    expect(afterSwitch.bright).toBeCloseTo(base.bright, 1);
  });
});
