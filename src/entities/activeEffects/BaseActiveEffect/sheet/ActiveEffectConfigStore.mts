import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type Color from '@common/utils/color.mjs';
import type { DocumentSheetStore, DocumentSheetStoreDocumentActions, DocumentSheetStoreDocumentGetters } from '@ec/CoreMixin/index.mjs';
import type { RenderModeStore } from '@ec/CoreMixin/index.mjs';
import { RenderModeStoreSymbol, useDocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { ActiveEffectSystemModelBase } from '@effects/BaseActiveEffect/data/index.mjs';
import type { DnD35eActiveEffect, Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/index.mjs';
import { EFFECT_CHANGE_TARGET_FIELD } from '@effects/BaseActiveEffect/index.mjs';
import { buildMergedFamiliarContext, getFamiliarBuilder } from '@helpers/formulae/index.mjs';
import type { ContextDocumentType, TargetContexts } from '@helpers/formulae/registry.mjs';
import type { FamiliarContext } from '@helpers/formulae/types.mjs';
import { IDENTIFIED } from '@helpers/formulae/types.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { MultiSelectOption, SelectOption } from '@vc/Fields/FormGroups/types.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed, inject } from 'vue';

import { getDefaultActiveEffectTabs } from './tabs/index.mjs';

const useActiveEffectConfigStore = <TDocument extends DnD35eActiveEffect>(
  context: VueApplicationContext<TDocument>
) => {
  const baseStore = useDocumentSheetStore(context, {
    defaultTabs: [...getDefaultActiveEffectTabs()],
    defaultActiveTab: 'details',
  });

  const document = baseStore._storeUtils.document;
  const { identifiedViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  baseStore._storeUtils.setGetFreshDocument(async (uuid: string) => {
    const doc = await foundry.utils.fromUuid(uuid);
    return doc as TDocument | null;
  });

  const hasOwner = computed(() => !!document.value.parent);

  /**
   * Resolve a FamiliarContext for a single target key ('item' or 'actor').
   *
   * Live-document path: if the effect has a parent of the matching type,
   * uses only that parent's specific subtype for the schema.
   *
   * Fallback path: merges all subtypes declared in `targetContexts`.
   */
  function resolveTargetContext(target: string): FamiliarContext | null {
    const systemConstructor = document.value.system?.constructor as typeof ActiveEffectSystemModelBase | undefined;
    const targetContexts: TargetContexts = systemConstructor?.targetContexts ?? {};
    const parent = document.value.parent;

    if (target === 'item') {
      // Live: effect lives on an item → use that item's specific type
      if (parent && 'documentName' in parent && (parent as any).documentName === 'Item') {
        const item = parent as ItemDnd35e;
        const builder = getFamiliarBuilder('Item', item.type as ContextDocumentType);
        if (builder) return { properties: builder(item) };
      }
      // Fallback: merge all declared item subtypes
      const subtypes = targetContexts.item;
      if (subtypes?.length) return buildMergedFamiliarContext('Item', subtypes);
      return null;
    }

    if (target === 'actor') {
      // Live: effect on item → item's parent actor; effect on actor → direct parent
      let actor: ActorDnd35e | null = null;
      if (parent && 'documentName' in parent) {
        if ((parent as any).documentName === 'Actor') {
          actor = parent as ActorDnd35e;
        } else if ((parent as any).documentName === 'Item') {
          actor = (parent as ItemDnd35e).parent as ActorDnd35e | null;
        }
      }
      if (actor) {
        const builder = getFamiliarBuilder('Actor', actor.type as ContextDocumentType);
        if (builder) return { properties: builder(actor) };
      }
      // Fallback: merge all declared actor subtypes
      const subtypes = targetContexts.actor;
      if (subtypes?.length) return buildMergedFamiliarContext('Actor', subtypes);
      return null;
    }

    return null;
  }

  // Pre-computed contexts — one per target. Recomputes only when the document changes.
  const itemFamiliarContext = computed(() => resolveTargetContext('item'));
  const actorFamiliarContext = computed(() => resolveTargetContext('actor'));

  function getTargetFamiliarContext(target: string): FamiliarContext | null {
    if (target === 'item') return itemFamiliarContext.value;
    if (target === 'actor') return actorFamiliarContext.value;
    return null;
  }

  // Effect-specific document getters
  const documentGetters: ActiveEffectConfigStoreDocumentGetters = {
    ...baseStore.documentGetters,
    hasOwner,
    // Duration properties
    durationValue: computed(() => {
      const val = document.value.duration?.value;
      return val != null && Number.isFinite(val) ? val : null;
    }),
    durationUnits: computed(() => document.value.duration?.units ?? 'none'),
    // Effect-specific
    isDisabled: computed(() => document.value.disabled ?? false),
    tint: computed(() => document.value.tint ?? null),
    transfer: computed(() => document.value.transfer ?? false),
    statuses: computed(() => [...(document.value.statuses ?? [])]),
    statusOptions: computed<MultiSelectOption<string>[]>(() =>
      Object.values(CONFIG.statusEffects).map(s => ({
        value: s.id,
        label: s.name,
        icon: s.img,
      }))
    ),
    showIcon: computed(() => document.value.showIcon ?? 0),
    showIconOptions: computed<SelectOption<number>[]>(() => {
      const showIconConst = (CONST as any).ACTIVE_EFFECT_SHOW_ICON as Record<string, number>;
      return Object.entries(showIconConst)
        .map(([key, value]) => ({
          value: value,
          label: `EFFECT.SHOW_ICON.${key.toLowerCase()}`,
        }))
        .reverse();
    }),
    origin: computed(() => document.value.origin ?? ''),
    changes: computed(() => document.value.system?.changes ?? []),
    /**
     * Changes filtered by the current identified/unidentified view mode.
     * In identified view: shows only changes targeting .value (identified).
     * In unidentified view: shows only changes targeting .unidentifiedValue.
     */
    visibleChanges: computed(() => {
      const allChanges = document.value.system?.changes ?? [];
      const targetField = identifiedViewMode.value === IDENTIFIED
        ? EFFECT_CHANGE_TARGET_FIELD.VALUE
        : EFFECT_CHANGE_TARGET_FIELD.UNIDENTIFIED;
      return allChanges.filter(
        (c: Dnd35eEffectChangeData) => (c.targetField ?? EFFECT_CHANGE_TARGET_FIELD.VALUE) === targetField
      );
    }),
    getTargetFamiliarContext,
  };

  const documentActions: ActiveEffectConfigStoreDocumentActions<TDocument> = {
    ...baseStore.documentActions,
    addChange: async (changeData: Dnd35eEffectChangeData) => {
      if (!('changes' in document.value.system)) return false;
      const changes = document.value.system.changes || [];
      const updatedChanges = [...changes, changeData];
      return await baseStore._storeUtils.updateDocument(
        { system: { changes: updatedChanges } } as Partial<TDocument>,
        {
          diff: false,
        }
      );
    },
    removeChange: async (index: number) => {
      if (!('changes' in document.value.system)) return false;
      const changes = document.value.system.changes || [];
      const updatedChanges = [...changes];
      updatedChanges.splice(index, 1);
      return await baseStore._storeUtils.updateDocument(
        { system: { changes: updatedChanges } } as Partial<TDocument>,
        {
          diff: false,
        }
      );
    },
    updateChangeField: async (index: number, field: string, value: unknown) => {
      if (!('changes' in document.value.system)) return false;
      const changes = document.value.system.changes || [];
      const updatedChanges = changes.map((c: any, i: number) =>
        i === index ? { ...c, [field]: value } : c
      );
      return await baseStore._storeUtils.updateDocument(
        { system: { changes: updatedChanges } } as Partial<TDocument>,
        {
          diff: false,
        }
      );
    },
    updateDurationValue: async (value: number | null) => {
      return await baseStore._storeUtils.updateDocument(
        { 'duration.value': value }
      );
    },
    updateDurationUnits: async (units: string) => {
      return await baseStore._storeUtils.updateDocument(
        { 'duration.units': units }
      );
    },
  };

  return {
    ...baseStore,
    documentGetters,
    documentActions,
  };
};

type ActiveEffectConfigStoreDocumentGetters = DocumentSheetStoreDocumentGetters & {
  durationValue: ComputedRef<number | null>;
  durationUnits: ComputedRef<string>;
  isDisabled: ComputedRef<boolean>;
  tint: ComputedRef<Color | null>;
  transfer: ComputedRef<boolean>;
  statuses: ComputedRef<string[]>;
  statusOptions: ComputedRef<MultiSelectOption<string>[]>;
  showIcon: ComputedRef<number>;
  showIconOptions: ComputedRef<SelectOption<number>[]>;
  origin: ComputedRef<string>;
  changes: ComputedRef<any[]>;
  /** Changes filtered by view mode — hides unidentified-targeted changes in identified view. */
  visibleChanges: ComputedRef<any[]>;
  hasOwner: ComputedRef<boolean>;
  /** Build a FamiliarContext for the given change target ('item' or 'actor'). */
  getTargetFamiliarContext: (target: string) => FamiliarContext | null;
};

type ActiveEffectConfigStoreDocumentActions<TDocument extends DnD35eActiveEffect> = DocumentSheetStoreDocumentActions<TDocument> & {
  addChange: (changeData: Dnd35eEffectChangeData) => Promise<boolean>;
  removeChange?: (index: number) => Promise<boolean>;
  updateChangeField: (index: number, field: string, value: unknown) => Promise<boolean>;
  updateDurationValue: (value: number | null) => Promise<boolean>;
  updateDurationUnits: (units: string) => Promise<boolean>;
};

type ActiveEffectConfigStore<TDocument extends DnD35eActiveEffect = DnD35eActiveEffect> = DocumentSheetStore<TDocument> & {
  documentGetters: ActiveEffectConfigStoreDocumentGetters;
  documentActions: ActiveEffectConfigStoreDocumentActions<TDocument>;
};

export { useActiveEffectConfigStore };

export type {
  ActiveEffectConfigStore,
  ActiveEffectConfigStoreDocumentActions,
  ActiveEffectConfigStoreDocumentGetters,
};