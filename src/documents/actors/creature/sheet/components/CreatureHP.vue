<template>
  <FormGroupSection
    label="dnd35e.CREATURE.FIELDS.hp.label"
    field-path="system.hp"
    :default-visibility="ownerPlusVisibility"
    :default-editability="gmOnlyEditability"
    class="actor-hp-section"
  >
    <div class="hp-bar-container">
      <MeasureBar
        :segments="hpSegments"
        :max="totalMax"
        :trailing-label="totalMax"
        bar-class="hp-bar"
      />
    </div>
    <div class="hp-controls">
      <div
        class="hp-stats"
        :class="{ open: !isAdjustmentDrawerOpen }"
      >
        <NumberFormGroup
          field-path="system.hp.temp"
          :default-visibility="ownerPlusVisibility"
          :default-editability="gmOnlyEditability"
          class="hp-temp"
          force-edit
        />
        <NumberFormGroup
          field-path="system.hp.current"
          :default-visibility="ownerPlusVisibility"
          :default-editability="gmOnlyEditability"
          class="hp-current"
          force-edit
        />
        <NumberFormGroup
          field-path="system.hp.max"
          :default-visibility="ownerPlusVisibility"
          :default-editability="gmOnlyEditability"
          class="hp-max"
          read-only
        />
        <NumberFormGroup
          field-path="system.hp.nonlethal"
          :default-visibility="ownerPlusVisibility"
          :default-editability="gmOnlyEditability"
          class="hp-nonlethal"
          force-edit
        />
      </div>
      <div 
        class="adjustment-drawer"
        :class="{ open: isAdjustmentDrawerOpen }"
      >
        <label>{{ localize('dnd35e.CREATURE.FIELDS.hp.adjustment.type.label') }}</label>
        <MultiOptionToggle
          :options="HP_ADJUSTMENT_TYPE_OPTIONS"
          :value="adjustmentType"
          @update="onAdjustmentTypeChange"
        />
        <label>{{ localize('dnd35e.CREATURE.FIELDS.hp.adjustment.amount.label') }}</label>
        <input
          :min="minAdjustment"
          type="number"
          v-model.number="adjustmentAmount"
        />
        <button
          type="button"
          class="apply-btn field-control-btn"
          :title="localize('dnd35e.CREATURE.FIELDS.hp.adjustment.apply.tooltip')"
          @click="applyAdjustment"
        >
          <i class="fas fa-check" /> {{ localize('dnd35e.CREATURE.FIELDS.hp.adjustment.apply.label') }}
        </button>
      </div>
    </div>
    <template #controls>
      <button
        type="button"
        class="rest-btn field-control-btn"
        :title="localize('dnd35e.ACTOR.action.rest')"
      >
        <i class="fas fa-campground" />
      </button>
      <button
        type="button"
        class="hp-adjust-btn field-control-btn"
        :title="localize('dnd35e.CREATURE.FIELDS.hp.adjustment.label')"
        @click="toggleAdjustmentDrawer"
      >
        <i
          class="fa-duotone fa-solid fa-arrows-spin"
          :class="{ 'fa-rotate-90': isAdjustmentDrawerOpen}"
        ></i>
      </button>
    </template>
  </FormGroupSection>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { FormGroupSection, NumberFormGroup } from '@vc/fields/index.mjs';
  import { gmOnlyEditability, ownerPlusVisibility } from '@vc/fields/index.mjs';
  import MultiOptionToggle from '@vc/fields/MultiOptionToggle.vue';
  import MeasureBar from '@vc/MeasureBar.vue';
  import { computed, inject, ref } from 'vue';

  import type { CreatureDocumentStore } from '../CreatureStore.mjs';
  import { HP_ADJUSTMENT_TYPE, HP_ADJUSTMENT_TYPE_OPTIONS, type HpAdjustmentType } from './constants.mjs';

  const localize = (key: string) => game.i18n.localize(key);
  const { 
    documentGetters: { 
      currentHp,
      maxHp,
      tempHp,
      nonlethalDamage,
    },
    documentActions: {
      adjustHp,
    },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;


  // Computed bar widths and values
  const totalMax = computed(() => (maxHp.value ?? 0) + (tempHp.value ?? 0));

  const hpSegments = computed(() => [
    {
      key: 'nonlethal',
      value: nonlethalDamage.value ?? 0,
      colorClass: 'color-orange',
      tooltip: `Nonlethal: ${nonlethalDamage.value ?? 0}`,
      label: (nonlethalDamage.value ?? 0) > 0 ? nonlethalDamage.value : undefined,
    },
    {
      key: 'current',
      value: Math.max(0, (currentHp.value ?? 0) - (nonlethalDamage.value ?? 0)),
      colorClass: 'color-green',
      tooltip: `Current: ${currentHp.value ?? 0} / ${maxHp.value ?? 0}`,
      label: (currentHp.value ?? 0) > 0 ? currentHp.value : undefined,
    },
    {
      key: 'temp',
      value: tempHp.value ?? 0,
      colorClass: 'color-blue',
      tooltip: `Temp: ${tempHp.value ?? 0}`,
      label: (tempHp.value ?? 0) > 0 ? tempHp.value : undefined,
    },
  ]);

  // Adjustment drawer state
  const adjustmentType = ref<HpAdjustmentType>(HP_ADJUSTMENT_TYPE.DAMAGE_ADJUSTMENT);
  const isAdjustmentDrawerOpen = ref(false);
  const adjustmentAmount = ref(0);
  const minAdjustment = computed(() => {
    if (adjustmentType.value === HP_ADJUSTMENT_TYPE.TEMPORARY_ADJUSTMENT) {
      return 0;
    }
    return undefined;
  });

  const toggleAdjustmentDrawer = () => {
    isAdjustmentDrawerOpen.value = !isAdjustmentDrawerOpen.value;
  };
  const onAdjustmentTypeChange = (type: HpAdjustmentType) => {
    adjustmentType.value = type;
  };

  const applyAdjustment = async () => {
    const updateAmount = adjustmentAmount.value;
    
    await adjustHp(updateAmount, adjustmentType.value);

    adjustmentAmount.value = 0;
  };

</script>

<style lang="scss" scoped>
  .actor-hp-section {
    position: relative;
    padding: 0.5rem 0.5rem 0.5rem;
    margin: 0.75rem 0.25rem 0 0;

    .hp-controls {
      position: relative;
      overflow: hidden;
      height: 10rem;
      width: 20rem;

      .adjustment-drawer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        padding: 0.5rem;
        display: grid;
        grid-template-rows: auto;
        gap: 0.5rem;
        transform: translateY(-110%);
        transition: transform 0.3s ease;

        &.open {
          transform: translateY(0);
        }
      }
    }

    .hp-stats {
      display: grid;
      grid-template-areas: "temp current max nonlethal";
      grid-template-columns: min-content min-content min-content min-content;
      gap: 0.25rem;
      position: absolute;
      width: 100%;
      height:   100%;
      transform: translateY(110%);
      transition: transform 0.3s ease;

      &.open {
        transform: translateY(0);
      }
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
      margin: 0;

      .hp-bar-container {
        grid-column: 1 / -1;
        margin-bottom: 0.5rem;
      }

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
        border: 1px solid var(--color-tabs-border);

        &.hp-max {
          border-left: none;
        }

        &.hp-temp {
          border-top: none;
        }

        &.hp-nonlethal {
          border-top: none;
          border-left: none;
        }


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

  .hp-bar-container {
    justify-self: stretch;
    margin-bottom: 0.5rem;
  }
</style>