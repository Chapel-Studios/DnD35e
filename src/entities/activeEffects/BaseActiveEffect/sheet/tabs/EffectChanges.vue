<template>
  <section
    class="effect-changes"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="changes"
  >
    <div class="changes-header">
      <h3>{{ changesLabel }}</h3>
      <button type="button" @click="createChange" :disabled="!isEditable" class="add-change">
        <i class="fa-solid fa-plus"></i>
        {{ addLabel }}
      </button>
    </div>
    <ol class="changes-list" data-changes>
      <li v-for="(change, index) in changes" :key="index" class="change-row" :data-index="index">
        <div class="form-fields">
          <input
            type="text"
            :name="`system.changes.${index}.key`"
            :value="change.key"
            :placeholder="keyPlaceholder"
            :disabled="!isEditable"
          />
          <select
            :name="`system.changes.${index}.type`"
            :value="change.type"
            :disabled="!isEditable"
          >
            <option v-for="(label, type) in changeTypes" :key="type" :value="type">
              {{ label }}
            </option>
          </select>
          <input
            type="text"
            :name="`system.changes.${index}.value`"
            :value="change.value"
            :placeholder="valuePlaceholder"
            :disabled="!isEditable"
          />
          <input
            type="number"
            :name="`system.changes.${index}.priority`"
            :value="change.priority"
            :placeholder="getDefaultPriority(change.type)"
            :disabled="!isEditable"
            class="priority-input"
          />
          <button type="button" @click="deleteChange(index)" :disabled="!isEditable" class="delete-change">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
  import type { ActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import { computed, inject } from 'vue';

  const store = inject('documentSheetStore') as ActiveEffectConfigStore;
  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
    isEditable,
    documentGetters: {
      changes,
    },
    documentActions: {
      // addChange,
      removeChange,
    },
  } = store;

  const isActiveTab = getIsTabOpen('changes');

  const changesLabel = game.i18n.localize('EFFECT.TABS.changes');
  const addLabel = game.i18n.localize('EFFECT.AddChange');
  const keyPlaceholder = game.i18n.localize('EFFECT.ChangeKey');
  const valuePlaceholder = game.i18n.localize('EFFECT.ChangeValue');

  const changeTypes = computed(() => {
    const types: Record<string, string> = {};
    for (const [type, config] of Object.entries(ActiveEffect.CHANGE_TYPES)) {
      types[type] = game.i18n.localize((config as { label: string }).label);
    }
    return types;
  });

  const getDefaultPriority = (type: string): string => {
    const config = ActiveEffect.CHANGE_TYPES[type] as { defaultPriority?: number } | undefined;
    return config?.defaultPriority?.toString() ?? '';
  };

  const createChange = async () => {
    // TODO: we need to either make our own app for this or tap into foundry's active effect change editor.
    
    // await addChange();
  };

  const deleteChange = async (index: number) => {
    // TODO: we need an id to reference it by
    await removeChange?.(index);
  };
</script>

<style scoped>
  .effect-changes {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .changes-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .changes-header h3 {
    margin: 0;
  }

  .add-change {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .changes-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .change-row .form-fields {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }

  .change-row input[type="text"] {
    flex: 1;
  }

  .change-row select {
    width: 120px;
  }

  .priority-input {
    width: 60px;
  }

  .delete-change {
    padding: 0.25rem 0.5rem;
  }
</style>
