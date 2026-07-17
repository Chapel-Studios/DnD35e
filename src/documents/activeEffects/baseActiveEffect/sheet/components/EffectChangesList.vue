<template>
  <div
    class="changes-list-panel"
    :class="`changes-list-panel--${props.variant}`"
  >
    <div class="changes-header">
      <h3>{{ resolvedTitle }}</h3>
      <button type="button" @click="createChange" :disabled="!isEditMode" class="add-change">
        <i class="fa-solid fa-plus"></i>
        {{ resolvedAddLabel }}
      </button>
    </div>

    <p v-if="!visibleChanges.length && resolvedEmptyLabel" class="changes-empty">
      {{ resolvedEmptyLabel }}
    </p>

    <ol v-else class="changes-list" data-changes>
      <li
        v-for="(change, index) in visibleChanges"
        v-show="isChangeVisible(index)"
        :key="index"
        class="change-row"
        :class="`change-row--${props.variant}`"
        :data-index="index"
      >
        <div class="form-fields">
          <AspectPicker
            :model-value="change.key"
            :placeholder="resolvedKeyPlaceholder"
            :disabled="!isChangeEditable(index) || change.isSystem"
            :familiar-context="store.documentGetters.getTargetFamiliarContext(change.target ?? 'item')"
            :context-name="store.documentGetters.getTargetFamiliarContextName(change.target ?? 'item')"
            @update:model-value="(val: string) => updateChangeKey(index, val)"
          />

          <span v-if="props.variant === 'mask'" class="mask-arrow">
            <i class="fa-solid fa-arrow-right" />
          </span>

          <select
            v-if="props.variant === 'default'"
            :name="`system.changes.${index}.type`"
            :value="change.type"
            :disabled="!isChangeEditable(index) || change.isSystem"
            @change="(e: Event) => updateChangeField(index, 'type', (e.target as HTMLSelectElement).value)"
          >
            <option v-for="(label, type) in changeTypes" :key="type" :value="type">
              {{ label }}
            </option>
          </select>

          <FormulaFormGroup
            class="change-value"
            :value="String(change.value ?? '')"
            :field-path="`system.changes.${index}.value`"
            :on-update="(val: string) => updateChangeField(index, 'value', val)"
            :disabled="!isChangeEditable(index) || change.isSystem"
            :contexts="getContextsForTarget(change.target ?? 'item')"
            hide-field-controls
          />

          <select
            v-if="props.variant === 'default' && props.showBonusType"
            :name="`system.changes.${index}.bonusType`"
            :value="change.bonusType ?? ''"
            :disabled="!isChangeEditable(index) || change.isSystem"
            class="bonus-type-select"
            :title="bonusTypeLabel"
            @change="(e: Event) => updateChangeField(index, 'bonusType', (e.target as HTMLSelectElement).value || null)"
          >
            <option value="">{{ noneLabel }}</option>
            <option v-for="bt in bonusTypeOptions" :key="bt.value" :value="bt.value">
              {{ bt.label }}
            </option>
          </select>

          <select
            v-if="props.variant === 'default'"
            :name="`system.changes.${index}.target`"
            :value="change.target ?? 'item'"
            :disabled="!isChangeEditable(index) || change.isSystem"
            class="target-select"
            :title="targetLabel"
            @change="(e: Event) => updateChangeField(index, 'target', (e.target as HTMLSelectElement).value)"
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
            :disabled="!isChangeEditable(index) || change.isSystem"
            class="priority-input"
            max="3000"
          />

          <FieldControls
            v-if="props.showChangeFieldControls"
            class="change-controls"
            :field-path="changeFieldPath(index)"
            :read-only="change.isSystem"
          >
            <button type="button" @click="deleteChange(index)" :disabled="!isChangeEditable(index) || change.isSystem" class="delete-change field-control-btn">
              <i class="fa-solid fa-trash"></i>
            </button>
          </FieldControls>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
  import { BONUS_TYPES } from '@constants/bonusTypes.mjs';
  import type { RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
  import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TARGETS, EFFECT_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
  import type { ActiveEffectConfigStore } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
  import FormulaFormGroup from '@helpers/formulae/FormulaFormGroup.vue';
  import type { FamiliarSchema } from '@helpers/formulae/types.mts';
  import AspectPicker from '@vc/fields/formGroups/AspectPicker.vue';
  import FieldControls from '@vc/fields/formGroups/FieldControls.vue';
  import { computed, inject } from 'vue';

  const props = withDefaults(defineProps<{
    title?: string;
    addLabel?: string;
    emptyLabel?: string;
    keyPlaceholder?: string;
    variant?: 'default' | 'mask';
    showBonusType?: boolean;
    showChangeFieldControls?: boolean;
    createChangeData?: Partial<EffectChangeDataDnd35e>;
  }>(), {
    title: undefined,
    addLabel: undefined,
    emptyLabel: undefined,
    keyPlaceholder: undefined,
    variant: 'default',
    showBonusType: true,
    showChangeFieldControls: true,
    createChangeData: undefined,
  });

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const store = inject(DocumentSheetStoreSymbol) as ActiveEffectConfigStore;
  const {
    documentGetters: {
      visibleChanges,
      getIsFieldEditable,
      getIsFieldVisible,
    },
    documentActions: {
      addChange,
      removeChange,
      updateChangeField,
    },
  } = store;

  const targetLabel = game.i18n.localize('dnd35e.EFFECT.ChangeTarget.Target');
  const bonusTypeLabel = game.i18n.localize('dnd35e.EFFECT.BonusType.Label');
  const noneLabel = game.i18n.localize('dnd35e.EFFECT.BonusType.None');
  const resolvedTitle = computed(() => props.title ?? game.i18n.localize('EFFECT.TABS.changes'));
  const resolvedAddLabel = computed(() => props.addLabel ?? game.i18n.localize('EFFECT.AddChange'));
  const resolvedEmptyLabel = computed(() => props.emptyLabel ?? '');
  const resolvedKeyPlaceholder = computed(() => props.keyPlaceholder ?? game.i18n.localize('EFFECT.ChangeKey'));

  const changeFieldPath = (index: number): string => `system.changes.${index}`;
  const isChangeVisible = (index: number): boolean => getIsFieldVisible(changeFieldPath(index)).value;
  const isChangeEditable = (index: number): boolean => getIsFieldEditable(changeFieldPath(index)).value;

  function getContextsForTarget (target: string): FamiliarSchema | undefined {
    const ctx = store.documentGetters.getTargetFamiliarContext(target);
    if (!ctx) return undefined;
    return { [store.documentGetters.getTargetFamiliarContextName(target)]: ctx };
  }

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

  const bonusTypeOptions = computed(() =>
    BONUS_TYPES.map((bt) => ({
      value: bt,
      label: game.i18n.localize(bt),
    }))
  );

  const getDefaultPriority = (type: string): string => {
    const config = ActiveEffect.CHANGE_TYPES[type] as { defaultPriority?: number } | undefined;
    return config?.defaultPriority?.toString() ?? '';
  };

  const createChange = async () => {
    await addChange({
      key: '',
      type: EFFECT_CHANGE_TYPE.ADD,
      value: '',
      phase: 'initial',
      priority: 10,
      target: EFFECT_CHANGE_TARGET.ITEM,
      isSystem: false,
      ...props.createChangeData,
    });
  };

  const deleteChange = async (index: number) => {
    await removeChange?.(index);
  };

  // Domain callback: each editor row targets a specific indexed change entry.
  const updateChangeKey = async (index: number, val: string) => {
    await updateChangeField(index, 'key', val);
  };
</script>

<style scoped lang="scss">
  .changes-list-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .changes-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
    }
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

  .changes-empty {
    padding: 1rem;
    font-style: italic;
    opacity: 0.6;
    text-align: center;
  }

  .change-row {
    input[type="text"] {
      flex: 1;
    }

    select {
      width: 120px;
    }
    
    :deep(.change-value.form-group) {
      display: flex;
    }

    &--default {
      .form-fields {
        display: grid;
        grid-template-columns: 1fr max-content max-content max-content auto 100px;
        gap: 0.25rem;
        align-items: center;
      }

      &:has(.bonus-type-select) {
        .form-fields {
          grid-template-columns: 1fr max-content max-content max-content max-content auto 100px;
        }
      }

    }

    &--mask {
      .form-fields {
        display: grid;
        grid-template-columns: 1fr auto 1fr 60px auto;
        gap: 0.5rem;
        align-items: center;
        padding: 0.25rem 0;
      }

      &:not(:last-child) {
        .form-fields {
          border-bottom: 1px solid var(--color-border);
        }
      }
    }
  }

  .target-select {
    width: 80px;
  }

  .bonus-type-select {
    width: 100px;
  }

  .priority-input {
    width: 60px;
  }

  .mask-arrow {
    opacity: 0.5;
    font-size: 0.8rem;
  }

  .delete-change {
    padding: 0.25rem 0.5rem;
  }
</style>