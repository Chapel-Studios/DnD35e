<template>
  <form class="roll-settings-form" @submit.prevent="onSubmit">
    <p class="notes">{{ localize('dnd35e.SETTINGS.RollConfig.Instructions') }}</p>

    <!-- Actor Type Sections -->
    <section v-for="actorType in actorTypes" :key="actorType.key" class="roll-section">
      <h3>{{ localize(actorType.label) }}</h3>

      <div class="roll-grid">
        <div v-for="rollType in rollTypes" :key="rollType.key" class="form-group">
          <label>{{ localize(rollType.label) }} {{ localize('dnd35e.COMMON.RollMode') }}</label>
          <select
            :value="context.data.rollConfig[actorType.key][rollType.key]"
            @change="onUpdate(`rollConfig.${actorType.key}.${rollType.key}`, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ localize('dnd35e.COMMON.Default') }}</option>
            <option v-for="mode in rollModes" :key="mode.value" :value="mode.value">
              {{ localize(mode.label) }}
            </option>
          </select>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="form-footer">
      <button type="button" class="reset-btn" @click="onReset">
        <i class="fas fa-undo" />
        {{ localize('dnd35e.SETTINGS.Reset') }}
      </button>
      <button type="submit" class="save-btn">
        <i class="fas fa-save" />
        {{ localize('dnd35e.SETTINGS.Save') }}
      </button>
    </footer>
  </form>
</template>

<script setup lang="ts">
  import type { VueSettingsContext } from '@vueApps/VueSettingsMixin.mjs';

  import type { RollConfig } from '../types.mjs';

  interface ActorTypeInfo {
    key: 'character' | 'npc' | 'trap';
    label: string;
  }

  interface RollTypeInfo {
    key: 'attack' | 'applyDamage' | 'savingThrow' | 'skill' | 'grapple' | 'hpRoll';
    label: string;
  }

  interface RollModeOption {
    value: string;
    label: string;
  }

  const props = defineProps<{
    context: VueSettingsContext<RollConfig>;
    onUpdateData: (path: string, value: unknown) => void;
  }>();

  const emit = defineEmits<{
    (e: 'submit'): void;
    (e: 'reset'): void;
  }>();

  const actorTypes: ActorTypeInfo[] = [
    { key: 'character', label: 'dnd35e.COMMON.ActorTypeCharacter' },
    { key: 'npc', label: 'dnd35e.COMMON.ActorTypeNPC' },
    { key: 'trap', label: 'dnd35e.COMMON.ActorTypeTrap' },
  ];

  const rollTypes: RollTypeInfo[] = [
    { key: 'attack', label: 'dnd35e.COMMON.Attack' },
    { key: 'applyDamage', label: 'dnd35e.COMMON.ApplyDamage' },
    { key: 'savingThrow', label: 'dnd35e.COMMON.SavingThrow' },
    { key: 'skill', label: 'dnd35e.COMMON.Skill' },
    { key: 'grapple', label: 'dnd35e.COMMON.Grapple' },
    { key: 'hpRoll', label: 'dnd35e.COMMON.HitPoints' },
  ];

  // Get roll modes from Foundry config
  const rollModes: RollModeOption[] = Object.entries(CONFIG.Dice.rollModes).map(([value, label]) => ({
    value,
    label: label as string,
  }));

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function onUpdate(path: string, value: unknown): void {
    props.onUpdateData(path, value);
  }

  function onSubmit(): void {
    emit('submit');
  }

  function onReset(): void {
    emit('reset');
  }
</script>

<style scoped lang="scss">
  .roll-settings-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }

  .notes {
    font-style: italic;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .roll-section {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.75rem;

    h3 {
      margin: 0 0 0.75rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--color-border);
    }
  }

  .roll-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      label {
        font-weight: 500;
        font-size: 0.9rem;
      }

      select {
        width: 100%;
      }
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

      &.reset-btn {
        background: var(--color-select-option-bg);
        border: 1px solid var(--color-border);
      }

      &.save-btn {
        background: var(----color-level-success);
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
      }
    }
  }
</style>
