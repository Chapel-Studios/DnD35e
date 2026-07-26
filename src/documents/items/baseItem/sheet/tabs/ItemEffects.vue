<template>
  <section
    class="effects-tab"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="effects"
  >
    <EffectsListSection
      :rows="rows"
      empty-label="dnd35e.EFFECT.None"
      :additional-creatable-types="additionalCreatableTypes"
    />
  </section>
</template>

<script setup lang="ts">
  import type { TabStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, TabStoreSymbol } from '@documents/document/index.mjs';
  import type { EffectType } from '@effects/effectTypes.mjs';
  import type { ItemSheetStore } from '@items/baseItem/index.mjs';
  import { buildOwnedEffectRow, type EffectRowData } from '@vc/effects/EffectsListSection.vue';
  import EffectsListSection from '@vc/effects/EffectsListSection.vue';
  import { computed, inject } from 'vue';

  const { additionalCreatableTypes = [] } = defineProps<{
    /** Extra effect types added to the create-dialog's type picker for GM users only (see `createEffect`). */
    additionalCreatableTypes?: EffectType[];
  }>();

  const {
    documentGetters: {
      effects,
    },
    _storeUtils: {
      createLocalizedComputed: localize,
    },
  } = inject(DocumentSheetStoreSymbol) as ItemSheetStore;
  const { getIsTabOpen } = inject(TabStoreSymbol) as TabStore;

  const isActiveTab = getIsTabOpen('effects');

  /**
   * Items only ever own effects directly (no transferred/system rows - those are
   * actor-only concepts) - see `EffectsListSection.vue`'s `EffectRowData` doc comment.
   */
  const rows = computed<EffectRowData[]>(() => effects.value.map((effect) =>
    buildOwnedEffectRow(effect, (key) => localize(key).value)
  ));
</script>

<style scoped lang="scss">
  .effects-tab {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
