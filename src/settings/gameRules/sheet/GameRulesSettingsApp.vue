<template>
  <form class="generic-settings-form" @submit.prevent="onSubmit">
    <!-- Standard sections -->
    <fieldset v-for="section in sections" :key="section.key" class="settings-section">
      <legend>{{ localize(section.label) }}</legend>

      <!-- Standard fields -->
      <div v-for="field in section.fields" :key="field.key" class="settings-field">
        <label :for="field.key">
          {{ localize(field.label) }}
          <span v-if="field.hint" class="hint">{{ localize(field.hint) }}</span>
        </label>
        <template v-if="field.choices">
          <select
            :id="field.key"
            :value="getFieldValue(field.key)"
            @change="e => onUpdate(field.key, (e.target as HTMLSelectElement)?.value)"
          >
            <option v-for="choice in field.choices" :key="choice.value" :value="choice.value">
              {{ localize(choice.label) }}
            </option>
          </select>
        </template>
        <template v-else-if="field.type === 'boolean'">
          <input
            type="checkbox"
            :id="field.key"
            :checked="Boolean(getFieldValue(field.key))"
            @change="e => onUpdate(field.key, (e.target as HTMLInputElement)?.checked)"
          />
        </template>
        <template v-else-if="field.type === 'number'">
          <input
            type="number"
            :id="field.key"
            :value="getFieldValue(field.key)"
            @input="e => onUpdate(field.key, (e.target as HTMLInputElement)?.valueAsNumber)"
          />
        </template>
        <template v-else>
          <input
            type="text"
            :id="field.key"
            :value="getFieldValue(field.key)"
            @input="e => onUpdate(field.key, (e.target as HTMLInputElement)?.value)"
          />
        </template>
      </div>

      <!-- Damage Reduction Types (in optionalRules section) -->
      <DamageReductionTable
        v-if="section.key === 'optionalRules'"
        :model-value="getDamageReductionTypes()"
        @update:model-value="onDamageReductionUpdate"
      />
    </fieldset>

    <!-- Footer -->
    <footer class="form-footer">
      <button type="submit" class="save-btn">
        <i class="fas fa-save" />
        {{ localize('dnd35e.SETTINGS.Save') }}
      </button>
    </footer>
  </form>
</template>

<script setup lang="ts">
  import type { SettingsSection } from '@settings/core/_types.mjs';
  import type { VueSettingsContext } from '@vueApps/VueSettingsMixin.mjs';

  import type { DamageReductionTypesConfig } from '../_types.mjs';
  import { GAME_RULES_KEYS } from '../constants.mjs';
  import DamageReductionTable from './DamageReductionTable.vue';

  const props = defineProps<{
    context: VueSettingsContext<Record<string, unknown>>;
    sections: SettingsSection[];
    onUpdateData: (path: string, value: unknown) => void;
  }>();

  const emit = defineEmits<{
    (e: 'submit'): void;
  }>();

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function getFieldValue(key: string): unknown {
    return props.context.data[key];
  }

  function getDamageReductionTypes(): DamageReductionTypesConfig {
    return (props.context.data[GAME_RULES_KEYS.DAMAGE_REDUCTION_TYPES] ?? {}) as DamageReductionTypesConfig;
  }

  function onDamageReductionUpdate(value: DamageReductionTypesConfig): void {
    props.onUpdateData(GAME_RULES_KEYS.DAMAGE_REDUCTION_TYPES, value);
  }

  function onUpdate(key: string, value: unknown): void {
    props.onUpdateData(key, value);
  }

  function onSubmit(): void {
    emit('submit');
  }
</script>

<style scoped lang="scss">
  .generic-settings-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    overflow: auto;
  }

  .settings-section {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.75rem;
    margin: 0;

    legend {
      font-weight: bold;
      padding: 0 0.5rem;
    }
  }

  .settings-field {
    display: flex;
    flex-direction: column;
    margin-bottom: 1rem;

    label {
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .hint {
      display: block;
      font-size: 0.9em;
      color: var(--color-text-light);
      margin-left: 0.5em;
    }

    input,
    select {
      margin-top: 0.25rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: 3px;
      font-size: 1em;
    }

    input[type="checkbox"] {
      width: auto;
      margin-top: 0.5em;
      margin-left: 0;
    }
  }

  .form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
    margin-top: auto;

    button {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 1rem;
      border-radius: 3px;
      cursor: pointer;

      &.save-btn {
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
      }
    }
  }
</style>
