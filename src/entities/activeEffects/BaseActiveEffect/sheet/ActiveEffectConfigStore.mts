import type { DocumentSheetStore, SheetTab } from '@ec/CoreMixin/index.mjs';
import { useDocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { DnD35eActiveEffect, Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';

import { getDefaultActiveEffectTabs } from './tabs/index.mjs';

const useActiveEffectConfigStore = <TDocument extends DnD35eActiveEffect>(
  context: VueApplicationContext<TDocument>,
  options: {
    additionalTabs?: SheetTab[];
  } = {},
) => {
  // Get base store functionality with effect-specific default tabs
  const defaultTabs = [
    ...getDefaultActiveEffectTabs(),
    ...(options.additionalTabs ?? []),
  ];

  const baseStore = useDocumentSheetStore(context, {
    defaultTabs,
    defaultActiveTab: 'details',
  });

  const document = baseStore._document as Ref<TDocument>;

  // Effect-specific document getters
  const documentGetters = {
    ...baseStore.documentGetters,
    // Duration properties
    durationValue: computed(() => document.value.duration?.value ?? null),
    durationUnits: computed(() => document.value.duration?.units ?? 'none'),
    // Effect-specific
    isDisabled: computed(() => document.value.disabled ?? false),
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
        },
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
        },
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
  documentGetters: DocumentSheetStore<TDocument>['documentGetters'] & {
    durationValue: ComputedRef<number | null>;
    durationUnits: ComputedRef<string>;
    isDisabled: ComputedRef<boolean>;
    changes: ComputedRef<any[]>;
  };
  documentActions: DocumentSheetStore<TDocument>['documentActions'] & {
    addChange: (changeData: Dnd35eEffectChangeData) => Promise<TDocument | false>;
    removeChange?: (index: number) => Promise<TDocument | false>;
  };
};

export { useActiveEffectConfigStore };

export type {
  ActiveEffectConfigStore,
};