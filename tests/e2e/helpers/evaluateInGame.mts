import type { Page } from '@playwright/test';

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
