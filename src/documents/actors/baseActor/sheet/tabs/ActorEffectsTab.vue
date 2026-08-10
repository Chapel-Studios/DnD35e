<template>
  <div class="actor-tab effects-tab" v-show="isActiveTab" data-group="primary" data-tab="effects">
    <section v-if="showConditionsSection" class="sheet-section condition-grid-section">
      <div class="section-header-row">
        <h2 class="section-header">
          <button
            type="button"
            class="collapse-toggle"
            :title="conditionsExpanded
              ? localize('dnd35e.EFFECT.CollapseConditions').value
              : localize('dnd35e.EFFECT.ExpandConditions').value"
            @click="conditionsExpanded = !conditionsExpanded"
          >
            <i class="fas" :class="conditionsExpanded ? 'fa-chevron-down' : 'fa-chevron-right'" />
          </button>
          {{ localize('dnd35e.EFFECT.Category.Condition') }}
        </h2>
        <FieldControls :field-path="CONDITIONS_FIELD_PATH" />
      </div>
      <div v-if="conditionsExpanded" class="condition-grid" :class="{ 'is-locked': !isConditionsEditable }">
        <label
          v-for="condition in visibleConditions"
          :key="condition.id"
          class="condition-row"
          :class="{ 'is-active': condition.active }"
        >
          <input
            type="checkbox"
            :checked="condition.active"
            :disabled="!isConditionsEditable"
            @change="toggleCondition(condition.id)"
          >
          <img :src="condition.icon" :alt="localize(condition.label).value" class="condition-icon">
          <span class="condition-name">{{ localize(condition.label) }}</span>
        </label>
      </div>
    </section>

    <EffectsListSection :rows="rows" empty-label="dnd35e.EFFECT.NoneOnActor" />
  </div>
</template>

<script setup lang="ts">
  import type { ActorDocumentStore } from '@actors/baseActor/sheet/ActorSheetStore.mjs';
  import type { TabStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, TabStoreSymbol } from '@documents/document/index.mjs';
  import { resolveEffectCategory } from '@effects/baseActiveEffect/logic/index.mjs';
  import type { EffectRowData } from '@vc/effects/EffectsListSection.vue';
  import EffectsListSection, { buildOwnedEffectRow } from '@vc/effects/EffectsListSection.vue';
  import FieldControls from '@vc/fields/formGroups/FieldControls.vue';
  import { computed, inject, ref } from 'vue';

  // Pseudo field-path used purely for GM visibility/editability override storage on the
  // condition-grid section - conditions are derived from `actor.statuses`, not a schema
  // field, so this never resolves via `getSchemaField` (same convention as the inventory
  // section's `INVENTORY_FIELD_PATH`).
  const CONDITIONS_FIELD_PATH = 'system.conditions';

  const {
    documentGetters: {
      effects,
      conditions,
      transferredEffects,
      selfContributedEffects,
      getIsFieldVisible,
      getIsFieldEditable,
    },
    documentActions: {
      toggleCondition,
    },
    _storeUtils: {
      createLocalizedComputed: localize,
    },
  } = inject(DocumentSheetStoreSymbol) as ActorDocumentStore;
  const { getIsTabOpen } = inject(TabStoreSymbol) as TabStore;

  const isActiveTab = getIsTabOpen('effects');

  const conditionsExpanded = ref(true);

  // Section-level only (no per-condition overrides). `forceEdit: true` since toggling a
  // condition is a normal play-mode action, not authoring-only (same rationale as the
  // inventory carry/equip toggles).
  const isConditionsVisible = getIsFieldVisible(CONDITIONS_FIELD_PATH);
  const isConditionsEditable = getIsFieldEditable(CONDITIONS_FIELD_PATH, undefined, true);

  // When visibility is restricted for the current viewer, don't hide the section outright -
  // still surface any conditions that are actually active (so a player can see what's
  // affecting them) while hiding the rest of the (inactive) grid.
  const visibleConditions = computed(() => isConditionsVisible.value
    ? conditions.value
    : conditions.value.filter((condition) => condition.active));

  const showConditionsSection = computed(() => visibleConditions.value.length > 0);

  // See `EffectsListSection.vue`'s `EffectRowData` doc comment - the actor tab is the one
  // caller that produces all three row kinds (owned/transferred/system); `buildOwnedEffectRow`
  // is shared with `ItemEffects.vue` so the two sheets' owned-row mapping can't drift apart.
  const rows = computed<EffectRowData[]>(() => {
    const ownedRows: EffectRowData[] = effects.value.map((effect) =>
      buildOwnedEffectRow(effect, (key) => localize(key).value)
    );

    const transferredRows: EffectRowData[] = transferredEffects.value.map(({ effect, sourceItemName }) => {
      const { categoryId, categoryLabel } = resolveEffectCategory(effect);
      return {
        id: `transferred-${effect.id}`,
        categoryId,
        categoryLabel: localize(categoryLabel).value,
        sortKey: effect.name.toLowerCase(),
        kind: 'transferred',
        effect,
        sourceItemName,
      };
    });

    const systemRows: EffectRowData[] = selfContributedEffects.value.map((row) => ({
      id: `system-self-contributed-${row.label}`,
      categoryId: 'system',
      categoryLabel: localize('dnd35e.EFFECT.Category.System').value,
      sortKey: row.label.toLowerCase(),
      kind: 'system',
      label: row.label,
      icon: row.icon,
      changes: row.changes,
    }));

    return [...ownedRows, ...transferredRows, ...systemRows];
  });
</script>

<style scoped lang="scss">
  .effects-tab {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .condition-grid-section {
    .section-header {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    :deep(.field-controls) {
      font-size: 1rem;
    }
  }

  .section-header-row {
    display: flex;
    align-items: center;
    justify-content: start;
    gap: 0.5rem;
    margin: 0 0 0.5rem;
  }

  .collapse-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }
  }

  .condition-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.25rem 0.75rem;

    &.is-locked {
      filter: grayscale(0.35);
      opacity: 0.7;
    }
  }

  .condition-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    cursor: pointer;
    padding: 0.125rem 0;

    &.is-active {
      .condition-name {
        font-weight: bold;
      }
    }
  }

  .condition-icon {
    width: 20px;
    height: 20px;
    border: none;
    object-fit: contain;
  }

  .condition-name {
    font-size: 0.875rem;
  }
</style>
