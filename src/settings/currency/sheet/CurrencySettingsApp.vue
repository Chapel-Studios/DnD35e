<template>
  <form class="currency-settings-form" @submit.prevent="onSubmit">
    <p class="notes">{{ localize('DND35E.Settings.CurrencyConfig.Instructions') }}</p>

    <!-- Currency Table -->
    <div class="currency-table">
      <!-- Header -->
      <div class="table-header">
        <span class="col-id">{{ localize('DND35E.Settings.CurrencyConfig.Id') }}</span>
        <span class="col-name">{{ localize('DND35E.Settings.CurrencyConfig.Name') }}</span>
        <span class="col-weight">{{ localize('DND35E.Settings.CurrencyConfig.Weight') }}</span>
        <span class="col-value">{{ localize('DND35E.Settings.CurrencyConfig.ValueInGp') }}</span>
        <span class="col-group">{{ localize('DND35E.Settings.CurrencyConfig.Group') }}</span>
        <span class="col-actions">
          <button type="button" class="add-btn" @click="addEntry" :title="localize('DND35E.Add')">
            <i class="fas fa-plus" />
          </button>
        </span>
      </div>

      <!-- Currency Rows -->
      <div v-for="(entry, index) in entries" :key="index" class="table-row">
        <input
          type="text"
          class="col-id"
          :value="entry.id"
          @change="updateEntry(index, 'id', ($event.target as HTMLInputElement).value)"
        />
        <input
          type="text"
          class="col-name"
          :value="entry.name"
          @change="updateEntry(index, 'name', ($event.target as HTMLInputElement).value)"
        />
        <input
          type="number"
          class="col-weight"
          :value="entry.weight"
          step="0.000001"
          @change="updateEntry(index, 'weight', parseFloat(($event.target as HTMLInputElement).value) || 0)"
        />
        <input
          type="number"
          class="col-value"
          :value="entry.valueInGp"
          step="0.000001"
          @change="updateEntry(index, 'valueInGp', parseFloat(($event.target as HTMLInputElement).value) || 0)"
        />
        <input
          type="text"
          class="col-group"
          :value="entry.group"
          @change="updateEntry(index, 'group', ($event.target as HTMLInputElement).value)"
        />
        <span class="col-actions">
          <button type="button" class="delete-btn" @click="removeEntry(index)" :title="localize('DND35E.Delete')">
            <i class="fas fa-minus" />
          </button>
        </span>
      </div>

      <!-- Empty state -->
      <div v-if="entries.length === 0" class="table-empty">
        {{ localize('DND35E.Settings.CurrencyConfig.NoCurrencies') }}
      </div>
    </div>

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
  import type { VueSettingsContext } from '@vueApps/VueSettingsMixin.mjs';
  import { computed } from 'vue';

  import type { CurrencyConfig, CurrencyEntry } from '../_types.mjs';

  const props = defineProps<{
    context: VueSettingsContext<CurrencyConfig>;
    onUpdateData: (path: string, value: unknown) => void;
  }>();

  const emit = defineEmits<{
    (e: 'submit'): void;
    (e: 'reset'): void;
  }>();

  const entries = computed(() => props.context.data.currency || []);

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function addEntry(): void {
    const newEntry: CurrencyEntry = {
      id: '',
      name: '',
      weight: 0,
      valueInGp: 0,
      group: '',
    };
    const newCurrency = [...entries.value, newEntry];
    props.onUpdateData('currency', newCurrency);
  }

  function removeEntry(index: number): void {
    const newCurrency = entries.value.filter((_, i) => i !== index);
    props.onUpdateData('currency', newCurrency);
  }

  function updateEntry(index: number, field: keyof CurrencyEntry, value: string | number): void {
    const newCurrency = entries.value.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    );
    props.onUpdateData('currency', newCurrency);
  }

  function onSubmit(): void {
    emit('submit');
  }

  function onReset(): void {
    emit('reset');
  }
</script>

<style scoped lang="scss">
  .currency-settings-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }

  .notes {
    font-style: italic;
    color: var(--color-text-dark-secondary);
    margin-bottom: 0.5rem;
  }

  .currency-table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border-light-primary);
    border-radius: 4px;
    overflow: hidden;
  }

  .table-header,
  .table-row {
    display: grid;
    grid-template-columns: minmax(60px, 1fr) minmax(100px, 2fr) minmax(70px, 1fr) minmax(80px, 1fr) minmax(100px, 2fr) 40px;
    gap: 0.5rem;
    padding: 0.5rem;
    align-items: center;
  }

  .table-header {
    background: var(--color-bg-option);
    font-weight: bold;
    border-bottom: 1px solid var(--color-border-light-primary);
  }

  .table-row {
    border-bottom: 1px solid var(--color-border-light-tertiary);

    &:last-child {
      border-bottom: none;
    }

    input {
      width: 100%;
      padding: 0.25rem;
    }
  }

  .table-empty {
    padding: 1rem;
    text-align: center;
    color: var(--color-text-dark-secondary);
    font-style: italic;
  }

  .col-actions {
    display: flex;
    justify-content: center;

    button {
      width: 24px;
      height: 24px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
      cursor: pointer;

      &.add-btn {
        background: var(--color-bg-btn-positive);
        border: 1px solid var(--color-border-positive);
        color: var(--color-text-light-highlight);
      }

      &.delete-btn {
        background: var(--color-bg-btn-negative);
        border: 1px solid var(--color-border-negative);
        color: var(--color-text-light-highlight);
      }
    }
  }

  .form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border-light-primary);
    margin-top: auto;

    button {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 1rem;
      border-radius: 3px;
      cursor: pointer;

      &.reset-btn {
        background: var(--color-bg-option);
        border: 1px solid var(--color-border-light-primary);
      }

      &.save-btn {
        background: var(--color-bg-btn-positive);
        border: 1px solid var(--color-border-positive);
        color: var(--color-text-light-highlight);
      }
    }
  }
</style>
