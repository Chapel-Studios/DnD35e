<template>
  <FormGroupSection
    class="movement-section"
    label="dnd35e.ACTOR.section.Speed"
    field-path="system.speed"
    :default-visibility="everyoneVisibility"
    :default-editability="gmOnlyEditability"
  >
    <div class="speed-cards">
      <div
        v-for="mode in allModes"
        :key="mode.key"
        class="speed-card"
      >
        <NumberFormGroup
          :label="mode.label"
          :field-path="mode.fieldPath"
          :value="mode.value"
          class="speed-form-group"
        />
      </div>
      <div v-if="hasFlySpeed" class="speed-card fm">
        <SelectFormGroup
          field-path="system.speed.flyManeuverability"
          label="dnd35e.ACTOR.FIELDS.speed.flyManeuverability.label"
          :options="flyManeuverabilityOptions"
          :value="flyManeuverability"
          :disabled="!hasFlySpeed"
          class="speed-form-group" 
        />
      </div>
    </div>
  </FormGroupSection>
  <section class="sheet-section movement-section">
    <h2 class="section-header">{{ localize('dnd35e.ACTOR.section.Speed') }}</h2>
    <div class="speed-cards">
      <div class="speed-card">
        <div class="speed-value">{{ landSpeed }}&thinsp;ft</div>
        <div class="speed-label">{{ localize('dnd35e.ACTOR.speed.land') }}</div>
      </div>
      <div v-for="mode in allModes" :key="mode.key" class="speed-card stub">
        <div class="speed-value placeholder">—</div>
        <div class="speed-label">{{ localize(mode.label) }}</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { ActorDocumentStore } from '@actors/baseActor/sheet/ActorSheetStore.mjs';
  import { FLY_MANEUVERABILITY, FLY_MANEUVERABILITY_OPTIONS, type FlyManeuverability,SPEED_KEYS_LOCALIZED, SPEED_TYPE } from '@constants/speeds.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { everyoneVisibility, FormGroupSection, gmOnlyEditability, NumberFormGroup, SelectFormGroup, type SelectOption } from '@vc/fields/index.mjs';
  import { computed, type ComputedRef,inject } from 'vue';

  const localize = (key: string) => game.i18n.localize(key);

  const {
    documentGetters: { landSpeedTotal, getViewAwareFieldValue },
    _storeUtils: {  },
  } = inject(DocumentSheetStoreSymbol) as ActorDocumentStore;

  const landSpeed = landSpeedTotal;

  const allModes = computed(() => Object.entries(SPEED_KEYS_LOCALIZED)
    .map(([key, label]) => ({
      key,
      label,
      fieldPath: `system.speed.${key}.base`,
      value: getViewAwareFieldValue<number>(`system.speed.${key}.total`),
    })));

  const hasFlySpeed = computed(() => allModes.value.some(mode => mode.key === SPEED_TYPE.FLY && mode.value > 0));
  const flyManeuverabilityOptions: ComputedRef<SelectOption<FlyManeuverability | '-'>[]> = computed(() => 
    hasFlySpeed.value ? FLY_MANEUVERABILITY_OPTIONS : [{ value: '-', label: '-' }]);

  const flyManeuverability = computed(() => hasFlySpeed.value
    ? getViewAwareFieldValue<FlyManeuverability | null>('system.speed.flyManeuverability')
      ?? FLY_MANEUVERABILITY.CLUMSY // default to clumsy if fly speed exists but maneuverability is not set
    : '-');
</script>

<style lang="scss" scoped>
  .movement-section {
    padding: 0.25rem;

    .speed-cards {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      grid-auto-rows: min-content;
      gap: 0.25rem 0.5rem;

      .speed-card {
        display: grid;
        grid-template-rows: min-content 1fr;
        grid-template-areas:
          "value"
          "label";
        border: 1px solid var(--color-border, #ccc);
        border-radius: 4px;
        padding: 0.3rem 0.5rem;
        min-width: 3.5rem;
        text-align: center;
        gap: 0.3rem;

        &.fm {
          grid-column: span 5;
          gap: 0;
          grid-template-areas: unset;

          .speed-form-group {
            display: grid;
            grid-auto-flow: column;
            grid-template-columns: max-content max-content;
            justify-content: center;
            gap: 2rem;
            padding: 0rem 0.5rem;

            :deep(.form-group-label) {
              grid-area: unset;
              grid-auto-flow: column;
            }
          }
        }

        .speed-form-group {
          :deep(.form-group-label) {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-top: 0.1rem;
            grid-area: label;
            display: grid;
            gap: 0;
          }

          :deep(input) {
            font-size: 1rem;
            font-weight: bold;
            line-height: 1;
            grid-area: value;
            text-align: center;
            width: 75%;
            justify-self: center;

            &.placeholder {
              color: var(--color-text-dark-secondary, #888);
            }
          }
        }
      }
    }
  }

  .speed-value {
    font-size: 1rem;
    font-weight: bold;
    line-height: 1;

    &.placeholder {
      color: var(--color-text-dark-secondary, #888);
    }
  }

  .speed-label {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-dark-secondary, #666);
    margin-top: 0.1rem;
  }
</style>
