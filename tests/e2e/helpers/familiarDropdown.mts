import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { dismissOverlays } from './ui.mjs';

/**
 * Page-object helpers for the FormulaFamiliar autocomplete dropdown.
 *
 * Rendered by [FamiliarDropdown.vue](../../../src/vue/components/FamiliarDropdown.vue),
 * the dropdown is opened by typing an unescaped `#` in a `FormulaFormGroup`
 * input. Options come from the document's `FamiliarSchema`. Selecting a
 * branch (non-leaf) immediately reopens the menu one level deeper; selecting
 * a leaf inserts `option.fullPath` into the input and closes the menu.
 *
 * Each rendered option carries a `title` attribute set to its `accessPath`
 * (the canonical document path, e.g. `system.weaponDamage.damageRoll`) or
 * falls back to `fullPath` for top-level contexts (e.g. `#Self`). The
 * displayed `.option-path` text is the human-readable label and can include
 * a parenthesized alias/type annotation — assertions and clicks should
 * prefer the stable `title` over the localized display.
 */

export interface FamiliarOptionInfo {
  /** Human-readable label as shown to the user. May include `(aliases)`. */
  display: string;
  /** Stable identifier — canonical access path for leaves/branches, or `#Context` for root. */
  title: string;
}

/** Locate the `<input>` element of a FormulaFormGroup by its field path. */
export function familiarInput (page: Page, sheetSelector: string, fieldPath: string): Locator {
  return page.locator(`${sheetSelector} [data-field-path="${fieldPath}"] .formula-input`);
}

/** Locate the visible FormulaFamiliar dropdown menu (only one is ever open). */
export function familiarMenu (page: Page, sheetSelector: string): Locator {
  return page.locator(`${sheetSelector} .familiar-dropdown`);
}

/**
 * Focus the formula input, clear any existing value, type a single unescaped
 * `#`, and wait for the dropdown to render. Returns the input locator for
 * chained interaction.
 *
 * Clearing first ensures the inserted `option.fullPath` is the sole content
 * of the input — the name field in particular pre-fills with the document's
 * resolved name, which would otherwise be prepended to the inserted formula.
 */
export async function openFamiliar (page: Page, sheetSelector: string, fieldPath: string): Promise<Locator> {
  // Foundry's notifications (e.g. "screen resolution" warning, system info)
  // pin into a top-stacked `#notifications` overlay that intercepts pointer
  // events on inputs near the sheet header. Clear them first.
  await dismissOverlays(page);
  const input = familiarInput(page, sheetSelector, fieldPath);
  await input.click();
  await input.fill('');
  await page.keyboard.type('#');
  await expect(familiarMenu(page, sheetSelector)).toBeVisible({ timeout: 2_000 });
  return input;
}

/** Read the visible options in dropdown order as `{ display, title }` pairs. */
export async function readFamiliarOptions (page: Page, sheetSelector: string): Promise<FamiliarOptionInfo[]> {
  const items = page.locator(`${sheetSelector} .familiar-dropdown .familiar-item`);
  const count = await items.count();
  const results: FamiliarOptionInfo[] = [];
  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    const display = (await item.locator('.option-path').textContent())?.trim() ?? '';
    const title = (await item.getAttribute('title')) ?? '';
    results.push({ display, title });
  }
  return results;
}

/** Convenience: return only the `title` attributes (stable access paths). */
export async function readFamiliarOptionTitles (page: Page, sheetSelector: string): Promise<string[]> {
  return (await readFamiliarOptions(page, sheetSelector)).map((o) => o.title);
}

/**
 * Click the dropdown option whose `title` attribute matches exactly.
 *
 * The `title` carries the canonical access path (e.g. `system.weaponDamage`)
 * or the top-level fullPath (e.g. `#Self`) — both are stable identifiers
 * independent of localization.
 *
 * For branch options the dropdown reopens at the next level; for leaves it
 * closes.
 */
export async function selectFamiliarOption (page: Page, sheetSelector: string, title: string): Promise<void> {
  const option = page.locator(
    `${sheetSelector} .familiar-dropdown .familiar-item[title="${title}"]`
  ).first();
  await expect(option).toBeVisible({ timeout: 2_000 });
  await option.click();
}

/** Press Escape to close the dropdown without making a selection. */
export async function dismissFamiliar (page: Page, sheetSelector: string): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(familiarMenu(page, sheetSelector)).toBeHidden({ timeout: 2_000 });
}
