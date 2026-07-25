<template>
  <FormGroupSection
    label="dnd35e.CREATURE.FIELDS.encumbrance.label"
    field-path="system.encumbrance"
    :default-visibility="ownerPlusVisibility"
    :default-editability="gmOnlyEditability"
    hide-field-controls
    class="creature-encumbrance-section"
  >
    <div class="encumbrance-bar-container">
      <MeasureBar
        :segments="encumbranceSegments"
        :max="encumbranceDrag"
        :scale-pivots="encumbranceScalePivots"
        :markers="encumbranceMarkers"
        :value-label="encumbranceValueLabel"
        bar-class="encumbrance-bar"
      />
    </div>
  </FormGroupSection>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { roundToDecimal } from '@helpers/math.mjs';
  import type { SettingsStore } from '@settings/index.mjs';
  import { SettingsStoreSymbol } from '@settings/index.mjs';
  import { FormGroupSection, gmOnlyEditability, ownerPlusVisibility } from '@vc/fields/index.mjs';
  import MeasureBar from '@vc/MeasureBar.vue';
  import { computed, inject } from 'vue';

  import type { CreatureDocumentStore } from '../CreatureStore.mjs';

  const {
    documentGetters: {
      encumbranceCarriedWeight,
      encumbranceLight,
      encumbranceMedium,
      encumbranceHeavy,
      encumbranceMaxLift,
      encumbranceDrag,
      encumbranceTier,
    },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  const {
    measurement: {
      weightDisplayShortLabel,
      convertToLocalizedWeight,
    },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  // All bar/label/tooltip values below read from these localized computeds rather than
  // the raw stored lbs values - conversion is a linear scale (see convertToLocalizedWeight),
  // so bar proportions/pivots stay correct even though the displayed numbers change.
  const localizedCarriedWeight = computed(() => roundToDecimal(convertToLocalizedWeight(encumbranceCarriedWeight.value), 2));
  const localizedLight = computed(() => roundToDecimal(convertToLocalizedWeight(encumbranceLight.value), 2));
  const localizedMedium = computed(() => roundToDecimal(convertToLocalizedWeight(encumbranceMedium.value), 2));
  const localizedHeavy = computed(() => roundToDecimal(convertToLocalizedWeight(encumbranceHeavy.value), 2));
  const localizedMaxLift = computed(() => roundToDecimal(convertToLocalizedWeight(encumbranceMaxLift.value), 2));
  const localizedDrag = computed(() => roundToDecimal(convertToLocalizedWeight(encumbranceDrag.value), 2));

  // The bar spans 0-drag, but the range beyond heavy is a rare "how overloaded are you"
  // zone - reserve only the trailing 20% of the bar for it, split into two waypoints so
  // heavy->maxLift and maxLift->drag each get their own fixed slice instead of the whole
  // heavy->drag range scaling linearly (which would dwarf the common light/medium/heavy range).
  const HEAVY_PIVOT_PERCENT = 80;
  const MAX_LIFT_PIVOT_PERCENT = 90;
  const encumbranceScalePivots = computed(() => [
    { value: localizedHeavy.value, percent: HEAVY_PIVOT_PERCENT },
    { value: localizedMaxLift.value, percent: MAX_LIFT_PIVOT_PERCENT },
  ]);

  const TIER_COLOR_CLASSES = [
    'color-green',
    'color-yellow',
    'color-orange',
    'color-red',
  ] as const;
  const TIER_LABEL_KEYS = [
    'dnd35e.CREATURE.FIELDS.encumbrance.tier.light',
    'dnd35e.CREATURE.FIELDS.encumbrance.tier.medium',
    'dnd35e.CREATURE.FIELDS.encumbrance.tier.heavy',
    'dnd35e.CREATURE.FIELDS.encumbrance.tier.overloaded',
  ] as const;

  const tierLevel = computed(() => Math.min(3, Math.max(0, encumbranceTier.value)));
  const tierLabel = computed(() => game.i18n.localize(TIER_LABEL_KEYS[tierLevel.value]));

  // The value label shows "carried / <threshold>" anchored above whichever breakpoint
  // the carried weight is currently progressing toward - light while under light,
  // medium once past light, heavy once past medium, and drag once overloaded - rather
  // than always comparing against a fixed max.
  const CURRENT_TIER_THRESHOLDS = [localizedLight, localizedMedium, localizedHeavy, localizedDrag] as const;
  const currentThreshold = computed(() => CURRENT_TIER_THRESHOLDS[tierLevel.value].value);
  const encumbranceValueLabel = computed(() => ({
    value: currentThreshold.value,
    text: `${localizedCarriedWeight.value} / ${currentThreshold.value}`,
  }));

  const encumbranceSegments = computed(() => [
    {
      key: 'carried',
      value: localizedCarriedWeight.value,
      colorClass: TIER_COLOR_CLASSES[tierLevel.value],
      tooltip: game.i18n.format('dnd35e.CREATURE.FIELDS.encumbrance.tooltip', {
        carried: localizedCarriedWeight.value,
        max: localizedHeavy.value,
        tier: tierLabel.value,
        unit: weightDisplayShortLabel.value,
      }),
    },
  ]);

  const encumbranceMarkers = computed(() => [
    {
      key: 'light',
      value: localizedLight.value,
      label: game.i18n.localize(TIER_LABEL_KEYS[0]),
      tooltip: game.i18n.format('dnd35e.CREATURE.FIELDS.encumbrance.breakpoint', {
        tier: game.i18n.localize(TIER_LABEL_KEYS[0]),
        value: localizedLight.value,
        unit: weightDisplayShortLabel.value,
      }),
    },
    {
      key: 'medium',
      value: localizedMedium.value,
      label: game.i18n.localize(TIER_LABEL_KEYS[1]),
      tooltip: game.i18n.format('dnd35e.CREATURE.FIELDS.encumbrance.breakpoint', {
        tier: game.i18n.localize(TIER_LABEL_KEYS[1]),
        value: localizedMedium.value,
        unit: weightDisplayShortLabel.value,
      }),
    },
    {
      // Max lift-over-head (`carry`) always equals the heavy threshold per SRD rules, so
      // both breakpoints sit at the same position - one marker with a combined tooltip
      // covers both rather than stacking two identical, overlapping ticks.
      key: 'heavy',
      value: localizedHeavy.value,
      label: game.i18n.localize(TIER_LABEL_KEYS[2]),
      tooltip: game.i18n.format('dnd35e.CREATURE.FIELDS.encumbrance.breakpoint', {
        tier: `${game.i18n.localize('dnd35e.CREATURE.FIELDS.encumbrance.heavy.label')} / ${game.i18n.localize('dnd35e.CREATURE.FIELDS.encumbrance.carry.label')}`,
        value: localizedHeavy.value,
        unit: weightDisplayShortLabel.value,
      }),
    },
    {
      key: 'maxLift',
      value: localizedMaxLift.value,
      label: game.i18n.localize('dnd35e.CREATURE.FIELDS.encumbrance.maxLift.label'),
      tooltip: game.i18n.format('dnd35e.CREATURE.FIELDS.encumbrance.breakpoint', {
        tier: game.i18n.localize('dnd35e.CREATURE.FIELDS.encumbrance.maxLift.label'),
        value: localizedMaxLift.value,
        unit: weightDisplayShortLabel.value,
      }),
    },
    {
      key: 'drag',
      value: localizedDrag.value,
      label: game.i18n.localize('dnd35e.CREATURE.FIELDS.encumbrance.drag.label'),
      tooltip: game.i18n.format('dnd35e.CREATURE.FIELDS.encumbrance.breakpoint', {
        tier: game.i18n.localize('dnd35e.CREATURE.FIELDS.encumbrance.drag.label'),
        value: localizedDrag.value,
        unit: weightDisplayShortLabel.value,
      }),
    },
  ]);
</script>

<style lang="scss" scoped>
  .creature-encumbrance-section {
    position: relative;
    padding: 0.5rem;
    margin: 0.75rem 0.25rem 0 0;
  }

  .encumbrance-bar-container {
    justify-self: stretch;
  }
</style>
