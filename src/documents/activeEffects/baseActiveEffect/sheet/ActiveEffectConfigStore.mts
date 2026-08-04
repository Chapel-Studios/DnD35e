import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type Color from '@common/utils/color.mjs';
import type { DocumentSheetStore, DocumentSheetStoreDocumentActions, DocumentSheetStoreDocumentGetters } from '@documents/document/index.mjs';
import { useDocumentSheetStore } from '@documents/document/index.mjs';
import type { ActiveEffectDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import { ActiveEffectSystemModel } from '@effects/baseActiveEffect/data/ActiveEffectSystemModel.mjs';
import { buildMergedFamiliarContext, getFamiliarBuilder } from '@helpers/formulae/index.mjs';
import type { ContextDocumentType, TargetContexts } from '@helpers/formulae/registry.mjs';
import type { FamiliarContext } from '@helpers/formulae/types.mjs';
import { syncOpenSheetTitle } from '@helpers/syncOpenSheetTitle.mjs';
import type { ItemDnd35e, ItemSheetStore } from '@items/baseItem/index.mjs';
import type { SelectOption } from '@vc/fields/formGroups/types.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import { getDefaultActiveEffectTabs } from './tabs/index.mjs';

const useActiveEffectConfigStore = <TDocument extends ActiveEffectDnd35e>(
  context: VueApplicationContext<TDocument>
) => {
  const baseStore = useDocumentSheetStore(context, {
    defaultTabs: [...getDefaultActiveEffectTabs()],
    defaultActiveTab: 'details',
  });

  const document = baseStore._storeUtils.document;
  baseStore._storeUtils.setGetFreshDocument(async (uuid: string) => {
    const doc = await foundry.utils.fromUuid(uuid);
    return doc as TDocument | null;
  });

  const hasOwner = computed(() => !!document.value.parent);

  const refreshOwningItem = async (): Promise<void> => {
    const parent = document.value.parent;
    if (!parent || parent.documentName !== 'Item') return;

    const item = await foundry.utils.fromUuid(parent.uuid) as ItemDnd35e | null ?? parent as ItemDnd35e;
    item.prepareData();

    if (item.uuid && game.dnd35e?.stores?.Item?.[item.uuid]) {
      await (game.dnd35e.stores.Item[item.uuid] as ItemSheetStore<any>)?._storeUtils.refreshDocument?.(item);
    }

    syncOpenSheetTitle(item.sheet);
    // `force: false` is a no-op when closed — editing an effect's changes must
    // never force-open the owning actor's sheet, only refresh it if already open.
    if (item.parent?.sheet?.rendered) item.parent.sheet.render(false);

    if (!item.parent) {
      game.documentIndex?.replaceDocument(item as unknown as foundry.abstract.Document);
      (globalThis as typeof globalThis & { ui?: { items?: { render: (force?: boolean) => void } } }).ui?.items?.render(true);
    }
  };

  /**
   * Resolve a FamiliarContext for a single target key ('item' or 'actor').
   *
   * Live-document path: if the effect has a parent of the matching type,
   * uses only that parent's specific subtype for the schema.
   *
   * Fallback path: merges all subtypes declared in `targetContexts`.
   */
  function resolveTargetContext(target: string): FamiliarContext | null {
    const systemConstructor = document.value.system?.constructor as typeof ActiveEffectSystemModel | undefined;
    const targetContexts: TargetContexts = systemConstructor?.targetContexts ?? {};
    const parent = document.value.parent;

    if (target === 'item') {
      // Live: effect lives on an item → use that item's specific type
      if (parent && 'documentName' in parent && (parent as any).documentName === 'Item') {
        const item = parent as ItemDnd35e;
        const builder = getFamiliarBuilder('Item', item.type as ContextDocumentType);
        if (builder) {
          return {
            properties: builder(item),
            aliases: ['item'],
          };
        }
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
        if (builder) {
          return {
            properties: builder(actor),
            aliases: ['actor'],
          };
        }
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

  function getTargetFamiliarContextName(target: string): string {
    const parent = document.value.parent;

    if (target === 'item' && parent && 'documentName' in parent && (parent as any).documentName === 'Item') {
      return (parent as ItemDnd35e).type;
    }

    if (target === 'actor' && parent && 'documentName' in parent) {
      if ((parent as any).documentName === 'Actor') {
        return (parent as ActorDnd35e).type;
      }

      if ((parent as any).documentName === 'Item') {
        const actor = (parent as ItemDnd35e).parent as ActorDnd35e | null;
        if (actor) return actor.type;
      }
    }

    return target;
  }

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
    statusOptions: computed<SelectOption<string>[]>(() =>
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
    /** All effect changes. */
    visibleChanges: computed(() => document.value.system?.changes ?? []),
    getTargetFamiliarContext,
    getTargetFamiliarContextName,
  };

  const documentActions: ActiveEffectConfigStoreDocumentActions<TDocument> = {
    ...baseStore.documentActions,
    addChange: async (changeData: EffectChangeDataDnd35e) => {
      if (!('changes' in document.value.system)) return false;
      const changes = document.value.system.changes || [];
      const updatedChanges = [
        ...changes,
        {
          ...changeData,
          id: foundry.utils.randomID(),
        },
      ];
      const updated = await baseStore._storeUtils.updateDocument(
        { system: { changes: updatedChanges } } as Partial<TDocument>,
        {
          diff: false,
        }
      );
      if (updated) await refreshOwningItem();
      return updated;
    },
    // Rows are targeted by their stable `id` (not array position) rather than the row's
    // render-time array index — a field's blur-commit can still be in flight (e.g. async
    // validation/canonicalization) when a different row's delete lands first and shifts
    // array positions. Resolving the current index by `id` at the moment of the update
    // means a delayed commit either still lands on the right row, or safely no-ops if
    // that row is gone by then.
    removeChange: async (id: string) => {
      if (!('changes' in document.value.system)) return false;
      const changes = document.value.system.changes || [];
      const index = changes.findIndex((c: any) => c.id === id);
      if (index === -1) return false;
      const updatedChanges = [...changes];
      updatedChanges.splice(index, 1);
      const updated = await baseStore._storeUtils.updateDocument(
        { system: { changes: updatedChanges } } as Partial<TDocument>,
        {
          diff: false,
        }
      );
      if (updated) await refreshOwningItem();
      return updated;
    },
    updateChangeField: async (id: string, field: string, value: unknown) => {
      if (!('changes' in document.value.system)) return false;
      const changes = document.value.system.changes || [];
      if (!changes.some((c: any) => c.id === id)) return false;
      const updatedChanges = changes.map((c: any) =>
        c.id === id ? { ...c, [field]: value } : c
      );
      const updated = await baseStore._storeUtils.updateDocument(
        { system: { changes: updatedChanges } } as Partial<TDocument>,
        {
          diff: false,
        }
      );
      if (updated) await refreshOwningItem();
      return updated;
    },
    updateDurationValue: async (value: number | null) => {
      return await baseStore._storeUtils.updateDocument(
        { 'duration.value': value }
      );
    },
    updateDurationUnits: async (units: string | null) => {
      return await baseStore._storeUtils.updateDocument(
        { 'duration.units': units ?? '' }
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
  statusOptions: ComputedRef<SelectOption<string>[]>;
  showIcon: ComputedRef<number>;
  showIconOptions: ComputedRef<SelectOption<number>[]>;
  origin: ComputedRef<string>;
  changes: ComputedRef<any[]>;
  /** All effect changes. */
  visibleChanges: ComputedRef<any[]>;
  hasOwner: ComputedRef<boolean>;
  /** Build a FamiliarContext for the given change target ('item' or 'actor'). */
  getTargetFamiliarContext: (target: string) => FamiliarContext | null;
  /** Resolve the preferred context name for the given target using the live parent document subtype when available. */
  getTargetFamiliarContextName: (target: string) => string;
};

type ActiveEffectConfigStoreDocumentActions<TDocument extends ActiveEffectDnd35e> = DocumentSheetStoreDocumentActions<TDocument> & {
  addChange: (changeData: EffectChangeDataDnd35e) => Promise<boolean>;
  /** Removes the row with the given stable `id` — see `ActiveEffectSystemModel`'s `changes` schema. */
  removeChange?: (id: string) => Promise<boolean>;
  /** Updates a field on the row with the given stable `id` — see `ActiveEffectSystemModel`'s `changes` schema. */
  updateChangeField: (id: string, field: string, value: unknown) => Promise<boolean>;
  updateDurationValue: (value: number | null) => Promise<boolean>;
  updateDurationUnits: (units: string | null) => Promise<boolean>;
};

type ActiveEffectConfigStore<TDocument extends ActiveEffectDnd35e = ActiveEffectDnd35e> = DocumentSheetStore<TDocument> & {
  documentGetters: ActiveEffectConfigStoreDocumentGetters;
  documentActions: ActiveEffectConfigStoreDocumentActions<TDocument>;
};

export { useActiveEffectConfigStore };

export type {
  ActiveEffectConfigStore,
  ActiveEffectConfigStoreDocumentActions,
  ActiveEffectConfigStoreDocumentGetters,
};