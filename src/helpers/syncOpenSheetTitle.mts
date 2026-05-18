/**
 * Sync a Foundry V14 ApplicationV2 header title to the document's current title.
 *
 * Foundry only repaints the title element on full re-render. When upstream code
 * mutates the underlying document name in-place (e.g. inside a `prePostName`
 * pipeline) we need a lightweight nudge so any open sheet header reflects the
 * new value without a full render cycle.
 */
export const syncOpenSheetTitle = (
  sheet:
    | { rendered?: boolean; title?: string; window?: { title?: HTMLElement } }
    | null
    | undefined
): void => {
  if (!sheet?.rendered) return;
  if (sheet.window?.title instanceof HTMLElement) {
    sheet.window.title.textContent = sheet.title ?? '';
  }
};
