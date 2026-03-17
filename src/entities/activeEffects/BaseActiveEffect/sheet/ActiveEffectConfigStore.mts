import type { DocumentSheetStore, DocumentSheetStoreDocumentActions, DocumentSheetStoreDocumentGetters } from '@ec/CoreMixin/index.mjs';
import { useDocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { DnD35eActiveEffect, Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';

import { getDefaultActiveEffectTabs } from './tabs/index.mjs';

const useActiveEffectConfigStore = <TDocument extends DnD35eActiveEffect>(
  context: VueApplicationContext<TDocument>
) => {
  const baseStore = useDocumentSheetStore(context, {
    ...getDefaultActiveEffectTabs(),
    defaultActiveTab: 'details',
  });

  const document = baseStore._storeUtils.document as Ref<TDocument>;

  // Effect-specific document getters
  const documentGetters = {
    ...baseStore.documentGetters,
    // Duration properties
    durationValue: computed(() => document.value.duration?.value ?? null),
    durationUnits: computed(() => document.value.duration?.units ?? 'none'),
    // Effect-specific
    isDisabled: computed(() => document.value.disabled ?? false),
    tint: computed(() => document.value.tint ?? null),
    transfer: computed(() => document.value.transfer ?? false),
    statuses: computed(() => [...(document.value.statuses ?? [])]),
    showIcon: computed(() => document.value.showIcon ?? 0),
    origin: computed(() => document.value.origin ?? ''),
    changes: computed(() => document.value.system?.changes ?? []),
  };

  const documentActions = {
    ...baseStore.documentActions,
    addChange: async (changeData: Dnd35eEffectChangeData) => {
      if (!('changes' in document.value.system)) return false;
      const changes = document.value.system.changes || [];
      const updatedChanges = [...changes, changeData];
      return await baseStore.documentActions.updateDocument(
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
      return await baseStore.documentActions.updateDocument(
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

type ActiveEffectConfigStore<TDocument extends DnD35eActiveEffect = DnD35eActiveEffect> = DocumentSheetStore<TDocument> & {
  documentGetters: DocumentSheetStoreDocumentGetters & {
    durationValue: ComputedRef<number | null>;
    durationUnits: ComputedRef<string>;
    isDisabled: ComputedRef<boolean>;
    tint: ComputedRef<string>;
    transfer: ComputedRef<boolean>;
    statuses: ComputedRef<string[]>;
    showIcon: ComputedRef<number>;
    origin: ComputedRef<string>;
    changes: ComputedRef<any[]>;
  };
  documentActions: DocumentSheetStoreDocumentActions<TDocument> & {
    addChange: (changeData: Dnd35eEffectChangeData) => Promise<TDocument | false>;
    removeChange?: (index: number) => Promise<TDocument | false>;
  };
};

export { useActiveEffectConfigStore };

export type {
  ActiveEffectConfigStore,
};