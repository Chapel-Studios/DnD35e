import type { Page } from '@playwright/test';

/**
 * Render a document sheet by UUID and return a CSS selector for its root.
 *
 * Works for any document type (Item, Actor, etc.) — uses Foundry's
 * `fromUuid` and the document's `.sheet` application.
 *
 * Polls until the sheet's root element is actually attached to the DOM
 * (Foundry's `render({force: true})` resolves before AppV2 mounts the
 * element in some cases), then waits on the selector to be attached.
 */
export async function openDocumentSheet (page: Page, uuid: string): Promise<string> {
  const sheetId = await page.evaluate(async (docUuid) => {
    const doc = await (globalThis as any).fromUuid(docUuid);
    if (!doc) throw new Error(`fromUuid returned nothing for ${docUuid}`);
    await doc.sheet.render({ force: true });
    for (let i = 0; i < 50; i++) {
      if (doc.sheet.element && document.body.contains(doc.sheet.element)) {
        return doc.sheet.element.id as string;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`sheet element for ${docUuid} never attached (sheet.id=${doc.sheet.id})`);
  }, uuid);

  const selector = `#${sheetId}`;
  await page.locator(selector).waitFor({ state: 'attached', timeout: 10_000 });
  return selector;
}

/**
 * Read the displayed document name from a rendered sheet body.
 *
 * Targets `.item-name` from `DocumentName.vue` (CoreMixin) — this surface
 * is shared by every dnd35e document sheet and is Vue-reactive, unlike
 * `.window-title` which only updates on full sheet render.
 */
export async function readSheetName (page: Page, sheetSelector: string): Promise<string> {
  const titleLocator = page.locator(`${sheetSelector} .item-name`);
  await titleLocator.waitFor({ state: 'attached', timeout: 10_000 });
  return (await titleLocator.textContent())?.trim() ?? '';
}

/**
 * Force a document's sheet to re-render if it's currently open.
 *
 * Use when you need `VueDocumentSheetMixin#syncWindowTitle` or other
 * full-render hooks to pick up new state (e.g. mask changes from another
 * client). No-op if the sheet isn't rendered.
 */
export async function rerenderSheet (page: Page, uuid: string): Promise<void> {
  await page.evaluate(async (docUuid) => {
    const doc = await (globalThis as any).fromUuid(docUuid);
    if (doc?.sheet?.rendered) await doc.sheet.render(true);
  }, uuid);
}

/**
 * Close every open Foundry application (sheets, dialogs, etc.) on the page.
 *
 * Useful in `afterEach` to prevent UI bleed between tests.
 */
export async function closeAllSheets (page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const app of (globalThis as any).foundry.applications.instances.values()) {
      if (typeof app.close === 'function') app.close({ animate: false }).catch(() => {});
    }
  });
}
