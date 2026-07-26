<template>
  <section
    class="effects-tab"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="effects"
  >
    <CategorizedListTable
      title="dnd35e.EFFECT.Effects"
      :column-count="1"
      :rows="rows"
      empty-label="dnd35e.EFFECT.None"
      empty-icon="fas fa-sparkles"
    >
      <template v-if="isEditMode" #controls>
        <slot name="header-actions" />
        <button type="button" class="create-effect-btn" @click="createEffect(additionalCreatableTypes)">
          <i class="fas fa-plus" />
          {{ localize('dnd35e.EFFECT.Create') }}
        </button>
      </template>

      <template #row="{ row }">
        <component :is="resolveEffectRowComponent(row.categoryId)" :effect="row.effect" :can-edit="isEditMode" />
      </template>
    </CategorizedListTable>
  </section>
</template>

<script setup lang="ts">
  import type { RenderModeStore, TabStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol, TabStoreSymbol } from '@documents/document/index.mjs';
  import type { ActiveEffectDnd35e } from '@effects/baseActiveEffect/index.mjs';
  import { resolveEffectCategory } from '@effects/baseActiveEffect/logic/index.mjs';
  import type { EffectType } from '@effects/effectTypes.mjs';
  import type { ItemSheetStore } from '@items/baseItem/index.mjs';
  import type { CategorizedRow } from '@vc/CategorizedListTable.vue';
  import CategorizedListTable from '@vc/CategorizedListTable.vue';
  import { resolveEffectRowComponent } from '@vc/effects/effectRowRegistry.mjs';
  import { computed, inject } from 'vue';

  const { additionalCreatableTypes = [] } = defineProps<{
    /** Extra effect types added to the create-dialog's type picker for GM users only (see `createEffect`). */
    additionalCreatableTypes?: EffectType[];
  }>();

  const {
    documentGetters: {
      effects,
    },
    documentActions: {
      createEffect,
    },
    _storeUtils: {
      createLocalizedComputed: localize,
    },
  } = inject(DocumentSheetStoreSymbol) as ItemSheetStore;
  const { getIsTabOpen } = inject(TabStoreSymbol) as TabStore;
  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;

  const isActiveTab = getIsTabOpen('effects');

  type EffectRowData = CategorizedRow & { effect: ActiveEffectDnd35e };

  /**
   * `categoryId` is the effect's document `type` (or the synthetic `condition`
   * pseudo-type for status-driven effects) - `CategorizedListTable` groups/tabs by
   * this automatically and sorts categories alphabetically, so new effect types
   * don't require updating this file. Active vs. disabled is a per-row state
   * (see `EffectRow`'s toggle), not a bucket. `effects` already excludes GM-only
   * types (e.g. `secret`) from non-GM users entirely (see `updateGmOnlyEffectTypes`),
   * so a GM-only category tab never appears for players.
   */
  const rows = computed<EffectRowData[]>(() => effects.value.map((effect) => {
    const { categoryId, categoryLabel } = resolveEffectCategory(effect);
    return {
      id: effect.id,
      categoryId,
      categoryLabel: localize(categoryLabel).value,
      sortKey: effect.name.toLowerCase(),
      effect,
    };
  }));
</script>

<style scoped lang="scss">
  .effects-tab {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .create-effect-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
</style>
