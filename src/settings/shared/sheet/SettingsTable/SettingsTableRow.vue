<template>
  <div 
    class="settings-table-row"
    :class="{ 'row-disabled': !state.enabled, 'is-system': state.isSystem }"
  >
    <!-- ID (readonly for system items, editable for custom with auto-id support) -->
    <input
      v-if="!state.isSystem"
      type="text"
      class="col-id"
      :class="{ 'auto-id': isUsingAutoId }"
      v-model="idBuffer"
      @blur="onIdBlur"
    />
    <input
      v-else
      type="text"
      class="col-id"
      :value="state.id"
      readonly
      disabled
    />

    <!-- Label (always present) -->
    <input
      type="text"
      class="col-label"
      v-model="labelBuffer"
      :readonly="state.isSystem"
      :disabled="state.isSystem"
      @blur="onLabelBlur"
    />

    <!-- Dynamic columns -->
    <template v-for="col in columns" :key="col.key">
      <!-- Custom render function -->
      <component
        v-if="col.render"
        :is="() => col.render!(getColumnRenderContext(col))"
      />
      <!-- Default: number input -->
      <input
        v-else-if="col.type === 'number'"
        type="number"
        :class="`col-${col.key}`"
        :style="col.width ? { flex: `0 0 ${col.width}` } : undefined"
        v-model.number="columnBuffers[col.key]"
        :readonly="isColumnDisabled(col)"
        :disabled="isColumnDisabled(col)"
        :step="col.step"
        :min="col.min"
        @blur="() => onColumnBlur(col.key)"
      />
      <!-- Default: text input -->
      <input
        v-else
        type="text"
        :class="`col-${col.key}`"
        :style="col.width ? { flex: `0 0 ${col.width}` } : undefined"
        v-model="columnBuffers[col.key]"
        :readonly="isColumnDisabled(col)"
        :disabled="isColumnDisabled(col)"
        :maxlength="col.maxLength"
        @blur="() => onColumnBlur(col.key)"
      />
    </template>

    <!-- Actions -->
    <span class="col-actions">
      <!-- Enable/Disable (system) or Delete (custom) -->
      <button
        v-if="state.isSystem"
        type="button"
        class="status-btn"
        :class="{ enabled: state.enabled }"
        :title="state.enabled ? localize('dnd35e.COMMON.Disable') : localize('dnd35e.COMMON.Enable')"
        @click="toggleEnabled"
      >
        <i :class="state.enabled ? 'fas fa-check-circle' : 'fas fa-times-circle'" />
      </button>
      <button 
        v-else
        type="button" 
        class="delete-btn" 
        :title="localize('dnd35e.COMMON.Delete')"
        @click="onDelete"
      >
        <i class="fas fa-trash" />
      </button>
    </span>
  </div>
</template>

<script setup lang="ts">
  import { stripSpecialCharacters } from '@helpers/stringHelpers.mjs';
  import { computed, reactive, ref, watch } from 'vue';

  import { AUTO_ID_MARKER, DEFAULT_ID_PREFIX } from './types.mjs';
  import type { ColumnRenderContext, IdConfig, SettingsTableColumn, SettingsTableItem } from './types.mts';

  const props = withDefaults(defineProps<{
    item: SettingsTableItem;
    columns: SettingsTableColumn[];
    idConfig?: IdConfig;
  }>(), {
    idConfig: () => ({}),
  });

  const emit = defineEmits<{
    (e: 'update-item', item: SettingsTableItem, oldId: string): void;
    (e: 'delete-item', id: string): void;
  }>();

  const state = reactive({ ...props.item }) as Record<string, unknown> & SettingsTableItem;

  // ─── ID helpers ──────────────────────────────────────────────────────────────

  const isAutoId = (id: string): boolean => id.includes(AUTO_ID_MARKER);

  const effectivePrefix = computed(() => props.idConfig.customPrefix ?? DEFAULT_ID_PREFIX);

  /** Strip the custom prefix and auto-id marker for display */
  function stripIdPrefix(id: string): string {
    const prefix = effectivePrefix.value;
    if (id.startsWith(prefix)) {
      return id.replace(new RegExp(`^${escapeForRegex(prefix)}\\d*${escapeForRegex(AUTO_ID_MARKER)}|^${escapeForRegex(prefix)}`), '');
    }
    return id;
  }

  function escapeForRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const idBuffer = ref(stripIdPrefix(state.id));
  const isUsingAutoId = computed(() => isAutoId(state.id));

  // Sync external id changes
  watch(() => state.id, (val) => {
    const stripped = stripIdPrefix(val);
    if (stripped !== idBuffer.value) idBuffer.value = stripped;
  });

  // ─── Label buffer ────────────────────────────────────────────────────────────

  const labelBuffer = ref(state.label);
  watch(() => state.label, (val) => { if (val !== labelBuffer.value) labelBuffer.value = val; });

  // Auto-id: when label changes live, update id buffer
  watch(labelBuffer, (val) => {
    if (isUsingAutoId.value) {
      idBuffer.value = stripSpecialCharacters(val).toLowerCase();
    }
  });

  // ─── Column buffers ──────────────────────────────────────────────────────────

  const columnBuffers = reactive<Record<string, unknown>>({});
  for (const col of props.columns) {
    columnBuffers[col.key] = (state as Record<string, unknown>)[col.key];
  }
  for (const col of props.columns) {
    watch(() => (state as Record<string, unknown>)[col.key], (val) => {
      if (val !== columnBuffers[col.key]) columnBuffers[col.key] = val;
    });
  }

  // ─── Event handlers ──────────────────────────────────────────────────────────

  function emitUpdate(): void {
    emit('update-item', { ...state } as SettingsTableItem, state.id);
  }

  function onIdBlur(): void {
    const oldId = state.id;
    const prefix = effectivePrefix.value;
    if (isUsingAutoId.value) {
      // Breaking auto mode: set a plain prefixed id
      state.id = `${prefix}${idBuffer.value}`;
    } else {
      state.id = idBuffer.value.startsWith(prefix) ? idBuffer.value : `${prefix}${idBuffer.value}`;
    }
    emit('update-item', { ...state } as SettingsTableItem, oldId);
  }

  function onLabelBlur(): void {
    const oldId = state.id;
    state.label = labelBuffer.value;
    if (isUsingAutoId.value) {
      // Preserve auto-id prefix, update suffix from label
      const match = state.id.match(new RegExp(`^(.*${escapeForRegex(AUTO_ID_MARKER)})`));
      const autoPrefix = match ? match[1] : effectivePrefix.value;
      state.id = `${autoPrefix}${idBuffer.value}`;
    }
    emit('update-item', { ...state } as SettingsTableItem, oldId);
  }

  function onColumnBlur(key: string): void {
    const oldId = state.id;
    (state as Record<string, unknown>)[key] = columnBuffers[key];
    emit('update-item', { ...state } as SettingsTableItem, oldId);
  }

  function toggleEnabled(): void {
    const oldId = state.id;
    state.enabled = !state.enabled;
    emit('update-item', { ...state } as SettingsTableItem, oldId);
  }

  function onDelete(): void {
    emit('delete-item', state.id);
  }

  function isColumnDisabled(col: SettingsTableColumn): boolean {
    return state.isSystem && col.readonlyForSystem !== false;
  }

  function getColumnRenderContext(col: SettingsTableColumn): ColumnRenderContext {
    return {
      value: columnBuffers[col.key],
      update: (newValue: unknown) => {
        columnBuffers[col.key] = newValue;
        (state as Record<string, unknown>)[col.key] = newValue;
        emitUpdate();
      },
      disabled: isColumnDisabled(col),
      item: state as SettingsTableItem,
    };
  }

  function localize(key: string): string {
    return game.i18n.localize(key);
  }
</script>

<style lang="scss" scoped>
  .settings-table-row {
    display: flex;
    align-items: center;
    min-height: 2.2em;
    border-bottom: 1px solid var(--color-border);
    gap: 0.3em;
    padding: 0.25rem 0.5rem;

    &:last-child {
      border-bottom: none;
    }

    &.row-disabled {
      opacity: 0.5;
    }

    &.is-system {
      background: var(--color-select-option-bg);
    }

    input {
      font-size: 1em;
      padding: 0.2em 0.4em;
      border: 1px solid var(--color-border);
      border-radius: 3px;
      color: var(--color-text-primary);
      flex: 1 1 0;
      min-width: 0;

      &.auto-id {
        font-style: italic;
        color: var(--color-text-secondary);
      }
    }

    .col-id {
      flex: 1 1 0;
    }

    .col-label {
      flex: 2 1 0;
    }

    .col-actions {
      display: flex;
      justify-content: center;
      gap: 0.25rem;
      flex: 0 0 auto;

      button {
        width: 28px;
        height: 28px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 3px;
        cursor: pointer;
        border: 1px solid var(--color-border);
        background: transparent;

        &:hover {
          background: var(--color-select-option-bg);
        }
      }

      .status-btn {
        &.enabled {
          color: var(--color-level-success);
        }

        &:not(.enabled) {
          color: var(--color-level-error);
        }
      }

      .delete-btn {
        color: var(--color-level-error);
      }
    }
  }
</style>
