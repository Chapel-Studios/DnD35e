<template>
  <section
    v-show="isActiveTab"
    class="secret-masks"
    data-group="primary"
    data-tab="masks"
  >
    <DescriptionEditor />

    <div class="masks-section">
      <div class="masks-header">
        <h3>{{ masksLabel }}</h3>
        <button
          type="button"
          class="add-mask"
          :disabled="!isEditViewMode"
          @click="createMask"
        >
          <i class="fa-solid fa-plus" />
          {{ addMaskLabel }}
        </button>
      </div>

      <p v-if="!visibleChanges.length" class="masks-empty">
        {{ emptyLabel }}
      </p>

      <ol v-else class="masks-list">
        <li
          v-for="(change, index) in visibleChanges"
          :key="index"
          class="mask-row"
        >
          <AspectPicker
            :model-value="change.key"
            :placeholder="fieldPlaceholder"
            :disabled="!isEditViewMode"
            :familiar-context="store.documentGetters.getTargetFamiliarContext(change.target ?? 'item')"
            :context-name="change.target ?? 'item'"
            @update:model-value="(val: string) => updateChangeField(index, 'key', val)"
          />

          <span class="mask-arrow">
            <i class="fa-solid fa-arrow-right" />
          </span>

          <FormulaFormGroup
            class="mask-value"
            :value="String(change.value ?? '')"
            :field-path="`system.changes.${index}.value`"
            :on-update="(val: string) => updateChangeField(index, 'value', val)"
            :disabled="!isEditViewMode"
            :contexts="getContextsForTarget(change.target ?? 'item')"
          />

          <button
            type="button"
            class="delete-mask"
            :disabled="!isEditViewMode"
            @click="deleteMask(index)"
          >
            <i class="fa-solid fa-trash" />
          </button>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { RenderModeStore, TabStore } from '@ec/CoreMixin/index.mjs';
  import { DescriptionEditor, DocumentSheetStoreSymbol, RenderModeStoreSymbol, TabStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TARGET_FIELD } from '@effects/BaseActiveEffect/data/constants.mjs';
  import { SYSTEM_CHANGE_TYPE } from '@effects/BaseActiveEffect/data/constants.mjs';
  import type { ActiveEffectConfigStore } from '@effects/BaseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
  import FormulaFormGroup from '@helpers/formulae/FormulaFormGroup.vue';
  import type { FamiliarSchema } from '@helpers/formulae/types.mts';
  import AspectPicker from '@vc/Fields/FormGroups/AspectPicker.vue';
  import { inject } from 'vue';

  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const { getIsTabOpen } = inject(TabStoreSymbol) as TabStore;
  const store = inject(DocumentSheetStoreSymbol) as ActiveEffectConfigStore;
  const {
    documentGetters: { visibleChanges },
    documentActions: { addChange, removeChange, updateChangeField },
  } = store;

  const isActiveTab = getIsTabOpen('masks');

  const masksLabel = game.i18n.localize('dnd35e.EFFECT.Secret.Masks');
  const addMaskLabel = game.i18n.localize('dnd35e.EFFECT.Secret.AddMask');
  const emptyLabel = game.i18n.localize('dnd35e.EFFECT.Secret.EmptyMasks');
  const fieldPlaceholder = game.i18n.localize('dnd35e.EFFECT.Secret.FieldPlaceholder');

  function getContextsForTarget (target: string): FamiliarSchema | undefined {
    const ctx = store.documentGetters.getTargetFamiliarContext(target);
    if (!ctx) return undefined;
    return { [target]: ctx };
  }

  const createMask = async () => {
    await addChange({
      key: '',
      type: SYSTEM_CHANGE_TYPE.MASK,
      value: '',
      phase: 'initial',
      priority: 100,
      target: EFFECT_CHANGE_TARGET.ITEM,
      targetField: EFFECT_CHANGE_TARGET_FIELD.VALUE,
      effect: null,
      isSystem: false,
    });
  };

  const deleteMask = async (index: number) => {
    await removeChange?.(index);
  };
</script>

<style lang="scss" scoped>
  .secret-masks {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .masks-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .masks-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 1rem;
    }
  }

  .add-mask {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    font-size: 0.8rem;
    cursor: pointer;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 3px;

    &:hover:not(:disabled) {
      background: var(--color-hover-bg);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }
  }

  .masks-empty {
    font-style: italic;
    opacity: 0.6;
    text-align: center;
    padding: 1rem;
  }

  .masks-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.33rem;
  }

  .mask-row {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto;
    gap: 0.5rem;
    align-items: center;
    padding: 0.25rem 0;

    &:not(:last-child) {
      border-bottom: 1px solid var(--color-border);
    }
  }

  .mask-arrow {
    opacity: 0.5;
    font-size: 0.8rem;
  }

  .mask-value {
    width: 100%;
  }

  .delete-mask {
    background: transparent;
    border: none;
    cursor: pointer;
    opacity: 0.5;
    padding: 0.25rem;

    &:hover:not(:disabled) {
      opacity: 1;
      color: var(--color-level-error, #c00);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.2;
    }
  }
</style>
