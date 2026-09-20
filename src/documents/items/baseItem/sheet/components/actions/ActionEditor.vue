<template>
  <li class="action-accordion-row" :class="{ 'is-expanded': isActionEditorOpen }">
    <div class="action-row-header" @click="toggleActionEditor()">
      <i class="fa-solid action-toggle-icon" :class="isActionEditorOpen ? 'fa-chevron-down' : 'fa-chevron-right'" />
      <span class="action-type-badge">{{ localizedActionTypeLabel }}</span>
      <span class="action-name">{{ displayName }}</span>
      <i v-if="isSystemCreated" class="fa-solid fa-wand-magic-sparkles action-auto-badge" :title="localize('dnd35e.WEAPON.ACTIONS.AutoBadge')" />

      <ActionLinkHeader />
    </div>

    <div v-if="isActionEditorOpen" class="action-editor-body">
      <FormulaFormGroup
        :label="'dnd35e.WEAPON.ACTIONS.Fields.name.label'"
        :tooltip="'dnd35e.WEAPON.ACTIONS.Fields.name.hint'"
        :value="nameFormulaData.formula"
        :field-path="getFieldPath('name.formula')"
        :contexts="familiarContexts"
        :on-update="(v) => updateActionField('name', { ...nameFormulaData, formula: v })"
        hide-field-controls
        class="grid-full-row"
      />

      <slot name="prepend" />

      <SelectFormGroup
        :label="'dnd35e.WEAPON.ACTIONS.Fields.activationCost.label'"
        :value="activationCost"
        :options="activationCostOptions"
        :field-path="getFieldPath('activationCost')"
        :on-update="(v) => updateActionField('activationCost', v)"
        hide-field-controls
      />
      <CheckBoxFormGroup
        :label="'dnd35e.WEAPON.ACTIONS.Fields.provokes.label'"
        :tooltip="'dnd35e.WEAPON.ACTIONS.Fields.provokes.hint'"
        :value="provokes"
        :field-path="getFieldPath('provokes')"
        :on-update="(v) => updateActionField('provokes', v)"
        hide-field-controls
      />
      <NumberFormGroup
        :label="'dnd35e.WEAPON.ACTIONS.Fields.maxTargets.label'"
        :tooltip="'dnd35e.WEAPON.ACTIONS.Fields.maxTargets.hint'"
        :value="maxTargets"
        :min="1"
        :field-path="getFieldPath('maxTargets')"
        :on-update="(v) => updateActionField('maxTargets', v)"
        hide-field-controls
      />

      <slot name="append" />

      <ActionChainBox />
    </div>
  </li>
</template>

<script setup lang="ts">
  import type { ActionEconomyType } from '@constants/actionEconomy.mjs';
  import { ACTION_ECONOMY_TYPES } from '@constants/actionEconomy.mjs';
  import type { ActionEditorStore } from '@documents/items/baseItem/actions/ActionEditorStore.mjs';
  import { ActionEditorStoreSymbol } from '@documents/items/baseItem/actions/ActionEditorStore.mjs';
  import { FormulaFormGroup } from '@helpers/formulae/index.mjs';
  import type { SelectOption } from '@vc/fields/index.mjs';
  import { CheckBoxFormGroup, NumberFormGroup, SelectFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import ActionChainBox from './ActionChainBox.vue';
  import ActionLinkHeader from './ActionLinkHeader.vue';

  const {
    getters: {
      activationCost,
      displayName,
      localizedActionTypeLabel,
      isSystemCreated,
      isActionEditorOpen,
      nameFormulaData,
      familiarContexts,
      provokes,
      maxTargets,
    },
    actions: {
      getFieldPath,
      toggleActionEditor,
      updateActionField,
    },
  } = inject(ActionEditorStoreSymbol) as ActionEditorStore;

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const activationCostOptions: SelectOption<ActionEconomyType>[] = ACTION_ECONOMY_TYPES.map((value) => ({
    value,
    label: `dnd35e.WEAPON.ACTIONS.ActivationCost.${value}`,
  }));
</script>

<style scoped lang="scss">
  .action-accordion-row {
    border: 1px solid var(--color-border-light-tertiary, #ccc);
    border-radius: 3px;
    margin-bottom: 4px;

    .action-row-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      cursor: pointer;

      .action-toggle-icon {
        width: 12px;
      }

      .action-type-badge {
        font-size: 0.8em;
        opacity: 0.7;
        text-transform: uppercase;
      }

      .action-name {
        flex: 1;
        font-weight: bold;
      }

      .action-auto-badge {
        opacity: 0.6;
      }

      .chain-trigger-select {
        max-width: 140px;
      }
    }

    .action-editor-body {
      // grid-column: span 2;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.66rem 0.5rem;
      
      padding: 4px 8px 8px;
      border-top: 1px solid var(--color-border-light-tertiary, #ccc);
    }
    
  }
</style>
