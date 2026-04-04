import type Color from '@common/utils/color.mjs';
import type { DocumentSheetStore, DocumentSheetStoreDocumentActions, DocumentSheetStoreDocumentGetters } from '@ec/CoreMixin/index.mjs';
import { RenderModeStoreSymbol, useDocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { RenderModeStore } from '@ec/CoreMixin/index.mjs';
import type { DnD35eActiveEffect, Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/index.mjs';
import { EFFECT_CHANGE_TARGET_FIELD } from '@effects/BaseActiveEffect/index.mjs';
import { IDENTIFIED } from '@helpers/formulae/types.mjs';
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
    statusOptions: computed<MultiSelectOption[]>(() =>
      Object.values(CONFIG.statusEffects).map(s => ({
        value: s.id,
        label: s.name,
        icon: s.img,
      }))
    ),
    showIcon: computed(() => document.value.showIcon ?? 0),
    showIconOptions: computed<SelectOption[]>(() => {
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
  statusOptions: ComputedRef<MultiSelectOption[]>;
  showIcon: ComputedRef<number>;
  showIconOptions: ComputedRef<SelectOption[]>;
  origin: ComputedRef<string>;
  changes: ComputedRef<any[]>;
  /** Changes filtered by view mode — hides unidentified-targeted changes in identified view. */
  visibleChanges: ComputedRef<any[]>;
  hasOwner: ComputedRef<boolean>;
};

type ActiveEffectConfigStoreDocumentActions<TDocument extends DnD35eActiveEffect> = DocumentSheetStoreDocumentActions<TDocument> & {
  addChange: (changeData: Dnd35eEffectChangeData) => Promise<boolean>;
  removeChange?: (index: number) => Promise<boolean>;
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