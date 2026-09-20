<template>
  <div  @click.stop.prevent v-if="!!link">
    <SelectFormGroup
      :label="'dnd35e.WEAPON.ACTIONS.Fields.trigger.label'"
      :value="link?.trigger ?? ACTION_TRIGGER.ALWAYS"
      :options="ActionTriggerSelectOptions"
      :fieldPath="getFieldPath('trigger')"
      :onUpdate="(v) => updateTrigger(v ?? ACTION_TRIGGER.ALWAYS)"
    />
    <button
      type="button"
      class="field-control-btn chain-remove-btn"
      :title="localize('dnd35e.WEAPON.ACTIONS.RemoveChainLink')"
      @click.stop="removeChainLink"
    >
      <i class="fa-solid fa-trash" />
    </button>
  </div>
</template>
<script setup lang="ts">
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import type { ActionEditorStore } from '@items/baseItem/actions/ActionEditorStore.mts';
  import { ACTION_TRIGGER, ActionTriggerSelectOptions } from '@items/baseItem/actions/constants.mjs';
  import { SelectFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const {
    getters: { link },
    actions: { updateTrigger, updateLink, getFieldPath },
  } = inject(ActionEditorStoreSymbol) as ActionEditorStore;
  
  const removeChainLink = () => {
    if (!link?.value) return;
    updateLink(link.value, true);
  };

  function localize(key: string): string {
    return game.i18n.localize(key);
  }
</script>
