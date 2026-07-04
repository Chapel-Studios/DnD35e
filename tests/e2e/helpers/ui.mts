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
 * Close Foundry's auto-opened `UserConfig` dialog.
 *
 * On first join, a player with no assigned character gets a `UserConfig`
 * application rendered on top of everything. It intercepts pointer events over
 * sheet windows and races with sheet rendering, which is the dominant source
 * of flakiness in player-context specs (clicks land on the dialog, sheet
 * interactions time out).
 *
 * The dialog can render a beat AFTER `game.ready`, so we poll briefly to catch
 * a late open. Idempotent and safe to call when no dialog is present (it simply
 * finds nothing to close). Closing `UserConfig` via its own `close()` is safe —
 * unlike the system-info dialogs called out in `dismissOverlays`.
 */
export async function closePlayerConfigIfOpen (page: Page): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const closed = await page.evaluate(async () => {
      const apps = (globalThis as any).foundry?.applications?.instances;
      if (!apps?.values) return false;
      let didClose = false;
      for (const app of apps.values()) {
        if (!app?.constructor?.name?.match(/UserConfig/i)) continue;
        if (typeof app.close === 'function') {
          await app.close({ animate: false });
          didClose = true;
        }
      }
      return didClose;
    });
    if (closed) break;
    await page.waitForTimeout(100);
  }
  await dismissOverlays(page);
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
