<template>
  <FormGroupSection
    label="dnd35e.CREATURE.FIELDS.hp.label"
    field-path="system.hp"
    :default-visibility="ownerPlusVisibility"
    :default-editability="gmOnlyEditability"
    class="actor-hp-section"
  >
    <div class="hp-stats">
      <div class="hp-bar-container">
        <div class="hp-bar-track">
          <!-- Nonlethal damage (from left) -->
          <div 
            v-if="nonlethalDamage > 0"
            class="hp-bar-segment hp-nonlethal-segment"
            :style="{ width: nonlethalPercent + '%' }"
            :title="`Nonlethal: ${nonlethalDamage}`"
          >
            <span class="hp-bar-text">{{ nonlethalDamage }}</span>
          </div>
          <!-- Current HP (extends from nonlethal, implied underneath) -->
          <div 
            class="hp-bar-segment hp-current-segment"
            :style="{ left: nonlethalPercent + '%', width: currentHpPercent + '%' }"
            :title="`Current: ${currentHp} / ${maxHp}`"
          >
            <span v-if="currentHp > 0" class="hp-bar-text">{{ currentHp }}</span>
          </div>
          <!-- Temp HP (extends from current) -->
          <div 
            v-if="tempHp > 0"
            class="hp-bar-segment hp-temp-segment"
            :style="{ left: (nonlethalPercent + currentHpPercent) + '%', width: tempHpPercent + '%' }"
            :title="`Temp: ${tempHp}`"
          >
            <span class="hp-bar-text">{{ tempHp }}</span>
          </div>
          
          <span class="hp-bar-text total">{{ totalMax }}</span>
        </div>
      </div>
      <NumberFormGroup
        :value="tempHp"
        :on-update="tempHpUpdater"
        field-path="system.hp.temp"
        :default-visibility="ownerPlusVisibility"
        :default-editability="gmOnlyEditability"
        class="hp-temp"
        direct-update
        force-edit
      />
      <NumberFormGroup
        :value="currentHp"
        :on-update="currentHpUpdater"
        field-path="system.hp.current"
        :default-visibility="ownerPlusVisibility"
        :default-editability="gmOnlyEditability"
        class="hp-current"
        direct-update
        force-edit
      />
      <NumberFormGroup
        :value="maxHp"
        field-path="system.hp.max"
        :default-visibility="ownerPlusVisibility"
        :default-editability="gmOnlyEditability"
        class="hp-max"
        read-only
      />
      <NumberFormGroup
        :value="nonlethalDamage"
        :on-update="nonlethalDamageUpdater"
        field-path="system.hp.nonlethal"
        :default-visibility="ownerPlusVisibility"
        :default-editability="gmOnlyEditability"
        class="hp-nonlethal"
        direct-update
        force-edit
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
  import { computed, inject } from 'vue';

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
  const nonlethalDamageUpdater = getViewAwareFieldUpdater('system.hp.nonlethal');

  // Computed bar widths and values
  const totalMax = computed(() => (maxHp.value ?? 0) + (tempHp.value ?? 0));
  
  const nonlethalPercent = computed(() => {
    if (totalMax.value === 0) return 0;
    return ((nonlethalDamage.value ?? 0) / totalMax.value) * 100;
  });
  
  const currentHpPercent = computed(() => {
    if (totalMax.value === 0) return 0;
    return (((currentHp.value ?? 0) / totalMax.value) * 100) - nonlethalPercent.value;
  });
  
  const tempHpPercent = computed(() => {
    if (totalMax.value === 0) return 0;
    return ((tempHp.value ?? 0) / totalMax.value) * 100;
  });
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
      margin: 0;

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
    grid-column: 1 / -1;
    margin-bottom: 0.5rem;
  }

  .hp-bar-track {
    display: block;
    position: relative;
    width: 100%;
    height: 1.5rem;
    background: var(--color-bg-option, rgba(0, 0, 0, 0.08));
    border: 1px solid var(--color-border-light-2, #ccc);
    border-radius: 4px;
    overflow: hidden;
  }

  .hp-bar-segment {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: width 0.3s ease;
    color: rgba(255, 255, 255, 0.6);

    &:hover {
      color: rgba(255, 255, 255, 1);
      filter: brightness(1.1);
    }
  }

  .hp-current-segment {
    background: #4CAF50;
    z-index: 2;
  }

  .hp-nonlethal-segment {
    background: #FF9800;
    z-index: 1;
  }

  .hp-temp-segment {
    background: #2196F3;
    z-index: 2;
  }

  .hp-bar-text {
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
    padding: 0 0.25rem;

    &.total {
      position: absolute;
      right: 0.25rem;
      transform: translateY(-50%);
      top: 50%;
    }
  }

  .creature-sidebar {
    .actor-hp-section {
      .hp-bar-container {
        grid-column: 1 / -1;
        margin-bottom: 0.5rem;
      }

      .hp-stats {
        // 4 columns total: label/input pair per side, two sides
        grid-template-columns: 1fr min-content 1fr min-content;
        grid-template-areas:
          "bar       bar       bar       bar"
          "current   current   max       max"
          "temp      temp      nonlethal nonlethal";
        gap: 0;
      }
    }
  }
</style>