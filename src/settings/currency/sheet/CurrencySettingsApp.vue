<template>
  <div class="currency-settings-form">
    <p class="notes">{{ localize('dnd35e.SETTINGS.CurrencyConfig.Instructions') }}</p>

    <!-- Coinage Table -->
    <div class="coinage-table">
      <!-- Header -->
      <div class="table-header">
        <span class="col-id">{{ localize('dnd35e.SETTINGS.CurrencyConfig.Id') }}</span>
        <span class="col-label">{{ localize('dnd35e.SETTINGS.CurrencyConfig.Label') }}</span>
        <span class="col-short">{{ localize('dnd35e.SETTINGS.CurrencyConfig.ShortLabel') }}</span>
        <span class="col-value">{{ localize('dnd35e.SETTINGS.CurrencyConfig.ValueInGp') }}</span>
        <span class="col-weight">{{ localize('dnd35e.SETTINGS.CurrencyConfig.Weight') }}</span>
        <span class="col-actions">
          <button type="button" class="add-btn" @click="addNewCoinage" :title="localize('dnd35e.COMMON.Add')">
            <i class="fas fa-plus" />
          </button>
        </span>
      </div>

      <!-- Coinage Rows -->
      <CoinageRow
        v-for="(coinage, index) in coinages" 
        :key="coinage.id || index" 
        :coinage="coinage"
        :existing-ids="existingIds"
        @update-coinage="updateCoinage"
        @delete-coinage="removeCoinage"
      />

      <!-- Empty state -->
      <div v-if="coinages.length === 0" class="table-empty">
        {{ localize('dnd35e.SETTINGS.CurrencyConfig.NoCurrencies') }}
      </div>
    </div>

    <!-- Global Settings -->
    <div class="global-settings">
      <div class="setting-row">
        <label>{{ localize('dnd35e.SETTINGS.CurrencyConfig.DefaultDisplayCoin') }}</label>
        <select v-model="defaultDisplayCoin">
          <option v-for="coin in enabledCoinages" :key="coin.id" :value="coin.id">
            {{ coin.label }} ({{ coin.shortLabel }})
          </option>
        </select>
      </div>
      <div class="setting-row">
        <label>{{ localize('dnd35e.SETTINGS.CurrencyConfig.RollUpMaximum') }}</label>
        <select v-model="rollUpTargetCoin">
          <option v-for="coin in enabledCoinages" :key="coin.id" :value="coin.id">
            {{ coin.label }} ({{ coin.shortLabel }})
          </option>
        </select>
      </div>
    </div>

    <!-- Footer -->
    <footer class="form-footer">
      <button type="button" class="reset-btn" @click="onReset">
        <i class="fas fa-undo" />
        {{ localize('dnd35e.SETTINGS.Reset') }}
      </button>
      <button type="submit" class="save-btn" @click.prevent="saveConfig">
        <i class="fas fa-save" />
        {{ localize('dnd35e.SETTINGS.Save') }}
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
  import { stripSpecialCharacters } from '@helpers/stringHelpers.mjs';
  import { SYSTEM_ID } from '@settings/shared.mjs';
  import type { SettingsStore } from '@settings/shared/sheet/settingsStore.mjs';
  import { SettingsStoreSymbol } from '@settings/shared/sheet/settingsStore.mjs';
  import type { VueSettingsContext } from '@vueApps/VueSettingsMixin.mjs';
  import { computed, inject, ref, watch } from 'vue';

  import { CURRENCY_KEY, DEFAULT_CURRENCY_CONFIG, USER_COIN_PREFIX } from '../constants.mjs';
  import type { CoinageDefinition, CurrencyConfig } from '../types.mjs';
  import { coinageVisibilityEveryone } from '../types.mjs';
  import CoinageRow from './CoinageRow.vue';
  import { AUTO_ID_PREFIX } from './idFieldUtils.mjs';

  const {
    measurement: {
      convertToStoredWeight,
      convertToLocalizedWeight,
    },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const props = defineProps<{
    context: VueSettingsContext<CurrencyConfig>;
    onUpdateData: (path: string, value: unknown) => void;
  }>();

  const coinages = ref((props.context.data.coinages || []).map(c => ({
    ...c,
    weightLbs: convertToLocalizedWeight(c.weightLbs),
  })));
  const defaultDisplayCoin = ref(props.context.data.defaultDisplayCoin || 'srd_gp');
  const rollUpTargetCoin = ref(props.context.data.rollUpTargetCoin || 'srd_gp');
  const autoIdCounter = ref(props.context.data.autoIdCounter || 0);
  const enabledCoinages = computed(() => coinages.value.filter((c: CoinageDefinition) => c.enabled));

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const existingIds = computed((): string[] => {
    return coinages.value.map(c => c.id);
  });

  // ─── Coinage CRUD ───────────────────────────────────────────────────────────
  const getNewAutoId = (): string => {
    return `${USER_COIN_PREFIX}${++autoIdCounter.value}${AUTO_ID_PREFIX}`;
  };
  function addNewCoinage(): void {
    const newCoinage: CoinageDefinition = {
      id: getNewAutoId(),
      label: '',
      shortLabel: '',
      valueInGp: 1,
      weightLbs: 0.02,
      isSystem: false,
      enabled: true,
      visibility: coinageVisibilityEveryone,
      excludeFromRollUp: false,
    };

    coinages.value = [...coinages.value, newCoinage];
  }

  function removeCoinage(id: string): void {
    const coinage = coinages.value.find(c => c.id === id);
    if (!coinage || coinage.isSystem) return; // Can't delete system coins
    coinages.value = coinages.value.filter(c => c.id !== id);
  }

  function updateCoinage(updateData: CoinageDefinition, oldId: string): void {
    // Find by oldId, not new id, to support id changes
    const index = coinages.value.findIndex(c => c.id === oldId);
    if (index === -1 || coinages.value[index].isSystem) return; // Can't update system coins
    coinages.value = coinages.value.map((c, i) => i === index ? updateData : c);
  }

  watch(coinages, () => {
    // If the currently selected default or roll-up coin is disabled or deleted, reset to first enabled coin
    if (!enabledCoinages.value.find(c => c.id === defaultDisplayCoin.value)) {
      defaultDisplayCoin.value = enabledCoinages.value[0]?.id || '';
    }
    if (!enabledCoinages.value.find(c => c.id === rollUpTargetCoin.value)) {
      rollUpTargetCoin.value = enabledCoinages.value[0]?.id || '';
    }
  }, { deep: true });

  const validateConfig = (): boolean => {
    // Basic validation: check for duplicate IDs and required fields
    const ids = coinages.value.map(c => c.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      foundry.ui.notifications.warn(localize('dnd35e.SETTINGS.CurrencyConfig.DuplicateId'));
      return false;
    }

    for (const coinage of coinages.value) {
      if (!coinage.id && coinage.label) {
        coinage.id = `${getNewAutoId()}${stripSpecialCharacters(coinage.label).toLocaleLowerCase()}`;
      }

      if (!coinage.label || coinage.valueInGp == null || coinage.shortLabel == null) {
        foundry.ui.notifications.warn(localize('dnd35e.SETTINGS.CurrencyConfig.RequiredFields'));
        return false;
      }

      if (coinage.weightLbs === null || coinage.weightLbs === undefined || isNaN(coinage.weightLbs) || coinage.weightLbs < 0) {
        coinage.weightLbs = 0; // default to 0 if invalid
        return false;
      }
    }

    return true;
  };

  const saveConfig = async (e: Event) => {
    e.preventDefault();
    if (!validateConfig()) return;

    const updatedConfig: CurrencyConfig = {
      coinages: coinages.value.map(c => ({
        ...c,
        weightLbs: convertToStoredWeight(c.weightLbs),
      })),
      defaultDisplayCoin: defaultDisplayCoin.value,
      rollUpTargetCoin: rollUpTargetCoin.value,
      autoIdCounter: autoIdCounter.value,
    };
    try {
      await game.settings.set(SYSTEM_ID, CURRENCY_KEY, updatedConfig);

      foundry.ui.notifications.info(game.i18n.localize('dnd35e.SETTINGS.ChangesSaved'));
    } catch (error) {
      console.error('Failed to save currency settings:', error);
      foundry.ui.notifications.error(game.i18n.localize('dnd35e.SETTINGS.SaveError'));
    }

    props.context.close();
  };

  const onReset = async (event: Event): Promise<void> => {
    event.preventDefault();

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('dnd35e.SETTINGS.ResetConfirm.Title') },
      content: `
        <p>${game.i18n.localize('dnd35e.SETTINGS.ResetConfirm.Content')}</p>
        <p style="color:var(--color-level-error);font-weight:bold;">
          ${game.i18n.localize('dnd35e.SETTINGS.CurrencyConfig.ResetIrreversible')}
        </p>
      `,
      yes: {
        label: game.i18n.localize('dnd35e.SETTINGS.Reset'),
        icon: 'fas fa-undo',
      },
      no: {
        label: game.i18n.localize('Cancel'),
      },
    });

    if (!confirmed) return;

    coinages.value = foundry.utils
      .deepClone(DEFAULT_CURRENCY_CONFIG.coinages)
      .map(c => ({ ...c, enabled: true }));
    defaultDisplayCoin.value = 'srd_gp';
    rollUpTargetCoin.value = 'srd_gp';
  };
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
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .global-settings {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--color-select-option-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;

    .setting-row {
      display: flex;
      align-items: center;
      gap: 1rem;

      label {
        flex: 0 0 200px;
        font-weight: 500;
      }

      select {
        flex: 1;
        max-width: 200px;
      }
    }
  }

  .coinage-table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
    flex: 1;
    overflow-y: auto;
  }

  .table-header,
  .table-row {
    display: grid;
    grid-template-columns: 100px 1fr 60px 80px 70px 70px;
    gap: 0.5rem;
    padding: 0.5rem;
    align-items: center;
  }

  .table-header {
    background: var(--color-select-option-bg);
    font-weight: bold;
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .table-row {
    border-bottom: 1px solid var(--color-border);

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
      width: 100%;
      padding: 0.25rem;

      &:disabled,
      &:read-only {
        background: var(--color-select-option-bg);
        cursor: not-allowed;
      }
    }
  }

  .table-empty {
    padding: 1rem;
    text-align: center;
    color: var(--color-text-secondary);
    font-style: italic;
  }


  .add-btn {
    // background: var(--color-level-success);
    // border: 1px solid var(--color-border);
    border: 1px solid var(--color-level-success-border);
    color: var(--color-level-success);
    // color: var(--color-text-primary);

    &:hover {
      background: var(--color-level-success);
      color: var(--color-text-primary);
    }
  }

  // .delete-btn {
  //   color: var(--color-level-error);
  // }

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
        // background: var(----color-level-success);
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
      }
    }
  }
</style>
