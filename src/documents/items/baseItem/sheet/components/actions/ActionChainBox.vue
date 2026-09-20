<template>
  <div class="action-chain-box">
    <h4 class="chain-label">{{ localize('dnd35e.WEAPON.ACTIONS.ChainLabel') }}</h4>
    <ol class="chain-link-list">
      <li
        v-for="(link, chainIndex) in chain"
        :key="chainIndex"
        class="chain-link-entry"
      >
        <ActionAccordionRow :link="link" :actionType="actionType" :actionId="link.actionId" />
      </li>
    </ol>

    <div class="add-chain-controls">
      <button type="button" class="field-control-btn add-chain-btn" @click="toggleAddPicker()">
        <i class="fa-solid fa-plus" /> {{ localize('dnd35e.WEAPON.ACTIONS.AddToChain') }}
      </button>
      <div v-if="showAddPicker" class="add-chain-picker">
        <button
          v-for="opt in ActionTypeSelectOptions"
          :key="opt.value"
          type="button"
          class="field-control-btn"
          @click="addChainLink(opt.value)"
        >
          {{ localize(opt.label) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ActionEditorStoreSymbol } from '@documents/items/baseItem/actions/ActionEditorStore.mjs';
  import type { ActionEditorStore } from '@documents/items/baseItem/actions/ActionEditorStore.mts';
  import { ActionTypeSelectOptions } from '@items/baseItem/actions/constants.mjs';
  import { inject, ref } from 'vue';

  import ActionAccordionRow from './ActionAccordionRow.vue';

  const localize = (key: string) => game.i18n.localize(key);

  const {
    getters: {
      chain,
      actionType,
    },
    actions: {
      addChainLink,
    },
  } = inject(ActionEditorStoreSymbol) as ActionEditorStore;

  const showAddPicker = ref(false);
  const toggleAddPicker = () => {
    showAddPicker.value = !showAddPicker.value;
  };
</script>

<style scoped lang="scss">
  .action-chain-box {
    margin-top: 8px;

    .chain-label {
      margin: 0 0 4px;
    }

    .chain-link-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .add-chain-controls {
      margin-top: 4px;
      position: relative;

      .add-chain-picker {
        display: flex;
        flex-direction: column;
        gap: 2px;
        position: absolute;
        z-index: 1;
        background: var(--color-cool-5, #fff);
        border: 1px solid var(--color-border-light-tertiary, #ccc);
        border-radius: 3px;
        padding: 4px;
      }
    }
  }
</style>
