<template>
  <div 
    class="table-row"
    :class="{ 'row-disabled': !state.enabled, 'is-system': state.isSystem }"
  >
    <!-- ID (readonly for system, editable for custom - user prefix hidden) -->
    <input
      v-if="!state.isSystem"
      type="text"
      class="col-id"
      :class="{'auto-id': isUsingAutoId}"
      v-model="idBuffer"
      :readonly="state.isSystem"
      :disabled="state.isSystem"
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

    <!-- Label -->
    <input
      type="text"
      class="col-label"
      v-model="labelBuffer"
      :readonly="state.isSystem"
      :disabled="state.isSystem"
      @blur="onLabelBlur"
    />

    <!-- Short Label -->
    <input
      type="text"
      class="col-short"
      v-model="shortLabelBuffer"
      :readonly="state.isSystem"
      :disabled="state.isSystem"
      maxlength="5"
      @blur="onShortLabelBlur"
    />

    <!-- Value in GP -->
    <input
      type="number"
      class="col-value"
      v-model="valueInGpBuffer"
      :readonly="state.isSystem"
      :disabled="state.isSystem"
      step="0.0001"
      min="0"
      @blur="onValueInGpBlur"
    />

    <!-- Weight in lbs -->
    <div class="row-weight-wrapper">
      <input
        type="number"
        class="col-weight"
        v-model="weightLbsBuffer"
        :readonly="state.isSystem"
        :disabled="state.isSystem"
        step="0.001"
        min="0"
        @blur="onWeightLbsBlur"
      />
      {{ weightDisplayShortLabel }}
    </div>

    <!-- Actions -->
    <span class="col-actions">
      <!-- Button 1: Enable/Disable (system) or Delete (custom) -->
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
        @click="removeCoinage" 
        :title="localize('dnd35e.COMMON.Delete')"
      >
        <i class="fas fa-trash" />
      </button>

      <!-- Button 2: Visibility -->
      <button
        type="button"
        class="visibility-btn"
        :class="state.visibility"
        :title="visibilityTooltip"
        @click="cycleVisibility"
      >
        <i :class="visibilityIcon" />
      </button>

      <!-- Button 3: Exclude from roll-up -->
      <button
        type="button"
        class="rollup-btn"
        :class="{ excluded: state.excludeFromRollUp }"
        :title="state.excludeFromRollUp
          ? localize('dnd35e.SETTINGS.CurrencyConfig.RollUpExcluded')
          : localize('dnd35e.SETTINGS.CurrencyConfig.RollUpIncluded')"
        @click="toggleExcludeFromRollUp"
      >
        <i :class="state.excludeFromRollUp ? 'fas fa-compress-arrows-alt' : 'fas fa-compress-arrows-alt'" />
      </button>
    </span>
  </div>
</template>

<script setup lang="ts">
  import { stripSpecialCharacters } from '@helpers/stringHelpers.mjs';
  import type { SettingsStore } from '@settings/shared/sheet/settingsStore.mjs';
  import { SettingsStoreSymbol } from '@settings/shared/sheet/settingsStore.mjs';
  import { computed, inject, reactive, ref, watch } from 'vue';

  import type { CoinageDefinition, CoinageVisibility } from '../_types.mjs';
  import { coinageVisibilityEveryone, coinageVisibilityGmOnly, coinageVisibilityGmSelect } from '../_types.mjs';
  import { USER_COIN_PREFIX } from '../constants.mjs';
  import { isAutoId } from './idFieldUtils.mjs';

  const {
    measurement: {
      weightDisplayShortLabel,
    },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const props = defineProps<{
    coinage: CoinageDefinition;
    existingIds: string[];
  }>();

  const state = reactive(props.coinage);
  const emit = defineEmits<{
    (e: 'update-coinage', updatedCoinage: CoinageDefinition, oldId: string): void;
    (e: 'delete-coinage', id: string): void;
  }>();

  // Local buffers for robust editing
  const labelBuffer = ref(state.label);
  const shortLabelBuffer = ref(state.shortLabel);
  const valueInGpBuffer = ref(state.valueInGp);
  const weightLbsBuffer = ref(state.weightLbs);

  // Watch for external changes to sync shortLabel buffer
  watch(() => state.shortLabel, (val) => { if (val !== shortLabelBuffer.value) shortLabelBuffer.value = val; });
  // Watch for external changes to sync valueInGp buffer
  watch(() => state.valueInGp, (val) => { if (val !== valueInGpBuffer.value) valueInGpBuffer.value = val; });
  // Watch for external changes to sync weightLbs buffer
  watch(() => state.weightLbs, (val) => { if (val !== weightLbsBuffer.value) weightLbsBuffer.value = val; });

  function onShortLabelBlur() {
    const oldId = state.id;
    state.shortLabel = shortLabelBuffer.value;
    emit('update-coinage', { ...state }, oldId);
  }

  function onValueInGpBlur() {
    const oldId = state.id;
    state.valueInGp = Number(valueInGpBuffer.value);
    emit('update-coinage', { ...state }, oldId);
  }

  function onWeightLbsBlur() {
    const oldId = state.id;
    state.weightLbs = Number(weightLbsBuffer.value);
    emit('update-coinage', { ...state }, oldId);
  }
  // Remove prefix for display in input
  function stripIdPrefix(id: string): string {
    if (id.startsWith(USER_COIN_PREFIX)) {
      // Remove user_ prefix and any auto marker
      return id.replace(/^user_\d*\$!auto!\$|^user_/, '');
    }
    // Optionally, handle other custom prefixes here
    return id;
  }
  const idBuffer = ref(stripIdPrefix(state.id));

  // Watch for external changes to sync buffers
  watch(() => state.label, (val) => { if (val !== labelBuffer.value) labelBuffer.value = val; });
  watch(() => state.id, (val) => {
    const stripped = stripIdPrefix(val);
    if (stripped !== idBuffer.value) idBuffer.value = stripped;
  });

  const isUsingAutoId = computed(() => isAutoId(state.id));

  // When label changes and auto id, update id buffer live (preserve auto id prefix, but only show suffix in input)
  watch(labelBuffer, (val) => {
    if (isUsingAutoId.value) {
      idBuffer.value = stripSpecialCharacters(val).toLowerCase();
    }
  });

  function onLabelBlur() {
    // Save label, and if auto id, also save id (with prefix)
    const oldId = state.id;
    state.label = labelBuffer.value;
    if (isUsingAutoId.value) {
      // Extract the current auto id prefix (everything up to and including $!auto!$)
      const match = state.id.match(/^(.*\$!auto!\$)/);
      const autoPrefix = match ? match[1] : USER_COIN_PREFIX;
      state.id = `${autoPrefix}${idBuffer.value}`;
    }
    emit('update-coinage', { ...state }, oldId);
  }

  function onIdBlur() {
    // If auto, break auto mode and set only the id (removes auto prefix)
    const oldId = state.id;
    if (isUsingAutoId.value) {
      // Always add user_ prefix when breaking auto
      state.id = `${USER_COIN_PREFIX}${idBuffer.value}`;
      // Do NOT set state.label here
    } else {
      // For custom ids, always add user_ prefix if not present
      state.id = idBuffer.value.startsWith(USER_COIN_PREFIX) ? idBuffer.value : `${USER_COIN_PREFIX}${idBuffer.value}`;
    }
    emit('update-coinage', { ...state }, oldId);
  }

  function toggleEnabled(): void {
    const oldId = state.id;
    state.enabled = !state.enabled;
    emit('update-coinage', { ...state }, oldId);
  }

  const removeCoinage = (): void => {
    emit('delete-coinage', state.id);
  };

  const visibilityTooltip = computed(() => {
    switch (state.visibility) {
    case coinageVisibilityEveryone: return localize('dnd35e.SETTINGS.CurrencyConfig.VisibilityEveryone');
    case coinageVisibilityGmSelect: return localize('dnd35e.SETTINGS.CurrencyConfig.VisibilityGmSelect');
    case coinageVisibilityGmOnly: return localize('dnd35e.SETTINGS.CurrencyConfig.VisibilityGmOnly');
    default: return '';
    }
  });

  const visibilityIcon = computed(() => {
    switch (state.visibility) {
    case coinageVisibilityEveryone: return 'fas fa-eye';
    case coinageVisibilityGmSelect: return 'fas fa-user-shield';
    case coinageVisibilityGmOnly: return 'fas fa-eye-slash';
    default: return 'fas fa-eye';
    }
  });

  function cycleVisibility(): void {
    const oldId = state.id;
    const order: CoinageVisibility[] = [coinageVisibilityEveryone, coinageVisibilityGmSelect, coinageVisibilityGmOnly];
    const current = state.visibility;
    const currentIndex = order.indexOf(current);
    const next = order[(currentIndex + 1) % order.length];
    state.visibility = next;
    emit('update-coinage', { ...state }, oldId);
  }

  function toggleExcludeFromRollUp(): void {
    const oldId = state.id;
    state.excludeFromRollUp = !state.excludeFromRollUp;
    emit('update-coinage', { ...state }, oldId);
  }

  function localize(key: string): string {
    return game.i18n.localize(key);
  }
</script>

<style lang="scss" scoped>
  .table-row {
    display: flex;
    align-items: center;
    min-height: 2.2em;
    border-bottom: 1px solid var(--color-border);
    gap: 0.3em;

    input {
      font-size: 1em;
      padding: 0.2em 0.4em;
      border: 1px solid var(--color-border);
      border-radius: 3px;
      color: var(--color-text-primary);
      
      &.auto-id {
        font-style: italic;
        color: var(--color-text-secondary);
      }
    }

    .col-id,
    .col-label,
    .col-short,
    .col-value,
    .col-weight {
      flex: 1 1 0;
      margin-right: 0.5em;
      min-width: 0;
    }

    .row-weight-wrapper {
      display: flex;
      align-items: center;
      gap: 0.25em;

      input {
        margin-right: 0;
      }
    }

    .col-actions {
      display: flex;
      gap: inherit;
    }

    .delete-btn {
      color: var(--color-level-error);
    }

    .col-actions {
      display: flex;
      justify-content: center;
      gap: 0.25rem;

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
    }

    .status-btn {
      &.enabled {
        color: var(--color-level-success);
      }

      &:not(.enabled) {
        color: var(--color-level-error);
      }
    }

    .visibility-btn {
      &.everyone {
        color: var(--color-text-primary);
      }

      &.gmSelect {
        color: var(--color-level-warning);
      }

      &.gmOnly {
        color: var(--color-level-error);
      }
    }

    input:disabled {
      color: var(--color-text-subtle);
    }

    .status-btn.enabled {
      color: var(--color-level-success);
    }

    .visibility-btn {
      color: var(--color-text-accent);
    }

    .rollup-btn {
      color: var(--color-level-success);

      &.excluded {
        color: var(--color-level-error);
        opacity: 0.6;
      }
    }

    &.row-disabled input {
      opacity: 0.6;
    }

    // &.is-system {
    //   background: var(--color-bg-alt);
    // }
  }
</style>