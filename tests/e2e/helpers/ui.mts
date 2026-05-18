import type { Page } from '@playwright/test';

/**
 * Clear Foundry's transient UI overlays that can intercept Playwright clicks.
 *
 * Does NOT close any Application windows — `app.close()` on system dialogs
 * can trigger unexpected reloads. Use Playwright clicks against close
 * buttons for those.
 *
 * Pattern lifted from D35E's `test/e2e/helpers.js#dismissOverlays`.
 */
export async function dismissOverlays (page: Page): Promise<void> {
  await page.evaluate(() => {
    const ui = (globalThis as any).ui;
    if (ui?.notifications) {
      ui.notifications.queue = [];
      ui.notifications.active = [];
      const el = document.querySelector('#notifications');
      if (el) el.innerHTML = '';
    }
  });
  // Brief settle — DOM mutation from above + Foundry's own redraw cycle.
  await page.waitForTimeout(150);
}

/**
 * Typed wrapper around page.evaluate that exposes `game`, `CONFIG`, `foundry`
 * with proper types in the callback. Reduces boilerplate in specs.
 *
 * STORY 1 SKELETON — typed shim lands when Story 6 has a real Foundry
 * type surface to reference. For now, fall back to `page.evaluate` directly.
 */
export async function evaluateInGame<T> (
  page: Page,
  fn: () => T | Promise<T>
): Promise<T> {
  return page.evaluate(fn);
}
