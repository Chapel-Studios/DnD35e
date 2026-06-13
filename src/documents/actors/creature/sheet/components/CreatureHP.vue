<template>
  <FormGroupSection
    label="dnd35e.CREATURE.FIELDS.hp.label"
    field-path="system.hp"
    :default-visibility="ownerPlusVisibility"
    :default-editability="gmOnlyEditability"
    class="actor-hp-section"
  >
    <div class="hp-stats">
      <NumberFormGroup
        :value="tempHp"
        :on-update="tempHpUpdater"
        field-path="system.hp.temp"
        :default-visibility="ownerPlusVisibility"
        :default-editability="gmOnlyEditability"
        class="hp-temp"
        direct-update
      />
      <NumberFormGroup
        :value="currentHp"
        :on-update="currentHpUpdater"
        field-path="system.hp.current"
        :default-visibility="ownerPlusVisibility"
        :default-editability="gmOnlyEditability"
        class="hp-current"
        direct-update
      />
      <NumberFormGroup
        :value="maxHp"
        :on-update="maxHpUpdater"
        field-path="system.hp.max"
        :default-visibility="ownerPlusVisibility"
        :default-editability="gmOnlyEditability"
        class="hp-max"
      />
      <NumberFormGroup
        :value="nonlethalDamage"
        :on-update="nonlethalDamageUpdater"
        field-path="system.hp.nonlethal"
        :default-visibility="ownerPlusVisibility"
        :default-editability="gmOnlyEditability"
        class="hp-nonlethal"
        direct-update
      />
    </div>
    <template #controls>
      <button
        type="button"
        class="rest-btn field-control-btn"
        :title="localize('dnd35e.ACTOR.action.rest')"
      >
        <i class="fas fa-campground" />
      </button>        
    </template>
  </FormGroupSection>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { FormGroupSection, NumberFormGroup } from '@vc/fields/index.mjs';
  import { gmOnlyEditability, ownerPlusVisibility } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import type { CreatureDocumentStore } from '../CreatureStore.mjs';

  const localize = (key: string) => game.i18n.localize(key);
  const { 
    documentGetters: { 
      currentHp,
      maxHp,
      tempHp,
      nonlethalDamage,
    },
    documentActions: {
      getDirectFieldUpdater,
      getViewAwareFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  const currentHpUpdater = getDirectFieldUpdater('system.hp.current');
  const tempHpUpdater = getDirectFieldUpdater('system.hp.temp');
  const maxHpUpdater = getDirectFieldUpdater('system.hp.max');
  const nonlethalDamageUpdater = getViewAwareFieldUpdater('system.hp.nonlethal');
</script>

<style lang="scss" scoped>
  .actor-hp-section {
    position: relative;
    padding: 0.5rem 0.5rem 0.5rem;
    margin: 0.75rem 0.25rem 0 0;

    .hp-stats {
      display: grid;
      grid-template-areas: "temp current max nonlethal";
      grid-template-columns: min-content min-content min-content min-content;
      gap: 0.25rem;
    }

    .hp-temp      { grid-area: temp; }
    .hp-current   { grid-area: current; }
    .hp-max       { grid-area: max; }
    .hp-nonlethal { grid-area: nonlethal; }

    :deep(.form-group) {
      display: grid;
      grid-auto-flow: column;
      grid-gap: 0.25rem;
      padding: 0;

      .form-group-label {
        display: grid;
      }

      input {
        min-width: 2.75rem;
        text-align: center;
        font-size: 1rem;
      }
    }

    .hp-display {
      display: inline-flex;
      align-items: center;

      :deep(.effect-tooltip) {
        margin-left: 0.1rem;
      }
    }
  }

  .creature-sidebar {
    .actor-hp-section {
      .hp-stats {
        // 4 columns total: label/input pair per side, two sides
        grid-template-columns: 1fr min-content 1fr min-content;
        grid-template-areas:
          "current current max       max"
          "temp    temp    nonlethal nonlethal";
        gap: 0;
      }

      :deep(.form-group) {
        // Subgrid lets every form-group share the parent grid's column tracks,
        // so labels and inputs align across all 4 cells.
        grid-template-columns: subgrid;
        grid-column: span 2;
        align-items: center;
        text-align: center;
        padding: 0.5rem;
        border: 1px solid var(--color-border-light-2, #ccc);


        .form-group-label {
          display: grid;
          grid-template-columns: min-content;
          min-width: 0;
          justify-self: center;
        }

        .form-group-label label {
          width: min-content;
          overflow-wrap: normal;
          word-break: normal;
          hyphens: manual;
        }
      }

      :deep(.controls) {
        justify-content: space-inherit;
      }
    }
  }

  .rest-btn {
    font-size: 0.9rem;
    flex-shrink: 0;
  }
</style>