<template>
  <section
    class="effect-changes"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="changes"
  >
    <div class="changes-header">
      <h3>{{ changesLabel }}</h3>
      <button type="button" @click="createChange" :disabled="!isEditViewMode" class="add-change">
        <i class="fa-solid fa-plus"></i>
        {{ addLabel }}
      </button>
    </div>
    <ol class="changes-list" data-changes>
      <li
        v-for="(change, index) in visibleChanges"
        :key="index" class="change-row"
        :data-index="index"
      >
        <div class="form-fields">
          <input
            type="text"
            :name="`system.changes.${index}.key`"
            :value="change.key"
            :placeholder="keyPlaceholder"
            :disabled="!isEditViewMode || change.isSystem"
          />
          <select
            :name="`system.changes.${index}.type`"
            :value="change.type"
            :disabled="!isEditViewMode"
          >
            <option v-for="(label, type) in changeTypes" :key="type" :value="type">
              {{ label }}
            </option>
          </select>
          <EffectChangeValue
            :change="change"
            :index="index"
          />
          <select
            :name="`system.changes.${index}.target`"
            :value="change.target ?? 'item'"
            :disabled="!isEditViewMode || change.isSystem"
            class="target-select"
            :title="targetLabel"
          >
            <option v-for="(label, target) in changeTargets" :key="target" :value="target">
              {{ label }}
            </option>
          </select>
          <input
            type="number"
            :name="`system.changes.${index}.priority`"
            :value="change.priority"
            :placeholder="getDefaultPriority(change.type)"
            :disabled="!isEditViewMode || change.isSystem"
            class="priority-input"
          />
          <button type="button" @click="deleteChange(index)" :disabled="!isEditViewMode || change.isSystem" class="delete-change">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol, RenderModeStore, RenderModeStoreSymbol, TabStore, TabStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { ActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TARGET_FIELD, EFFECT_CHANGE_TARGETS, EFFECT_CHANGE_TYPE, EffectChangeValue } from '@effects/BaseActiveEffect/index.mjs';
  import { UNIDENTIFIED } from '@helpers/formulae/types.mjs';
  import { computed, inject } from 'vue';

  const { isEditViewMode, identifiedViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const { getIsTabOpen } = inject(TabStoreSymbol) as TabStore;
  const store = inject(DocumentSheetStoreSymbol) as ActiveEffectConfigStore;
  const {
    documentGetters: {
      visibleChanges,
    },
    documentActions: {
      addChange,
      removeChange,
    },
  } = store;

  const isActiveTab = getIsTabOpen('changes');

  const changesLabel = game.i18n.localize('EFFECT.TABS.changes');
  const addLabel = game.i18n.localize('EFFECT.AddChange');
  const keyPlaceholder = game.i18n.localize('EFFECT.ChangeKey');
  const targetLabel = game.i18n.localize('D35E.EffectChangeTarget.Target');

  const changeTypes = computed(() => {
    const types: Record<string, string> = {};
    for (const [type, config] of Object.entries(ActiveEffect.CHANGE_TYPES)) {
      types[type] = game.i18n.localize((config as { label: string }).label);
    }
    return types;
  });

  const changeTargets = computed(() => {
    const targets: Record<string, string> = {};
    for (const [target, label] of Object.entries(EFFECT_CHANGE_TARGETS)) {
      targets[target] = game.i18n.localize(label);
    }
    return targets;
  });

  const getDefaultPriority = (type: string): string => {
    const config = ActiveEffect.CHANGE_TYPES[type] as { defaultPriority?: number } | undefined;
    return config?.defaultPriority?.toString() ?? '';
  };

  const createChange = async () => {
    const targetField = identifiedViewMode.value === UNIDENTIFIED
      ? EFFECT_CHANGE_TARGET_FIELD.UNIDENTIFIED
      : EFFECT_CHANGE_TARGET_FIELD.VALUE;
    await addChange({
      key: '',
      type: EFFECT_CHANGE_TYPE.ADD,
      value: '',
      phase: 'initial',
      priority: 10,
      target: EFFECT_CHANGE_TARGET.ITEM,
      targetField,
      effect: null,
      isSystem: false,
    });
  };

  const deleteChange = async (index: number) => {
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
    display: grid;
    grid-template-columns: 1fr max-content max-content max-content auto 100px;
    gap: 0.25rem;
    align-items: center;
  }

  .change-row input[type="text"] {
    flex: 1;
  }

  .change-row select {
    width: 120px;
  }

  .target-select {
    width: 80px;
  }

  .priority-input {
    width: 60px;
  }

  .delete-change {
    padding: 0.25rem 0.5rem;
  }
</style>
