<template>
  <div class="damage-reduction-settings">
    <p class="notes">{{ localize('dnd35e.SETTINGS.DamageReductionTypes.Hint') }}</p>

    <SettingsTable
      :items="tableItems"
      :id-config="{ customPrefix: 'custom_' }"
      id-header="dnd35e.SETTINGS.DamageReductionTypes.IdColumn"
      label-header="dnd35e.SETTINGS.DamageReductionTypes.LabelColumn"
      add-tooltip="dnd35e.COMMON.Add"
      empty-label="dnd35e.SETTINGS.DamageReductionTypes.None"
      @add="addType"
      @update-item="updateType"
      @delete-item="removeType"
    />
  </div>
</template>

<script setup lang="ts">
  import { stripSpecialCharacters } from '@helpers/stringHelpers.mjs';
  import type { SettingsTableItem } from '@settings/shared/sheet/SettingsTable/index.mjs';
  import { AUTO_ID_MARKER, SettingsTable } from '@settings/shared/sheet/SettingsTable/index.mjs';
  import { computed, ref } from 'vue';

  import type { DamageReductionTypesConfig } from '../types.mts';

  const CUSTOM_PREFIX = 'custom_';

  const props = defineProps<{
    modelValue: DamageReductionTypesConfig;
  }>();

  const emit = defineEmits<{
    (e: 'update:modelValue', value: DamageReductionTypesConfig): void;
  }>();

  const config = ref<DamageReductionTypesConfig>(foundry.utils.deepClone(props.modelValue));
  const autoIdCounter = ref(0);

  /** Convert the Record-based config to the flat items array the table expects */
  const tableItems = computed((): SettingsTableItem[] => {
    const systemDefaults = (CONFIG.dnd35e.gameRules.damageReductionTypes ?? {}) as Record<string, { label: string }>;
    return Object.entries(config.value).map(([key, entry]) => ({
      id: key,
      // Use pre-localized CONFIG label for system entries; stored label for custom
      label: systemDefaults[key]?.label ?? entry.label,
      enabled: entry.enabled,
      isSystem: entry.isSystem,
    }));
  });

  /** Strip AUTO_ID_MARKER from config keys before emitting so stored IDs are always clean. */
  function stripAutoMarkers(cfg: DamageReductionTypesConfig): DamageReductionTypesConfig {
    const result: DamageReductionTypesConfig = {};
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

  function localize(key: string): string {
    return game.i18n.localize(key);
  }
</script>

<style scoped lang="scss">
  .damage-reduction-settings {
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
