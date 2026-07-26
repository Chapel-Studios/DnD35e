import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { ActiveEffectDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import type { EffectType } from '@effects/effectTypes.mjs';
import { EFFECT_TYPES } from '@effects/effectTypes.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import type { ComputedRef, ShallowRef } from 'vue';
import { computed, ref, triggerRef } from 'vue';

/** Any document type that can own an embedded `ActiveEffect` collection. */
type EffectHostDocument = ItemDnd35e | ActorDnd35e;

/**
 * Reads a single embedded effect by id. Typed as a plain lookup (rather than calling
 * `.effects.get()` directly) because when `document` is generic over the
 * `ItemDnd35e | ActorDnd35e` union, TS cannot merge the two documents' distinct
 * `EmbeddedCollection#get()` overload sets into one callable signature.
 */
function getEffect(document: EffectHostDocument, effectId: string): ActiveEffectDnd35e | undefined {
  return (document.effects as unknown as { get(id: string): ActiveEffectDnd35e | undefined }).get(effectId);
}

interface EffectDocumentGetters {
  effects: ComputedRef<ActiveEffectDnd35e[]>;
  getEffectsForField: (fieldPath: string) => ComputedRef<object[]>;
  hasEffectsForField: (fieldPath: string) => ComputedRef<boolean>;
}

interface EffectDocumentActions {
  removeEffect: (effectId: string) => Promise<boolean>;
  toggleEffect: (effectId: string) => Promise<boolean>;
  editEffect: (effectId: string) => boolean;
  /** `additionalTypes` are only added to the create-dialog's type picker for GM users. */
  createEffect: (additionalTypes?: EffectType[]) => Promise<void>;
  toggleEffectHidden: (effectId: string) => Promise<boolean>;
}

interface EffectDocumentUtils {
  updateHiddenEffects: (effectTypes: EffectType[]) => Promise<void>;
  /** Excludes these effect types from the general list entirely for non-GM users (still visible to GM). */
  updateGmOnlyEffectTypes: (effectTypes: EffectType[]) => Promise<void>;
}

/**
 * Shared embedded-ActiveEffect getters/actions for any document (Item or Actor) that
 * owns an `.effects` EmbeddedCollection. Extracted from `ItemSheetStore` so the same
 * behavior (visibility filtering, temp/passive/inactive buckets, create/edit/toggle/
 * remove actions) can be reused by actor-level sheet stores without duplication.
 */
function useEffectDocumentActions(
  document: ShallowRef<EffectHostDocument>
): {
  getters: EffectDocumentGetters;
  actions: EffectDocumentActions;
  utils: EffectDocumentUtils;
} {
  const isGM = game.user.isGM;

  // Note: we spread the effects into a plain array to avoid Vue proxy conflicts
  // with Foundry's EmbeddedCollection proxy (non-configurable property error)
  const hiddenEffectTypeIds = ref<Set<string>>(new Set());
  const gmOnlyEffectTypeIds = ref<Set<string>>(new Set());
  const allEffects = computed(() => [...(document.value.effects ?? [])]
    .filter((effect: ActiveEffectDnd35e) => !hiddenEffectTypeIds.value.has(effect.type))
    .filter((effect: ActiveEffectDnd35e) => isGM || !gmOnlyEffectTypeIds.value.has(effect.type))
  );
  // Non-GM users cannot see effects with isHidden: true
  const effects = computed(() => isGM
    ? allEffects.value
    : allEffects.value.filter((e: ActiveEffectDnd35e) => !e.system.isHidden)
  );
  const getEffectsForField = (fieldPath: string) => computed(() => document.value.effectOverrides?.[fieldPath]
    ? document.value.effectOverrides?.[fieldPath] as []
    : []
  );

  const getters: EffectDocumentGetters = {
    effects,
    getEffectsForField,
    hasEffectsForField: (fieldPath: string) => computed(() => getEffectsForField(fieldPath).value.length > 0),
  };

  const actions: EffectDocumentActions = {
    removeEffect: async (effectId: string) => {
      const effect = getEffect(document.value, effectId);
      if (!effect) return false;

      await effect.deleteDialog();
      triggerRef(document);
      return true;
    },
    toggleEffect: async (effectId: string) => {
      const effect = getEffect(document.value, effectId);
      if (!effect) return false;
      await effect.update({ disabled: !effect.disabled });
      triggerRef(document);
      return true;
    },
    editEffect: (effectId: string) => {
      const effect = getEffect(document.value, effectId);
      if (!effect) return false;
      effect.sheet?.render(true);
      triggerRef(document);
      return true;
    },
    createEffect: async (additionalTypes: EffectType[] = []) => {
      const effectData = {
        name: game.i18n.localize('dnd35e.EFFECT.New'),
        img: 'icons/svg/aura.svg',
        origin: document.value.uuid,
        disabled: false,
      };
      const creatableTypes = [
        ...Object.keys(EFFECT_TYPES),
        ...(isGM ? additionalTypes : []),
      ];
      // TODO(Phase 7): fix type definitions — add createDialog static method signature to ActiveEffectDnd35e
      await (ActiveEffectDnd35e as any).createDialog(effectData, {
        parent: document.value,
      }, {
        types: creatableTypes,
      });
      triggerRef(document);
    },
    toggleEffectHidden: async (effectId: string) => {
      const effect = getEffect(document.value, effectId);
      if (!effect) return false;
      await effect.update({ 'system.isHidden': !effect.system.isHidden });
      triggerRef(document);
      return true;
    },
  };

  const utils: EffectDocumentUtils = {
    updateHiddenEffects: async (effectTypes: EffectType[]) => {
      hiddenEffectTypeIds.value = new Set([
        ...hiddenEffectTypeIds.value,
        ...effectTypes,
      ]);
    },
    updateGmOnlyEffectTypes: async (effectTypes: EffectType[]) => {
      gmOnlyEffectTypeIds.value = new Set([
        ...gmOnlyEffectTypeIds.value,
        ...effectTypes,
      ]);
    },
  };

  return { getters, actions, utils };
}

export { useEffectDocumentActions };
export type { EffectDocumentActions, EffectDocumentGetters, EffectDocumentUtils, EffectHostDocument };
