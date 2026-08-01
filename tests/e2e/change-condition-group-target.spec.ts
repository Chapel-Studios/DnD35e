import { expect, test } from '@playwright/test';

import { clearWorld } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets } from './helpers/sheets.mjs';

/**
 * End-to-end: a `condition` formula gates an entire `group:allSaves`-targeted
 * change (poc §7.7) as a single unit.
 *
 * `ActorDnd35e.applyActiveEffects()` evaluates `change.condition` BEFORE
 * `expandChangeTargetGroups()` expands the group key into its flattened
 * fields (`system.saves.fort` / `.reflex` / `.will`) — so when the condition
 * is false, none of the three saves get the bonus; when true, all three do
 * together. This is the ordering regression documented in poc §7.7's
 * Implementation Notes; this spec proves it end-to-end against a real actor.
 */
test.describe('Conditional group:allSaves change', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('a gated group:allSaves change applies to all three saves together, or none at all', async ({ page }) => {
    await gotoGame(page);

    const actorUuid = await page.evaluate(async () => {
      const actor = await (globalThis as any).Actor.create({
        type: 'character',
        name: 'Group Target Condition Test',
        system: { abilities: { str: { score: 10 } } },
      });
      await actor.createEmbeddedDocuments('ActiveEffect', [{
        name: 'Blessed (conditional, all saves)',
        type: 'general',
        disabled: false,
        system: {
          changes: [{
            target: 'actor',
            key: 'group:allSaves',
            type: 'add',
            value: '2',
            condition: '#actor.abilities.str.score >= 14',
            phase: 'initial',
            priority: 10,
            isSystem: false,
          }],
        },
      }]);
      return actor.uuid as string;
    });

    const readSaves = () => page.evaluate(async (uuid) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      return {
        fort: actor?.system?.saves?.fort as number,
        reflex: actor?.system?.saves?.reflex as number,
        will: actor?.system?.saves?.will as number,
      };
    }, actorUuid);

    const setStrScore = (score: number) => page.evaluate(async ({ uuid, score }) => {
      const actor = await (globalThis as any).fromUuid(uuid);
      await actor.update({ system: { abilities: { str: { score } } } });
    }, { uuid: actorUuid, score });

    // Baseline (score 10): condition false -> the whole group is skipped -> all three at 0.
    await expect.poll(readSaves).toEqual({ fort: 0, reflex: 0, will: 0 });

    // Score 16: condition true -> group expands and applies to all three saves together.
    await setStrScore(16);
    await expect.poll(readSaves).toEqual({ fort: 2, reflex: 2, will: 2 });

    // Back down: condition false again -> the whole group is skipped again, not partially.
    await setStrScore(9);
    await expect.poll(readSaves).toEqual({ fort: 0, reflex: 0, will: 0 });
  });
});
