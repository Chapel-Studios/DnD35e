<template>
  <CategorizedListTable
    title="dnd35e.EFFECT.Effects"
    :column-count="1"
    :rows="rows"
    :empty-label="emptyLabel"
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
      <SystemEffectRow
        v-if="row.kind === 'system' || row.categoryId === CONDITION_CATEGORY_ID"
        :label="row.label!"
        :icon="row.icon"
        :changes="row.changes"
      />
      <component
        v-else
        :is="resolveEffectRowComponent(row.categoryId)"
        :effect="row.effect!"
        :can-edit="row.kind === 'owned' && isEditMode"
        :read-only="row.kind === 'transferred'"
      >
        <template v-if="row.kind === 'transferred'" #effect-badge>
          <span class="effect-source-badge">{{ row.sourceItemName }}</span>
        </template>
      </component>
    </template>
  </CategorizedListTable>
</template>

<script lang="ts">
  import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/index.mjs';
  import { CONDITION_CATEGORY_ID, resolveEffectCategory } from '@effects/baseActiveEffect/logic/index.mjs';
  import type { ActiveEffectDnd35e } from '@effects/index.mjs';
  import type { CategorizedRow } from '@vc/CategorizedListTable.vue';

  /**
   * Shared row shape for both the Item and Actor Effects tabs - keeping one type (and one
   * rendering table, see the template above) is what keeps the two sheets from drifting
   * apart feature-by-feature. `kind` discriminates three distinct row sources:
   * - `owned`   - a real ActiveEffect embedded directly on this document (fully editable)
   * - `transferred` - a real ActiveEffect owned by an equipped/carried item, transferring
   *   its changes onto the actor viewing it - shown read-only, edited from the source item
   * - `system`  - a live, no-backing-document change the document contributes to itself
   *   (e.g. Creature's encumbrance penalty) - display-only, nothing to edit at all
   *
   * Item sheets only ever produce `owned` rows; Actor sheets produce all three.
   */
  export type EffectRowData = CategorizedRow & {
    kind: 'owned' | 'transferred' | 'system';
    effect?: ActiveEffectDnd35e;
    sourceItemName?: string;
    label?: string;
    icon?: string;
    changes?: EffectChangeDataDnd35e[];
  };

  /**
   * Maps a real embedded ActiveEffect into an `owned` row - shared by both Item and Actor
   * sheet stores so the category-bucketing/condition-detection logic can't drift between
   * the two callers. `localizeCategoryLabel` is a plain function (rather than requiring a
   * particular store shape) so either caller can pass its own `createLocalizedComputed`.
   */
  export function buildOwnedEffectRow(
    effect: ActiveEffectDnd35e,
    localizeCategoryLabel: (key: string) => string
  ): EffectRowData {
    const { categoryId, categoryLabel } = resolveEffectCategory(effect);
    const isCondition = categoryId === CONDITION_CATEGORY_ID;
    return {
      id: effect.id,
      categoryId,
      categoryLabel: localizeCategoryLabel(categoryLabel),
      sortKey: effect.name.toLowerCase(),
      kind: 'owned',
      effect,
      label: isCondition ? effect.name : undefined,
      icon: isCondition ? (effect.img ?? undefined) : undefined,
      changes: isCondition ? effect.system.changes : undefined,
    };
  }
</script>

<script setup lang="ts">
  import type { RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import type { EffectDocumentActions } from '@documents/document/logic/index.mjs';
  import type { EffectType } from '@effects/effectTypes.mjs';
  import CategorizedListTable from '@vc/CategorizedListTable.vue';
  import { resolveEffectRowComponent } from '@vc/effects/effectRowRegistry.mjs';
  import SystemEffectRow from '@vc/effects/SystemEffectRow.vue';
  import type { ComputedRef } from 'vue';
  import { inject } from 'vue';

  /** Minimal shape any document sheet store (Item or Actor) must provide for this table. */
  interface EffectsListHostStore {
    documentActions: Pick<EffectDocumentActions, 'createEffect'>;
    _storeUtils: {
      createLocalizedComputed: (text: string) => ComputedRef<string>;
    };
  }

  const { rows, emptyLabel, additionalCreatableTypes = [] } = defineProps<{
    rows: EffectRowData[];
    emptyLabel: string;
    /** Extra effect types added to the create-dialog's type picker for GM users only (see `createEffect`). */
    additionalCreatableTypes?: EffectType[];
  }>();

  const {
    documentActions: {
      createEffect,
    },
    _storeUtils: {
      createLocalizedComputed: localize,
    },
  } = inject(DocumentSheetStoreSymbol) as EffectsListHostStore;
  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
</script>

<style scoped lang="scss">
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

  .effect-source-badge {
    font-size: 0.7rem;
    opacity: 0.6;
    font-style: italic;
  }
</style>
