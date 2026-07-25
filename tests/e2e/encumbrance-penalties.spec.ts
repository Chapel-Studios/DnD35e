import { expect, test } from '@playwright/test';

import { clearWorld, createActor } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

/**
 * Encumbrance penalty progression — full six-tier TDD scenario.
 *
 * A STR 10 character has light=33, medium=66, heavy=100, maxLift=200 (heavy*2),
 * drag=500 (heavy*5). Base land speed is 30ft.
 *
 * Six carried items are added one at a time, each pushing the running total
 * carried weight into the next tier:
 *   item1 -> cum 20  (tier 0, light)  - bar moves, no penalties
 *   item2 -> cum 50  (tier 1, medium) - maxDex +3, check -3, speed 30->20
 *   item3 -> cum 90  (tier 2, heavy)  - maxDex +1, check -6, speed 20 (same table value)
 *   item4 -> cum 150 (tier 3, maxLift)- same severe penalties, speed -> 5
 *   item5 -> cum 400 (tier 4, drag)   - same severe penalties, speed -> 5
 *   item6 -> cum 550 (tier 5, beyond)- same severe penalties, speed -> 0 (immobile)
 *
 * Items are then deleted in reverse order, and the penalties are expected to
 * come off symmetrically. Every step asserts against the actual rendered
 * sheet DOM (not just actor.system data) per the acceptance scenario.
 */

const MAX_DEX_PATH = 'system.encumbrance.maxDexBonus';
const CHECK_PENALTY_PATH = 'system.encumbrance.armorCheckPenalty';
// Speed has a single persisted field (no more `.base`/`.total` split). Edit mode
// reads the source/persisted value; in 'play' mode its displayed value is wired to the
// effective (post-AE) value (see the shared FormGroup edit/readonly pattern), so
// switching the sheet to 'play' mode before asserting lets this element reflect the
// encumbrance-adjusted effective speed rather than the always-unaffected source speed.
const SPEED_PATH = 'system.speed.land';

interface TierExpectation {
  tier: number;
  maxDex: string; // rendered text of the readonly maxDexBonus field ('' when null)
  checkPenalty: string; // rendered text of the readonly armorCheckPenalty field
  speed: string; // rendered readonly text (numeric prefix) of system.speed.land's effective/total value in play mode
}

// The `HasActiveEffectsNotification` popup renders one entry per `Override` recorded
// on the field - `effect.effectName` is `change.label`, which `_buildEncumberedChanges()`
// sets to the localized tier label (`dnd35e.CREATURE.FIELDS.encumbrance.tier.<n>`, see
// src/lang/en/actors.json), and `effect.value` is the raw pushed change value (the
// *encumbered* land speed itself, not a delta - `pushChange('system.speed.land', encumberedSpeed)`).
// Store the stable lang KEY (not the English display text) - localized at runtime via
// `localizeTierLabel()` so this spec doesn't break when translations change.
const TIER_LABEL_KEY: Record<number, string> = {
  1: 'dnd35e.CREATURE.FIELDS.encumbrance.tier.1',
  2: 'dnd35e.CREATURE.FIELDS.encumbrance.tier.2',
  3: 'dnd35e.CREATURE.FIELDS.encumbrance.tier.3',
  4: 'dnd35e.CREATURE.FIELDS.encumbrance.tier.4',
  5: 'dnd35e.CREATURE.FIELDS.encumbrance.tier.5',
};

async function localizeTierLabel (page: any, tier: number): Promise<string> {
  return page.evaluate((key: string) => (globalThis as any).game.i18n.localize(key), TIER_LABEL_KEY[tier]);
}

// Encumbered speed value pushed as the DOWNGRADE change - unlike the sheet's readonly
// display (which renders 0 as '—'), the tooltip shows the literal numeric value.
const TIER_SPEED_EFFECT_VALUE: Record<number, string> = {
  1: '20',
  2: '20',
  3: '5',
  4: '5',
  5: '0',
};

const TIER_EXPECTATIONS: Record<number, TierExpectation> = {
  0: { tier: 0, maxDex: '', checkPenalty: '0', speed: '30' },
  1: { tier: 1, maxDex: '3', checkPenalty: '-3', speed: '20' },
  2: { tier: 2, maxDex: '1', checkPenalty: '-6', speed: '20' },
  3: { tier: 3, maxDex: '1', checkPenalty: '-6', speed: '5' },
  4: { tier: 4, maxDex: '1', checkPenalty: '-6', speed: '5' },
  5: { tier: 5, maxDex: '1', checkPenalty: '-6', speed: '—' }, // 0 total speed renders as a placeholder dash (immobile), not '0'
};

// Per-item weight (quantity 1) chosen so the running total lands cleanly inside
// each successive tier for a STR 10 character (light=33, medium=66, heavy=100,
// maxLift=200, drag=500).
const ITEM_WEIGHTS = [20, 30, 40, 60, 250, 150];
const CUMULATIVE_WEIGHTS = ITEM_WEIGHTS.reduce<number[]>((acc, w, i) => {
  acc.push((acc[i - 1] ?? 0) + w);
  return acc;
}, []);

async function openAttributesTab (page: any, sheet: string): Promise<void> {
  const tab = page.locator(`${sheet} nav.sheet-tabs a[data-tab="attributes"]`).first();
  await tab.waitFor({ state: 'visible', timeout: 10_000 });
  await tab.click();
}

async function createCarriedItem (page: any, actorUuid: string, name: string, weight: number): Promise<string> {
  const itemUuid = await page.evaluate(async ({ actorUuid, name, weight }: { actorUuid: string; name: string; weight: number }) => {
    const actor = await (globalThis as any).fromUuid(actorUuid);
    const [created] = await actor.createEmbeddedDocuments('Item', [{
      type: 'weapon',
      name,
      system: { weight, quantity: 1 },
    }]);
    return created.uuid as string;
  }, { actorUuid, name, weight });
  return itemUuid;
}

async function deleteItem (page: any, itemUuid: string): Promise<void> {
  await page.evaluate(async (uuid: string) => {
    const item = await (globalThis as any).fromUuid(uuid);
    await item.delete();
  }, itemUuid);
}

async function readActorEncumbrance (page: any, actorUuid: string): Promise<{ carriedWeight: number; tier: number }> {
  return page.evaluate(async (uuid: string) => {
    const actor = await (globalThis as any).fromUuid(uuid);
    return {
      carriedWeight: actor?.system?.encumbrance?.carriedWeight ?? null,
      tier: actor?.system?.encumbrance?.tier ?? null,
    };
  }, actorUuid);
}

async function assertSheetShowsTier (
  page: any,
  sheet: string,
  actorUuid: string,
  expectedTier: number,
  expectedCarriedWeight: number
): Promise<void> {
  const expected = TIER_EXPECTATIONS[expectedTier];

  // Gate on the actor's own data settling before reading the DOM - carried-weight is
  // recomputed synchronously during the actor's `prepareData()` pipeline (via
  // `PhysicalItem._buildCarriedChanges()`), which re-runs after the embedded item
  // create/delete round-trip settles, so more than one poll may be needed.
  await expect.poll(async () => readActorEncumbrance(page, actorUuid))
    .toEqual({ carriedWeight: expectedCarriedWeight, tier: expectedTier });

  const maxDexText = page.locator(`${sheet} [data-field-path="${MAX_DEX_PATH}"] .readonly-content`).first();
  const checkPenaltyText = page.locator(`${sheet} [data-field-path="${CHECK_PENALTY_PATH}"] .readonly-content`).first();
  // In 'play' mode the land-speed field renders its readonly display (not an <input>) -
  // see the shared FormGroup edit/readonly pattern, which only shows the editable input
  // in 'edit' mode.
  const speedText = page.locator(`${sheet} [data-field-path="${SPEED_PATH}"] .readonly-content`).first();

  await expect.poll(async () => (await maxDexText.textContent())?.trim()).toBe(expected.maxDex);
  await expect.poll(async () => (await checkPenaltyText.textContent())?.trim()).toBe(expected.checkPenalty);
  await expect.poll(async () => {
    const text = (await speedText.textContent())?.trim();
    if (expected.speed === '—') return text;
    return text?.match(/^-?\d+(\.\d+)?/)?.[0];
  }).toBe(expected.speed);

  // Encumbrance penalties are self-contributed (non-AE) DOWNGRADE changes recorded via
  // `Creature._buildEncumberedChanges()` -> `document.effectOverrides` - the same
  // `HasActiveEffectsNotification` sparkle used for real ActiveEffects must appear on
  // `system.speed.land` whenever tier > 0 downgrades it, and must NOT appear at tier 0
  // (no penalty change is pushed at all - see `_buildEncumberedChanges`'s early return).
  const speedEffectSparkle = page.locator(`${sheet} [data-field-path="${SPEED_PATH}"] .effect-tooltip`).first();
  await expect.poll(async () => speedEffectSparkle.count()).toBe(expectedTier > 0 ? 1 : 0);

  if (expectedTier > 0) {
    await assertSpeedEffectTooltip(page, speedEffectSparkle, expectedTier);
  }
}

/**
 * Hover the land-speed sparkle icon and verify the teleported tooltip popup
 * (`HasActiveEffectsNotification.vue`, `<Teleport to="body">`) shows the correct
 * tier label and encumbered-speed value - not just that the icon is present.
 */
async function assertSpeedEffectTooltip (page: any, speedEffectSparkle: any, expectedTier: number): Promise<void> {
  await speedEffectSparkle.hover();

  // Teleported to <body>, not scoped under the sheet selector.
  const popup = page.locator('.effect-tooltip-popup');
  await popup.waitFor({ state: 'visible', timeout: 10_000 });

  const entries = popup.locator('.effect-tooltip-entry');
  await expect.poll(async () => entries.count()).toBe(1);

  const entry = entries.first();
  const expectedLabel = await localizeTierLabel(page, expectedTier);
  await expect.poll(async () => (await entry.locator('.effect-name').textContent())?.trim())
    .toBe(expectedLabel);
  await expect.poll(async () => (await entry.locator('.effect-detail').textContent())?.trim())
    .toBe(`↓ ${TIER_SPEED_EFFECT_VALUE[expectedTier]}`);

  // Move the pointer away so the popup closes and doesn't intercept subsequent clicks.
  await page.mouse.move(0, 0);
  await popup.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
}

test.describe('Encumbrance penalty progression (six-tier scenario)', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });
  test('penalties escalate through all six tiers as carried weight increases, and reverse cleanly on removal', async ({ page }) => {
    test.setTimeout(120_000);

    await gotoGame(page);

    const actorUuid = await createActor(page, 'character', {
      name: 'Encumbrance Test Character',
      system: { abilities: { str: { score: 10 } } },
    });

    const sheet = await openDocumentSheet(page, actorUuid);
    await dismissOverlays(page);
    await openAttributesTab(page, sheet);

    // Switch to 'play' mode so the land-speed display reflects the effective (total)
    // speed - see SPEED_PATH comment above.
    const playButton = page.locator(`${sheet} .view-mode-bar .view-mode-btn`).filter({ has: page.locator('i.fa-dice-d20') });
    await playButton.click();

    // Baseline: no items, STR 10, tier 0 - no penalties at all.
    await assertSheetShowsTier(page, sheet, actorUuid, 0, 0);

    // Add items one at a time, escalating through tiers 0 -> 5.
    const itemUuids: string[] = [];
    const expectedTiersByStep = [0, 1, 2, 3, 4, 5];
    for (let i = 0; i < ITEM_WEIGHTS.length; i++) {
      const uuid = await createCarriedItem(page, actorUuid, `Encumbrance Item ${i + 1}`, ITEM_WEIGHTS[i]);
      itemUuids.push(uuid);
      await assertSheetShowsTier(page, sheet, actorUuid, expectedTiersByStep[i], CUMULATIVE_WEIGHTS[i]);
    }

    // Remove items in reverse order - penalties should come off symmetrically.
    // After removing the last item added (tier 5 -> back to tier 4's cumulative weight), etc.
    const reversedCumulative = [...CUMULATIVE_WEIGHTS.slice(0, -1)].reverse(); // weights after each removal
    const reversedExpectedTiers = expectedTiersByStep.slice(0, -1).reverse();
    for (let i = itemUuids.length - 1; i >= 0; i--) {
      await deleteItem(page, itemUuids[i]);
      const stepIndex = itemUuids.length - 1 - i;
      const expectedWeight = stepIndex < reversedCumulative.length
        ? reversedCumulative[stepIndex]
        : 0;
      const expectedTier = stepIndex < reversedExpectedTiers.length
        ? reversedExpectedTiers[stepIndex]
        : 0;
      await assertSheetShowsTier(page, sheet, actorUuid, expectedTier, expectedWeight);
    }

    // All items removed - back to baseline.
    await assertSheetShowsTier(page, sheet, actorUuid, 0, 0);
  });
});
