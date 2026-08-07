import { expect, test } from '@playwright/test';

import { clearWorld } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets } from './helpers/sheets.mjs';

/**
 * End-to-end: `$conditional(when()...else())` on an AE change's Value formula
 * reacts live to actor data changes.
 *
 * A single ActiveEffect change targets `system.saves.fort` (a `persisted: false`
 * derived field that resets to 0 every `prepareData()` pass — see
 * `CreatureSystemModel`'s `derivedNumberField`), with an `add` Value formula:
 *
 *   $conditional(
 *     when(#actor.abilities.str.score >= 18, "3")
 *     when(#actor.abilities.str.score >= 14, "2")
 *     else("1")
 *   )
 *
 * Exercises both `when` branches and the `else` branch, and proves the
 * resolver re-evaluates (not just applies once) by walking the actor's
 * Strength score up through both thresholds and back down to `else` again.
 */
test.describe('$conditional Value formula — live branch switching', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('switches between two when-branches and the else branch as Strength changes', async ({ page }) => {
    await gotoGame(page);

    const actorUuid = await page.evaluate(async () => {
      const actor = await (globalThis as any).Actor.create({
        type: 'character',
        name: 'Conditional Formula Test',
        system: { abilities: { str: { score: 10 } } },
      });
      await actor.createEmbeddedDocuments('ActiveEffect', [{
        name: 'Str-Scaled Fort Bonus',
        type: 'general',
        disabled: false,
        system: {
          changes: [{
            target: 'actor',
            key: 'system.saves.fort',
            type: 'add',
            value: '$conditional(when(#actor.abilities.str.score >= 18, 3) when(#actor.abilities.str.score >= 14, 2) else(1))',
            phase: 'initial',
            priority: 10,
            isSystem: false,
          }],
        },
      }]);
      return actor.uuid as string;
    });

    const readFort = () => page.evaluate(async (uuid) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      return actor?.system?.saves?.fort as number;
    }, actorUuid);

    const setStrScore = (score: number) => page.evaluate(async ({ uuid, score }) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      await actor.update({ system: { abilities: { str: { score } } } });
    }, { uuid: actorUuid, score });

    // Baseline (score 10): neither `when` matches -> else branch -> +1
    await expect.poll(readFort).toBe(1);

    // Score 15: second `when` matches (>=14, not >=18) -> +2
    await setStrScore(15);
    await expect.poll(readFort).toBe(2);

    // Score 20: first `when` matches (>=18) -> +3
    await setStrScore(20);
    await expect.poll(readFort).toBe(3);

    // Back down to score 8: neither `when` matches again -> else -> +1
    // Proves the conditional re-evaluates on every change, not just once.
    await setStrScore(8);
    await expect.poll(readFort).toBe(1);
  });
});
