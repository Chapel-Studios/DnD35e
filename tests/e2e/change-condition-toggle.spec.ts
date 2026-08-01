import { expect, test } from '@playwright/test';

import { clearWorld } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets } from './helpers/sheets.mjs';

/**
 * End-to-end: an AE change's `condition` formula gates the whole change on/off
 * as the underlying actor data crosses the threshold.
 *
 * `evaluateChangeCondition()` resolves `change.condition` as a boolean formula
 * before the change is applied at all — when it resolves `false` the change
 * is skipped entirely (not applied as `0`), so `system.saves.reflex` (a
 * `persisted: false` field that resets to 0 every pass) stays at baseline `0`
 * while the gate is closed, and jumps to the change's value the moment it
 * opens.
 */
test.describe('AE change `condition` — on/off gating', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('a gated change toggles on and off as the condition formula flips', async ({ page }) => {
    await gotoGame(page);

    const actorUuid = await page.evaluate(async () => {
      const actor = await (globalThis as any).Actor.create({
        type: 'character',
        name: 'Condition Gate Test',
        system: { abilities: { str: { score: 10 } } },
      });
      await actor.createEmbeddedDocuments('ActiveEffect', [{
        name: 'Gated Reflex Bonus',
        type: 'general',
        disabled: false,
        system: {
          changes: [{
            target: 'actor',
            key: 'system.saves.reflex',
            type: 'add',
            value: '5',
            condition: '#actor.abilities.str.score >= 14',
            phase: 'initial',
            priority: 10,
            isSystem: false,
          }],
        },
      }]);
      return actor.uuid as string;
    });

    const readReflex = () => page.evaluate(async (uuid) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      return actor?.system?.saves?.reflex as number;
    }, actorUuid);

    const setStrScore = (score: number) => page.evaluate(async ({ uuid, score }) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      await actor.update({ system: { abilities: { str: { score } } } });
    }, { uuid: actorUuid, score });

    // Baseline (score 10): condition false -> change skipped entirely -> 0, not 5.
    await expect.poll(readReflex).toBe(0);

    // Score 16: condition true -> change applies -> +5.
    await setStrScore(16);
    await expect.poll(readReflex).toBe(5);

    // Back down to score 8: condition false again -> change skipped -> back to 0.
    await setStrScore(8);
    await expect.poll(readReflex).toBe(0);
  });
});
