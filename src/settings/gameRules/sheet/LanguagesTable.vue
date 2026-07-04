<template>
  <div class="available-languages-settings">
    <p class="notes">{{ localize('dnd35e.SETTINGS.AvailableLanguageOptions.Hint') }}</p>

    <SettingsTable
      :items="tableItems"
      :id-config="{ customPrefix: 'custom_' }"
      id-header="dnd35e.SETTINGS.AvailableLanguageOptions.IdColumn"
      label-header="dnd35e.SETTINGS.AvailableLanguageOptions.LabelColumn"
      add-tooltip="dnd35e.COMMON.Add"
      empty-label="dnd35e.SETTINGS.AvailableLanguageOptions.None"
      @add="addType"
      @update-item="updateType"
      @delete-item="removeType"
    />
  </div>
</template>

<script setup lang="ts">
  import { stripSpecialCharacters } from '@helpers/stringHelpers.mjs';
  import { AUTO_ID_MARKER, type SettingsTableItem } from '@settings/index.mjs';
  import SettingsTable from '@settings/shared/sheet/SettingsTable/SettingsTable.vue';
  import { computed, ref } from 'vue';

  import type { AvailableLanguagesConfig } from '../types.mts';

  const CUSTOM_PREFIX = 'custom_';
  const localize = (key: string) => game.i18n.localize(key);

  const props = defineProps<{
    modelValue: AvailableLanguagesConfig;
  }>();

  const emit = defineEmits<{
    (e: 'update:modelValue', value: AvailableLanguagesConfig): void;
  }>();

  const config = ref<AvailableLanguagesConfig>(foundry.utils.deepClone(props.modelValue));
  const autoIdCounter = ref(0);

  /** Convert the Record-based config to the flat items array the table expects */
  const tableItems = computed((): SettingsTableItem[] => {
    const systemDefaults = (CONFIG.dnd35e.gameRules.availableLanguageOptions ?? {}) as Record<string, { label: string }>;
    return Object.entries(config.value).map(([key, entry]) => ({
      id: key,
      // Use pre-localized CONFIG label for system entries; stored label for custom
      label: systemDefaults[key]?.label ?? entry.label,
      enabled: entry.enabled,
      isSystem: entry.isSystem,
    }));  
  });

  /** Strip AUTO_ID_MARKER from config keys before emitting so stored IDs are always clean. */
  function stripAutoMarkers(cfg: AvailableLanguagesConfig): AvailableLanguagesConfig {
    const result: AvailableLanguagesConfig = {};
    for (const [key, entry] of Object.entries(cfg)) {
      const markerIdx = key.indexOf(AUTO_ID_MARKER);
      if (markerIdx === -1) {
        result[key] = entry;
        continue;
      }
      const suffix = key.slice(markerIdx + AUTO_ID_MARKER.length);
      const finalKey = suffix
        ? `${CUSTOM_PREFIX}${suffix}`
        : `${CUSTOM_PREFIX}${stripSpecialCharacters(entry.label)}`;
      result[finalKey] = entry;
    }
    return result;
  }

  function emitUpdate(): void {
    emit('update:modelValue', stripAutoMarkers(foundry.utils.deepClone(config.value)));
  }

  function addType(): void {
    const key = `${CUSTOM_PREFIX}${++autoIdCounter.value}${AUTO_ID_MARKER}`;
    config.value = {
      ...config.value,
      [key]: { label: '', enabled: true, isSystem: false },
    };
    emitUpdate();
  }

  function updateType(updated: SettingsTableItem, oldId: string): void {
    const entry = config.value[oldId];
    if (!entry) return;

    // For system items, only enabled can change
    if (entry.isSystem) {
      config.value = {
        ...config.value,
        [oldId]: { ...entry, enabled: updated.enabled },
      };
    } else {
      const newConfig = { ...config.value };

      // If key changed, remove old entry
      if (updated.id !== oldId) {
        delete newConfig[oldId];
      }

      newConfig[updated.id] = {
        label: updated.label,
        enabled: updated.enabled,
        isSystem: false,
      };
      config.value = newConfig;
    }
    emitUpdate();
  }

  function removeType(id: string): void {
    const entry = config.value[id];
    if (!entry || entry.isSystem) return;

    const newConfig = { ...config.value };
    delete newConfig[id];
    config.value = newConfig;
    emitUpdate();
  }
</script>

<style scoped lang="scss">
  .available-languages-settings {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .notes {
    font-style: italic;
    color: var(--color-text-secondary);
    margin-bottom: 0;
  }
</style>