<template>
  <ListFormGroup
    field-path="system.senses"
    :value="senses"
    add-button-title="dnd35e.ACTOR.FIELDS.senses.add"
    remove-button-title="dnd35e.ACTOR.FIELDS.senses.remove"
    empty-label="dnd35e.ACTOR.FIELDS.senses.empty"
    :default-visibility="ownerPlusVisibility"
    :default-editability="gmOnlyEditability"
    :add-item="addSense"
    :on-update="sensesUpdater"
    class="creature-senses"
  >
    <template #item-edit="{ item, index, disabled }">
      <DistanceValueUnitInput
        :distance="item.distance"
        :unit="item.type"
        :unit-options="availableSensesForItem(item.type)"
        :sizing-unit-options="senseTypeOptions"
        :disabled="disabled"
        :hide-distance="item.type === LOW_LIGHT_VISION"
        :hint="distanceHint"
        :unit-hint="typeHint"
        :on-distance-change="(val: number) => updateSenseDistance(index, val)"
        :on-unit-change="(val: SenseType) => updateSenseType(index, val)"
        class="sense-type-select"
      />
    </template>
    <template #item-readonly="{ item }">
      <template v-if="item.type !== LOW_LIGHT_VISION">{{ convertToLocalizedDistance(item.distance) }}&thinsp;{{ distanceUnit }} </template>{{ localize(SENSE_TYPES_LOCALIZED[item.type]) }}
    </template>
  </ListFormGroup>
</template>

<script setup lang="ts">
  import type { SenseEntrySource } from '@actors/baseActor/data/index.mjs';
  import type { CreatureDocumentStore } from '@actors/creature/sheet/CreatureStore.mjs';
  import { LOW_LIGHT_VISION, SENSE_TYPES_LOCALIZED, SENSE_TYPES_OPTIONS, type SenseType } from '@constants/senses.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { SettingsStore } from '@settings/index.mjs';
  import { SettingsStoreSymbol } from '@settings/index.mjs';
  import type { SelectOption } from '@vc/fields/index.mjs';
  import { 
    DistanceValueUnitInput,
    gmOnlyEditability,
    ListFormGroup,
    ownerPlusVisibility,
  } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';


  const localize = (key: string) => game.i18n.localize(key);

  const {
    documentGetters: {
      senses,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  const {
    measurement: {
      distanceDisplayShortLabel,
      distanceDisplayLabel,
      convertToLocalizedDistance,
    },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const senseTypeOptions = computed(() => SENSE_TYPES_OPTIONS
    .map(option => ({
      ...option,
      label: localize(SENSE_TYPES_LOCALIZED[option.value]),
    })));
  const distanceUnit = computed(() => distanceDisplayShortLabel.value);

  // Schema hint has a {distanceType} placeholder that Foundry's auto-localization can't fill in, so interpolate it manually.
  const distanceHint = computed(() => game.i18n.format(
    'dnd35e.ACTOR.FIELDS.senses.element.distance.hint',
    { distanceType: distanceDisplayLabel.value }
  ));
  const typeHint = computed(() => game.i18n.localize('dnd35e.ACTOR.FIELDS.senses.element.type.hint'));

  // Domain callback: senses are edited as a coordinated array of structured entries.
  const sensesUpdater = getViewAwareFieldUpdater('system.senses');

  function addSense(): void {
    const nextSense = senseTypeOptions.value
      .filter(option => !senses.value.some(sense => sense.type === option.value))
      [0];
    if (!nextSense) return; // All senses already in use

    const newSense: SenseEntrySource = {
      type: nextSense.value,
      // Low-light vision has no fixed range in Foundry (it enhances existing light instead), so it never needs a distance.
      // Stored in squares (canonical unit) — 12 squares = 60 ft, the common SRD darkvision/blindsense default.
      distance: nextSense.value === LOW_LIGHT_VISION ? 0 : 12,
    };
    sensesUpdater([...senses.value, newSense]);
  }

  function updateSenseType(index: number, type: SenseType): void {
    const newSenses = senses.value.map((sense, i) =>
      i === index ? { ...sense, type, distance: type === LOW_LIGHT_VISION ? 0 : sense.distance } : sense
    );
    sensesUpdater(newSenses);
  }

  function updateSenseDistance(index: number, distance: number): void {
    const newSenses = senses.value.map((sense, i) =>
      i === index ? { ...sense, distance: Math.max(0, distance) } : sense
    );
    sensesUpdater(newSenses);
  }

  function availableSensesForItem(currentSense: SenseType): SelectOption<SenseType>[] {
    return senseTypeOptions.value
      .filter(option => option.value === currentSense
        || !senses.value.some(sense => sense.type === option.value));
  }
</script>

<style lang="scss" scoped>
  .creature-senses {
    :deep(.list-items) {
      margin-top: 0.25rem;
    }
  }
  
  .sense-type-select {
    :deep(.vui-value) {
      width: 6ch; // enough for "9999"
    }
  }
</style>
