import type { RenderModeStore } from '@documents/document/sheet/stores/RenderModeStore.mjs';
import { GENERAL_EFFECT_TYPE } from '@effects/effectTypes.mjs';
import type { General } from '@effects/general/General.mjs';
import type { GeneralStore } from '@effects/general/sheet/GeneralStore.mjs';
import { useGeneralStore } from '@effects/general/sheet/GeneralStore.mjs';
import type { ActiveEffectDnd35e } from '@effects/index.mjs';
import type { Material } from '@effects/material/Material.mjs';
import { materialEffectType } from '@effects/material/materialEffectType.mjs';
import type { MaterialStore } from '@effects/material/sheet/MaterialStore.mjs';
import { useMaterialStore } from '@effects/material/sheet/MaterialStore.mjs';
import type { Secret } from '@effects/secret/Secret.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import type { SecretStore } from '@effects/secret/sheet/SecretStore.mjs';
import { useSecretStore } from '@effects/secret/sheet/SecretStore.mjs';
import type { VueApplicationConfiguration, VueApplicationContext } from '@vueApps/VueAppTypes.mjs';

type EffectRowStore = GeneralStore | MaterialStore | SecretStore;

/**
 * There is no real Application behind an effect row, so `appConfigOptions`
 * (viewPermission, editPermission, canCreate, sheetConfig, etc.) is never read by the
 * store chain - only `document` is actually consumed. Cast rather than fully satisfying
 * `DocumentSheetConfiguration`, since nothing downstream reads it.
 */
const buildRowContext = <TDocument extends ActiveEffectDnd35e>(effect: TDocument): VueApplicationContext<TDocument> => ({
  document: effect,
  appConfigOptions: { document: effect } as VueApplicationConfiguration<TDocument>,
  close: async () => {},
});

/**
 * Row-scoped equivalent of `createItemRowStore` (see itemRowStoreRegistry.mts) - resolves
 * a per-effect-type store instead of a component. Effect leaf stores never self-register
 * into `game.dnd35e.stores` at all (unlike item leaf stores), so there's no
 * `registerGlobally` option here to opt out of. Row stores are owned/cached by the parent
 * Item or Actor store (see `getOrCreateEffectRowStore` on `ItemSheetStore`/`ActorSheetStore`),
 * never shared with a standalone ActiveEffect config sheet's own store instance.
 *
 * `renderModeStore` must be the PARENT store's own instance, not resolved via ambient
 * `inject()` here - this function isn't guaranteed to run synchronously inside a component
 * that's a Vue-tree descendant of whichever Application provided it.
 *
 * `containment` effects have no registered sheet/leaf store (system-generated only, never
 * user-created or user-edited) and are intentionally unhandled here.
 */
const createEffectRowStore = (effect: ActiveEffectDnd35e, renderModeStore: RenderModeStore): EffectRowStore => {
  switch (effect.type) {
    case GENERAL_EFFECT_TYPE:
      return useGeneralStore(buildRowContext(effect as General), { renderModeStore });
    case materialEffectType:
      return useMaterialStore(buildRowContext(effect as Material), { renderModeStore });
    case secretEffectType:
      return useSecretStore(buildRowContext(effect as Secret), { renderModeStore });
    default:
      throw new Error(`No effect row store registered for effect type "${effect.type}".`);
  }
};

export { createEffectRowStore };
export type { EffectRowStore };
