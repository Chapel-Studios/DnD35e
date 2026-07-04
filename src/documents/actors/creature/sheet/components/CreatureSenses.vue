<template>
  <ListFormGroup
    field-path="system.bio.senses"
    :value="senses"
    add-button-title="dnd35e.CREATURE.FIELDS.bio.senses.add"
    remove-button-title="dnd35e.CREATURE.FIELDS.bio.senses.remove"
    empty-label="dnd35e.CREATURE.FIELDS.bio.senses.empty"
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
        :on-distance-change="(val: number) => updateSenseDistance(index, val)"
        :on-unit-change="(val: SenseType) => updateSenseType(index, val)"
        class="sense-type-select"
      />
    </template>
    <template #item-readonly="{ item }">
      {{ item.distance }}&thinsp;{{ distanceUnit }} {{ localize(SENSE_TYPES_LOCALIZED[item.type]) }}
    </template>
  </ListFormGroup>
</template>

<script setup lang="ts">
  import type { SenseEntrySource } from '@actors/creature/data/CreatureSystemData.mjs';
  import type { CreatureDocumentStore } from '@actors/creature/sheet/CreatureStore.mjs';
  import { SENSE_TYPES_LOCALIZED, SENSE_TYPES_OPTIONS, type SenseType } from '@constants/senses.mjs';
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
    },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const senseTypeOptions = computed(() => SENSE_TYPES_OPTIONS
    .map(option => ({
      ...option,
      label: localize(SENSE_TYPES_LOCALIZED[option.value]),
    })));
  const distanceUnit = computed(() => distanceDisplayShortLabel.value);

  // Domain callback: senses are edited as a coordinated array of structured entries.
  const sensesUpdater = getViewAwareFieldUpdater('system.bio.senses');

  function addSense(): void {
    const nextSense = senseTypeOptions.value
      .filter(option => !senses.value.some(sense => sense.type === option.value))
      [0];
    if (!nextSense) return; // All senses already in use

    const newSense: SenseEntrySource = {
      type: nextSense.value,
      distance: 60,
    };
    sensesUpdater([...senses.value, newSense]);
  }

  function updateSenseType(index: number, type: SenseType): void {
    const newSenses = senses.value.map((sense, i) =>
      i === index ? { ...sense, type } : sense
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
