<template>
  <form class="d20-roll-dialog" @submit.prevent="onRoll">
    <div class="title-row full">
      <img :src="context.data.actorImage" alt="" class="actor-image" />
      <div class="title-text">
        <h3 class="value">{{ context.data.actorName}} -</h3>
        <br />
        <h4 class="label">{{ context.data.title }}</h4>
      </div>
    </div>
    <div class="base-row subgrid">
      <span class="label">{{ context.data.baseLabel }}</span>
      <span class="value">{{ formatBonus(context.data.baseTotal) }}</span>
    </div>

    <div class="form-group subgrid">
      <label for="situational-modifier">{{ localize('dnd35e.ROLL.SituationalModifier') }}</label>
      <input
        id="situational-modifier"
        v-model.number="context.data.situationalModifier"
        type="number"
        step="1"
      >
    </div>

    <div class="total-row subgrid">
      <span class="label">{{ localize('dnd35e.ROLL.Total') }}</span>
      <span class="value">{{ formatBonus(total) }}</span>
    </div>

    <footer class="form-footer full">
      <div class="form-group roll-mode">
        <label for="roll-mode">{{ localize('dnd35e.COMMON.RollMode') }}</label>
        <select id="roll-mode" v-model="context.data.rollMode">
          <option v-for="mode in rollModes" :key="mode.value" :value="mode.value">
            {{ localize(mode.label) }}
          </option>
        </select>
      </div>
      <div class="form-controls">
        <button type="button" class="cancel-btn" @click="context.cancel()">
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
  import type { VueDialogContext } from '@vueApps/VueDialogMixin.mjs';
  import { computed } from 'vue';

  import type { D20RollDialogData, D20RollDialogResult } from './D20RollDialogConfig.mjs';

  const props = defineProps<{
    context: VueDialogContext<D20RollDialogData, D20RollDialogResult>;
  }>();

  const rollModes = Object.entries(CONFIG.ChatMessage.modes).map(([value, mode]) => ({ value, label: mode.label }));

  const total = computed(() => props.context.data.baseTotal + (props.context.data.situationalModifier || 0));

  function formatBonus(n: number): string {
    return n >= 0 ? `+${n}` : `${n}`;
  }

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function onRoll(): void {
    props.context.resolve({
      situationalModifier: props.context.data.situationalModifier || 0,
      rollMode: props.context.data.rollMode,
    });
  }
</script>

<style scoped lang="scss">
  .d20-roll-dialog {
    display: grid;
    grid-template-columns: minmax(min-content, 3fr) 2fr;
    gap: 0.75rem;
    padding: 0.5rem;

    & > * {
      padding: 0 0.75rem;
    }
    
    .subgrid {
      display: grid;
      grid-template-columns: subgrid;
      grid-column: span 2;
      align-items: center;
    }
    
    .full {
      grid-column: span 2;
    }

    input {
      width: 50%;
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
    display: flex;
    max-height: 3.25rem;;

    h3, h4 {
      margin: 0;
      display: inline;
    }
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

    label {
      font-weight: 500;
      font-size: 0.9rem;
    }
  }

  .form-controls {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .roll-mode {
    display: grid;
    grid-template-columns: minmax(max-content, 1fr) 2fr;
    align-items: center;
    gap: 1.5rem;
  }

  .form-footer {
    display: grid;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);

    button {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 1rem;
      border-radius: 3px;
      cursor: pointer;
      border: 1px solid var(--color-border);
    }
  }
</style>
