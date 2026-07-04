<template>
  <div class="settings-table">
    <!-- Header -->
    <div class="settings-table-header">
      <span class="col-id">{{ localize(idHeader) }}</span>
      <span class="col-label">{{ localize(labelHeader) }}</span>
      <span v-for="col in columns" :key="col.key" :style="col.width ? { flex: `0 0 ${col.width}` } : undefined">
        {{ localize(col.label) }}
      </span>
      <span class="col-actions">
        <button type="button" class="add-btn" @click="onAdd" :title="localize(addTooltip)">
          <i class="fas fa-plus" />
        </button>
      </span>
    </div>

    <!-- Rows -->
    <SettingsTableRow
      v-for="(item, index) in items"
      :key="item.id || index"
      :item="item"
      :columns="columns"
      :id-config="idConfig"
      @update-item="(updated, oldId) => $emit('update-item', updated, oldId)"
      @delete-item="(id) => $emit('delete-item', id)"
    />

    <!-- Empty state -->
    <div v-if="items.length === 0" class="settings-table-empty">
      {{ localize(emptyLabel) }}
    </div>
  </div>
</template>

<script setup lang="ts">
  import SettingsTableRow from './SettingsTableRow.vue';
  import type { IdConfig, SettingsTableColumn, SettingsTableItem } from './types.mts';

  withDefaults(defineProps<{
    items: SettingsTableItem[];
    columns?: SettingsTableColumn[];
    idConfig?: IdConfig;
    idHeader?: string;
    labelHeader: string;
    addTooltip: string;
    emptyLabel: string;
  }>(), {
    columns: () => [],
    idConfig: () => ({}),
    idHeader: 'ID',
  });

  const emit = defineEmits<{
    (e: 'add'): void;
    (e: 'update-item', item: SettingsTableItem, oldId: string): void;
    (e: 'delete-item', id: string): void;
  }>();

  function onAdd(): void {
    emit('add');
  }

  function localize(key: string): string {
    return game.i18n.localize(key);
  }
</script>

<style lang="scss" scoped>
  .settings-table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .settings-table-header {
    display: flex;
    align-items: center;
    gap: 0.3em;
    padding: 0.5rem;
    background: var(--color-select-option-bg);
    font-weight: bold;
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 1;

    .col-id {
      flex: 1 1 0;
      min-width: 0;
    }

    .col-label {
      flex: 2 1 0;
    }

    > span:not(.col-id):not(.col-label):not(.col-actions) {
      flex: 1 1 0;
      min-width: 0;
    }

    .col-actions {
      flex: 0 0 auto;
      display: flex;
      justify-content: center;

      .add-btn {
        border: 1px solid var(--color-level-success-border);
        color: var(--color-level-success);
        width: 28px;
        height: 28px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 3px;
        cursor: pointer;
        background: transparent;

        &:hover {
          background: var(--color-level-success);
          color: var(--color-text-primary);
        }
      }
    }
  }

  .settings-table-empty {
    padding: 1rem;
    text-align: center;
    color: var(--color-text-secondary);
    font-style: italic;
  }
</style>
