<template>
  <form class="d20-roll-dialog" @submit.prevent="onRollClick">
    <div class="options">
      <div class="title-row subgrid">
        <ActorRollHeader
          :header="localize('dnd35e.ROLL.Attacker')"
          :image="actorImage"
          :name="actorName"
        >
          <!-- <h4 class="label">{{ dialogTitle }}</h4> -->
        </ActorRollHeader>

        <slot name="header" />
      </div>
      
      <slot />

      <div v-if="!hideTotal" class="total-row subgrid">
        <span class="label">{{ localize('dnd35e.ROLL.Total') }}</span>
        <span class="value">{{ totalFormula }}</span>
      </div>
    </div>
    <footer class="form-footer full">
      <div class="form-group roll-mode">
        <label for="roll-mode">{{ localize('dnd35e.COMMON.RollMode') }}</label>
        <select id="roll-mode" v-model="rollMode">
          <option v-for="mode in rollModes" :key="mode.value" :value="mode.value">
            {{ localize(mode.label) }}
          </option>
        </select>
      </div>
      <div class="form-controls">
        <button type="button" class="cancel-btn" @click="actions.cancel()">
          {{ localize('Cancel') }}
        </button>
        <button type="submit" class="roll-btn">
          <i class="fas fa-dice-d20" />
          {{ localize('dnd35e.ROLL.RollButton') }}
        </button>
      </div>
    </footer>
  </form>
</template>

<script setup lang="ts">
  import { inject } from 'vue';

  import ActorRollHeader from './ActorRollHeader.vue';
  import type { RollDialogStore } from './RollDialogStore.mjs';
  import { RollDialogStoreSymbol } from './RollDialogStore.mjs';

  // `hideTotal` lets dialogs with their own per-box live totals (e.g. Weapon Attack's
  // to-hit/damage boxes) suppress this generic single-total row.
  defineProps<{ hideTotal?: boolean }>();

  const {
    actor: {
      image: actorImage,
      name: actorName,
    },
    app: {
      rollMode,
      totalFormula,
    },
    actions,
  } = inject(RollDialogStoreSymbol) as RollDialogStore;

  const rollModes = Object.entries(CONFIG.ChatMessage.modes).map(([value, mode]) => ({ value, label: mode.label }));

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function onRollClick(): void {
    actions.commitPendingEdits();
    actions.roll();
  }
</script>

<style scoped lang="scss">
  .d20-roll-dialog {
    display: grid;
    grid-template-rows: min-content 1fr;
    height: 100%;
  }

  .options {
    display: grid;
    grid-template-columns: minmax(min-content, 3fr) 2fr;
    gap: 0.75rem;
    margin-bottom: 1rem;

    .full {
      grid-column: span 2;
    }
  }

  .base-row, .total-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;

    .label {
      font-weight: 500;
    }
  }

  .title-row {
    // display: grid;
    grid-auto-flow: column;
    // grid-template-columns: 50% 50%;
    // gap: 1rem;

    // .actor-image {
    //   max-width: 3.25rem;
    // }

    // h3, h4 {
    //   margin: 0;
    //   display: inline;
    // }
  }

  .total-row {
    font-size: 1.2rem;
    font-weight: 700;
    border-top: 1px solid var(--color-border);
    padding-top: 0.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    &.roll-mode {
      display: grid;
      grid-auto-flow: column;
      align-items: center;
    }

    label {
      font-weight: 500;
      font-size: 0.9rem;
    }
  }

  .form-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 0.75rem;

    .form-controls {
      display: flex;
      gap: 0.5rem;
    }
  }
</style>
