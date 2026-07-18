import { syncOpenSheetTitle } from '@helpers/syncOpenSheetTitle.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import type { ItemSheetStore } from '@items/baseItem/sheet/index.mjs';

const refreshOwningDocument = (document: unknown): void => {
  const effect = document as foundry.documents.ActiveEffect | null;
  const parent = effect?.parent;
  if (!parent || !parent.id || !parent.documentName) return;

  // Re-run prepareData so derived data (e.g. system.isBroken, secret-driven
  // name/img) recomputes from the current set of effects.
  (parent as { prepareData?: () => void }).prepareData?.();

  const stores = game.dnd35e?.stores as unknown as Record<string, Record<string, ItemSheetStore<any>>> | undefined;
  const store = stores?.[parent.documentName]?.[parent.id];
  store?._storeUtils.refreshDocument?.(parent as unknown as ItemDnd35e);

  // Sync the open sheet's window title (secret-driven name changes etc.)
  // TODO: Revisit secret hook refresh coverage for masked top-level fields like img.
  // Name is updated here today, but secret images and similar fields still need a
  // deliberate refresh path for directories/sidebar-style consumers when we return to it.
  const sheet = (parent as { sheet?: foundry.applications.api.ApplicationV2 | null }).sheet;
  if (sheet) syncOpenSheetTitle(sheet);

  // Re-render the parent's own sheet so view-mode-bar `hasSecrets` and other
  // render-time computed state refresh (see VueDocumentSheetMixin#_onRender).
  // `force: false` is a no-op when closed.
  if (sheet?.rendered) sheet.render(false);

  // Also refresh the grand-parent (e.g. Actor sheet showing this item) so
  // embedded displays update their masked surfaces.
  const grandParent = (parent as { parent?: { sheet?: foundry.applications.api.ApplicationV2 | null } }).parent;
  grandParent?.sheet?.render(true);
};

export { refreshOwningDocument };
