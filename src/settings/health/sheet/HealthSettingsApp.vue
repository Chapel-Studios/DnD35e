<template>
  <form class="health-settings-form" @submit.prevent="onSubmit">
    <!-- Tab Navigation -->
    <nav class="tabs" data-group="primary">
      <a
        v-for="tab in tabs"
        :key="tab.id"
        class="item"
        :class="{ active: activeTab === tab.id }"
        :data-tab="tab.id"
        @click="activeTab = tab.id"
      >
        <i :class="tab.icon" />
        {{ localize(tab.label) }}
      </a>
    </nav>

    <!-- Hit Dice Tab -->
    <section v-show="activeTab === 'hitDice'" class="tab" data-group="primary" data-tab="hitDice">
      <p class="notes">{{ localize('DND35E.Settings.Health.HitDiceInstructions') }}</p>

      <div class="hitdice-config">
        <!-- Header row -->
        <div class="hitdice-row header">
          <label class="col-label">{{ localize('DND35E.HitDie') }}</label>
          <label v-for="option in hitdieOptions" :key="option" class="col-header">
            {{ option }}
          </label>
        </div>

        <!-- Hit die rows -->
        <div v-for="(hdConfig, hdType) in context.data.hitdice" :key="hdType" class="hitdice-row">
          <label class="col-label">{{ hdType }}</label>

          <!-- Auto compute toggle -->
          <div class="col-field">
            <ToggleSwitch
              :checked="hdConfig.auto"
              :true-label="'DND35E.Settings.Health.Auto'"
              :false-label="'DND35E.Settings.Health.Manual'"
              @update="onUpdate(`hitdice.${hdType}.auto`, $event)"
            />
          </div>

          <!-- Rate input -->
          <div class="col-field">
            <input
              type="number"
              :value="hdConfig.rate"
              min="0"
              max="100"
              step="0.01"
              @change="onUpdate(`hitdice.${hdType}.rate`, parseFloat(($event.target as HTMLInputElement).value))"
            />
          </div>

          <!-- Maximized levels input -->
          <div class="col-field">
            <input
              type="text"
              :value="hdConfig.maximized"
              @change="onUpdate(`hitdice.${hdType}.maximized`, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>

      <!-- Rounding options -->
      <SelectFormGroup
        label="DND35E.Settings.Health.Rounding.Name"
        hint="DND35E.Settings.Health.Rounding.Hint"
        :value="context.data.rounding"
        :options="roundingOptions"
        :on-update="(v: unknown) => onUpdate('rounding', v)"
        field-path="rounding"
      />

      <!-- Continuity options -->
      <SelectFormGroup
        label="DND35E.Settings.Health.Continuity.Name"
        hint="DND35E.Settings.Health.Continuity.Hint"
        :value="context.data.continuity"
        :options="continuityOptions"
        :on-update="(v: unknown) => onUpdate('continuity', v)"
        field-path="continuity"
      />
    </section>

    <!-- Variants Tab -->
    <section v-show="activeTab === 'variants'" class="tab" data-group="primary" data-tab="variants">
      <p class="notes">{{ localize('DND35E.Settings.Health.VariantsInstructions') }}</p>

      <!-- Wounds & Vigor for PCs -->
      <CheckBoxFormGroup
        label="DND35E.Settings.Health.WoundsAndVigor.PC.Name"
        hint="DND35E.Settings.Health.WoundsAndVigor.PC.Hint"
        :value="context.data.variants.pc.useWoundsAndVigor"
        :on-update="(v: unknown) => onUpdate('variants.pc.useWoundsAndVigor', v)"
        field-path="variants.pc.useWoundsAndVigor"
      />

      <!-- Wounds & Vigor for NPCs -->
      <CheckBoxFormGroup
        label="DND35E.Settings.Health.WoundsAndVigor.NPC.Name"
        hint="DND35E.Settings.Health.WoundsAndVigor.NPC.Hint"
        :value="context.data.variants.npc.useWoundsAndVigor"
        :on-update="(v: unknown) => onUpdate('variants.npc.useWoundsAndVigor', v)"
        field-path="variants.npc.useWoundsAndVigor"
      />
    </section>

    <!-- Footer -->
    <footer class="form-footer">
      <button type="button" class="reset-btn" @click="onReset">
        <i class="fas fa-undo" />
        {{ localize('DND35E.Settings.Reset') }}
      </button>
      <button type="submit" class="save-btn">
        <i class="fas fa-save" />
        {{ localize('DND35E.Settings.Save') }}
      </button>
    </footer>
  </form>
</template>

<script setup lang="ts">
  import CheckBoxFormGroup from '@vc/Fields/FormGroups/CheckBoxFormGroup.vue';
  import SelectFormGroup from '@vc/Fields/FormGroups/SelectFormGroup.vue';
  import ToggleSwitch from '@vc/Fields/ToggleSwitch.vue';
  import type { VueSettingsContext } from '@vueApps/VueSettingsMixin.mjs';
  import { ref } from 'vue';

  import type { HealthConfig } from '../_types.mjs';

  interface TabInfo {
    id: string;
    label: string;
    icon: string;
  }

  const props = defineProps<{
    context: VueSettingsContext<HealthConfig>;
    onUpdateData: (path: string, value: unknown) => void;
  }>();

  const emit = defineEmits<{
    (e: 'submit'): void;
    (e: 'reset'): void;
  }>();

  const activeTab = ref('hitDice');

  const tabs: TabInfo[] = [
    { id: 'hitDice', label: 'DND35E.Settings.Health.HitDice', icon: 'fas fa-dice-d6' },
    { id: 'variants', label: 'DND35E.Settings.Health.Variants', icon: 'fas fa-flask' },
  ];

  const hitdieOptions = ['Compute', 'Rate', 'Maximized'];

  const roundingOptions = [
    { value: 'up', label: 'DND35E.Settings.Health.Rounding.Up' },
    { value: 'nearest', label: 'DND35E.Settings.Health.Rounding.Nearest' },
    { value: 'down', label: 'DND35E.Settings.Health.Rounding.Down' },
  ];

  const continuityOptions = [
    { value: 'continuous', label: 'DND35E.Settings.Health.Continuity.Continuous' },
    { value: 'discrete', label: 'DND35E.Settings.Health.Continuity.Discrete' },
  ];

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
  .health-settings-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    height: 100%;
  }

  .tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.5rem;

    .item {
      padding: 0.5rem 1rem;
      cursor: pointer;
      border-radius: 3px 3px 0 0;
      text-decoration: none;
      color: var(--color-text-primary);

      &:hover {
        background: var(--color-select-option-bg);
      }

      &.active {
        background: var(--color-select-option-bg-active);
        border-bottom: 2px solid var(--color-border-highlight);
      }

      i {
        margin-right: 0.25rem;
      }
    }
  }

  .tab {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    overflow-y: auto;
  }

  .notes {
    font-style: italic;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .hitdice-config {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }

  .hitdice-row {
    display: grid;
    grid-template-columns: 4rem 1fr 1fr 1fr;
    gap: 0.5rem;
    align-items: center;
    padding: 0.25rem;

    &.header {
      font-weight: bold;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.5rem;
    }
  }

  .col-label {
    font-weight: bold;
  }

  .col-header {
    text-align: center;
  }

  .col-field {
    display: flex;
    justify-content: center;

    input[type='number'],
    input[type='text'] {
      width: 5rem;
      text-align: center;
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
