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
        <DistanceFormGroup
          :label="mode.label"
          :field-path="mode.fieldPath"
          class="speed-form-group contents"
        >
          <template v-if="mode.showAltReadOnly" #readonly>
            <span v-if="mode.hasNoValue" class="placeholder">—</span>
            <div v-else>
              <span>{{ mode.value }} {{ distanceDisplayShortLabel }} </span> 
              <span> ({{ flyManeuverabilityLabel }})</span>
            </div>
          </template>
        </DistanceFormGroup>
      </div>
      <div v-if="showFlyManueverabilityPicker" class="speed-card fm">
        <SelectFormGroup
          field-path="system.speed.flyManeuverability"
          :options="flyManeuverabilityOptions"
          :value="flyManeuverability"
          :disabled="!showFlyManueverabilityPicker"
          class="speed-form-group" 
        />
      </div>
    </div>
  </FormGroupSection>
</template>

<script setup lang="ts">
  import type { ActorDocumentStore } from '@actors/baseActor/sheet/ActorSheetStore.mjs';
  import type { FlyManeuverability } from '@constants/speeds.mjs';
  import {
    FLY_MANEUVERABILITY,
    FLY_MANEUVERABILITY_OPTIONS,
    SPEED_KEYS_LOCALIZED,
    SPEED_TYPE,
  } from '@constants/speeds.mjs';
  import type { RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import type { SettingsStore } from '@settings/index.mjs';
  import { SettingsStoreSymbol } from '@settings/index.mjs';
  import type { SelectOption } from '@vc/fields/index.mjs';
  import {
    DistanceFormGroup,
    everyoneVisibility,
    FormGroupSection,
    gmOnlyEditability,
    SelectFormGroup,
  } from '@vc/fields/index.mjs';
  import { computed, type ComputedRef,inject } from 'vue';

  const {
    documentGetters: { getViewAwareFieldValue },
    _storeUtils: {  },
  } = inject(DocumentSheetStoreSymbol) as ActorDocumentStore;

  const { isEditMode } =inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    measurement: {
      distanceDisplayShortLabel,
      convertToLocalizedDistance,
    },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const allModes = computed(() => Object.entries(SPEED_KEYS_LOCALIZED)
    .map(([key, label]) => {
      const value = convertToLocalizedDistance(getViewAwareFieldValue<number>(`system.speed.${key}`) ?? 0);
      const isFlySpeed = key === SPEED_TYPE.FLY;
      const hasNoValue = value === 0;
      
      return {
        key,
        label,
        fieldPath: `system.speed.${key}`,
        value,
        isFlySpeed,
        hasNoValue,
        showAltReadOnly: hasNoValue || isFlySpeed, // show the alt read-only display when the speed is 0 (doesn't exist), or always for fly (to show maneuverability alongside the value)
      };
    }));

  const showFlyManueverabilityPicker = computed(() => {
    const hasFlySpeed = allModes.value.some(mode => mode.key === SPEED_TYPE.FLY && mode.value > 0);
    return hasFlySpeed && isEditMode.value; // only show when fly speed exists and in edit mode
  });
  const flyManeuverabilityOptions: ComputedRef<SelectOption<FlyManeuverability | '-'>[]> = computed(() => 
    showFlyManueverabilityPicker.value ? FLY_MANEUVERABILITY_OPTIONS : [{ value: '-', label: '-' }]);

  const flyManeuverability = computed(() => getViewAwareFieldValue<FlyManeuverability | null>('system.speed.flyManeuverability')
    ?? FLY_MANEUVERABILITY.CLUMSY); // default to clumsy whenever maneuverability isn't set
  const flyManeuverabilityLabel = computed(() => {
    return game.i18n.localize(FLY_MANEUVERABILITY_OPTIONS
      .find(opt => opt.value === flyManeuverability.value)
      ?.label
      ?? '');
  });
</script>

<style lang="scss" scoped>
  .movement-section {
    padding: 0.25rem;

    .speed-cards {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      grid-auto-rows: min-content;
      gap: 0.25rem 0.5rem;
      width: 100%;

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
        justify-content: center;
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
            justify-self: center;
          }

          :deep(.input-group) {
            position: relative;
            font-size: 1rem;
            line-height: 1;

            input {
              grid-area: value;
              text-align: center;
              letter-spacing: 0.05em;

              &.placeholder {
                color: var(--color-text-dark-secondary, #888);
              }
            }
          }
        }
      }
    }
  }
</style>
