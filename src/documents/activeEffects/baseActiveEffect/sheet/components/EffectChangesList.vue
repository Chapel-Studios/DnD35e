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

    <ol
      v-else
      class="changes-list"
      :class="`changes-list--${props.variant}`"
      :style="{ gridTemplateColumns: gridColumns }"
      data-changes
    >
      <li class="changes-table-header">
        <span v-if="props.variant === 'default'" class="col-header">{{ targetLabel }}</span>
        <span class="col-header">{{ keyHeaderLabel }}</span>
        <span v-if="props.variant === 'mask'" class="col-header" />
        <span v-if="props.variant === 'default'" class="col-header">{{ typeHeaderLabel }}</span>
        <span class="col-header">{{ valueHeaderLabel }}</span>
        <span v-if="props.variant === 'default' && props.showBonusType" class="col-header">{{ bonusTypeLabel }}</span>
        <span v-if="props.variant === 'default'" class="col-header">{{ conditionHeaderLabel }}</span>
        <span class="col-header">{{ priorityHeaderLabel }}</span>
        <span v-if="props.showChangeFieldControls" class="col-header">{{ controlsHeaderLabel }}</span>
      </li>

      <li
        v-for="(change, index) in visibleChanges"
        v-show="isChangeVisible(index)"
        :key="index"
        class="change-row"
        :data-index="index"
      >
        <div class="form-fields">
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

          <AspectPicker
            :model-value="change.key"
            :placeholder="resolvedKeyPlaceholder"
            :disabled="!isChangeEditable(index) || change.isSystem"
            :familiar-context="store.documentGetters.getTargetFamiliarContext(change.target ?? 'item')"
            :context-name="store.documentGetters.getTargetFamiliarContextName(change.target ?? 'item')"
            hide-context-hint
            @update:model-value="(val: string) => updateChangeKey(index, val)"
            @update:error="(err: string | null) => setRowError(index, 'field', err)"
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
            :expected-type="getExpectedTypeForChange(change)"
            hide-field-controls
            hide-context-hint
            @update:error="(err: string | null) => setRowError(index, 'value', err)"
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

          <FormulaFormGroup
            v-if="props.variant === 'default'"
            class="change-condition"
            :value="String(change.condition ?? '')"
            expected-type="boolean"
            :field-path="`system.changes.${index}.condition`"
            :on-update="(val: string) => updateChangeField(index, 'condition', val || null)"
            :disabled="!isChangeEditable(index) || change.isSystem"
            :contexts="getContextsForTarget(change.target ?? 'item')"
            hide-field-controls
            hide-label
            hide-context-hint
            @update:error="(err: string | null) => setRowError(index, 'condition', err)"
          />

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

        <div v-if="getRowContextText(index, change)" class="row-context" :class="{ 'has-error': hasRowError(index) }">
          {{ getRowContextText(index, change) }}
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
  import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TARGETS, EFFECT_CHANGE_TYPE, SYSTEM_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
  import type { ActiveEffectConfigStore } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
  import FormulaFormGroup from '@helpers/formulae/FormulaFormGroup.vue';
  import type { FamiliarSchema } from '@helpers/formulae/types.mts';
  import { findAspectByAccessPath } from '@helpers/formulae/utils.mjs';
  import AspectPicker from '@vc/fields/formGroups/AspectPicker.vue';
  import FieldControls from '@vc/fields/formGroups/FieldControls.vue';
  import { computed, inject, reactive } from 'vue';

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
  const keyHeaderLabel = game.i18n.localize('dnd35e.EFFECT.Headers.Field');
  const typeHeaderLabel = game.i18n.localize('dnd35e.EFFECT.Headers.Type');
  const valueHeaderLabel = game.i18n.localize('dnd35e.EFFECT.Headers.Value');
  const conditionHeaderLabel = game.i18n.localize('dnd35e.EFFECT.Headers.Condition');
  const priorityHeaderLabel = game.i18n.localize('dnd35e.EFFECT.Headers.Priority');
  const controlsHeaderLabel = game.i18n.localize('dnd35e.EFFECT.Headers.Actions');

  // The Changes list renders as a single shared CSS grid (header row + each
  // change row are `display: contents`, see <style>) so columns stay aligned
  // like a real table. The column count/order must exactly match what's
  // rendered per-row for the current variant/props — kept in sync here.
  const gridColumns = computed(() => {
    if (props.variant === 'mask') {
      const cols = ['1fr', 'max-content', '1fr', 'max-content']; // Key, arrow, Value, Priority
      if (props.showChangeFieldControls) cols.push('max-content');
      return cols.join(' ');
    }
    const cols = ['max-content', '1fr', 'max-content', '1fr']; // Target, Key, Type, Value
    if (props.showBonusType) cols.push('max-content'); // BonusType
    cols.push('1fr'); // Condition
    cols.push('max-content'); // Priority
    if (props.showChangeFieldControls) cols.push('max-content'); // Controls
    return cols.join(' ');
  });
  const resolvedTitle = computed(() => props.title ?? game.i18n.localize('EFFECT.TABS.changes'));
  const resolvedAddLabel = computed(() => props.addLabel ?? game.i18n.localize('EFFECT.AddChange'));
  const resolvedEmptyLabel = computed(() => props.emptyLabel ?? '');
  const resolvedKeyPlaceholder = computed(() => props.keyPlaceholder ?? game.i18n.localize('EFFECT.ChangeKey'));

  const changeFieldPath = (index: number): string => `system.changes.${index}`;
  const isChangeVisible = (index: number): boolean => getIsFieldVisible(changeFieldPath(index)).value;
  const isChangeEditable = (index: number): boolean => getIsFieldEditable(changeFieldPath(index)).value;

  // Value/Condition formulas may reference both the change's target (item/actor)
  // AND the effect document itself ("Self") — e.g. a Material AE's Value formula
  // referencing its own #Self.MagicEquivalency. The Field column (AspectPicker)
  // intentionally does NOT get Self — change.key must resolve to a path on the
  // target document, since that's what Foundry actually applies the change to.
  function getContextsForTarget (target: string): FamiliarSchema | undefined {
    const schema: FamiliarSchema = {};

    const selfContext = store.documentGetters.familiarSchema.value.self;
    if (selfContext) schema.self = selfContext;

    const targetContext = store.documentGetters.getTargetFamiliarContext(target);
    if (targetContext) schema[store.documentGetters.getTargetFamiliarContextName(target)] = targetContext;

    return Object.keys(schema).length ? schema : undefined;
  }

  // Per-row validation errors surfaced by the Field/Value/Condition formula editors
  // (`update:error`), combined into the row's shared context line instead of each
  // editor showing its own separate hint/error text. Keyed by row index — self-heals
  // when rows shift, since each editor re-emits its current error on every update.
  type RowFieldKey = 'field' | 'value' | 'condition';
  const rowFieldErrors = reactive<Record<number, Partial<Record<RowFieldKey, string | null>>>>({});

  function setRowError (index: number, field: RowFieldKey, error: string | null): void {
    rowFieldErrors[index] = { ...rowFieldErrors[index], [field]: error };
  }

  function hasRowError (index: number): boolean {
    const errors = rowFieldErrors[index];
    return !!errors && Object.values(errors).some(Boolean);
  }

  // Combined display text for the row's shared context line: validation errors
  // (prefixed by which column they came from) take priority over the plain
  // "Available Contexts: [...]" hint, since all three fields share one context.
  function getRowContextText (index: number, change: EffectChangeDataDnd35e): string {
    const errors = rowFieldErrors[index];
    if (errors) {
      const parts: string[] = [];
      if (errors.field) parts.push(`${keyHeaderLabel}: ${errors.field}`);
      if (errors.value) parts.push(`${valueHeaderLabel}: ${errors.value}`);
      if (errors.condition) parts.push(`${conditionHeaderLabel}: ${errors.condition}`);
      if (parts.length) return parts.join(' \u00b7 ');
    }

    const schema = getContextsForTarget(change.target ?? 'item');
    if (!schema) return '';
    const names = Object.entries(schema).map(([k, ctx]) => ctx.display ?? (k.charAt(0).toUpperCase() + k.slice(1)));
    if (!names.length) return '';
    const localizedPrefix = game.i18n.localize('dnd35e.Formula.availableContexts');
    return `${localizedPrefix}: [${names.join(', ')}]`;
  }

  // The Value column's expectedType is derived from the picked aspect (change.key),
  // not left to default to 'string' — enforces the aspect's real type in the formula input.
  function getExpectedTypeForChange (change: EffectChangeDataDnd35e): 'string' | 'number' | 'boolean' | undefined {
    if (!change.key) return undefined;
    const ctx = store.documentGetters.getTargetFamiliarContext(change.target ?? 'item');
    if (!ctx) return undefined;
    return findAspectByAccessPath(ctx.properties, change.key)?.aspect.type;
  }

  const changeTypes = computed(() => {
    const types: Record<string, string> = {};
    for (const [type, config] of Object.entries(ActiveEffect.CHANGE_TYPES)) {
      // mask is a system-registered internal type (Secret AE masking) — never user-selectable here.
      if (type === SYSTEM_CHANGE_TYPE.MASK) continue;
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
    display: grid;
    column-gap: 0.5rem;
    row-gap: 0.15rem;
    align-items: center;
  }

  .changes-empty {
    padding: 1rem;
    font-style: italic;
    opacity: 0.6;
    text-align: center;
  }

  // The header row is `display: contents` so its cells become direct items
  // of the `.changes-list` grid, sharing the exact same column tracks as
  // every data row below.
  .changes-table-header {
    display: contents;

    .col-header {
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      opacity: 0.7;
      padding-bottom: 0.35rem;
      border-bottom: 1px solid var(--color-border);
    }
  }

  // Each change row is a real grid box (not `display: contents`) using
  // `grid-template-columns: subgrid` so it inherits the parent's column
  // tracks exactly — this keeps columns aligned with the header AND lets
  // the row have its own background/padding/hover state, unlike a bare
  // `display: contents` row which can't paint a box at all.
  .change-row {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    align-items: start;
    row-gap: 0.2rem;
    padding: 0.4rem 0.25rem 0;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.02);
    transition: background-color 0.15s ease;
    border-bottom: 1px solid var(--color-border);
    margin: 0;

    &:nth-of-type(even) {
      background: rgba(255, 255, 255, 0.05);
    }

    &:hover {
      background: rgba(102, 166, 255, 0.07);
    }

    input[type="text"] {
      flex: 1;
    }

    select {
      width: 120px;
    }

    :deep(.change-value.form-group),
    :deep(.change-condition.form-group) {
      display: flex;
      border: none;
      padding: 0;
    }

    // Harmonize the Value/Condition formula editors (rendered by the shared,
    // globally-styled FormulaFormGroup/FamiliarOverlayInput) with the more
    // compact Field/AspectPicker input so all row cells read as one uniform
    // table row, instead of two oversized boxed cells next to plain selects.
    // Scoped to `.change-value`/`.change-condition` only — the global
    // `.formula-input`/`.highlight-layer`/`.formula-display` styles used
    // elsewhere (e.g. FormulaSettingsGroup) are left untouched.
    :deep(.change-value .formula-input),
    :deep(.change-condition .formula-input),
    :deep(.change-value .highlight-layer),
    :deep(.change-condition .highlight-layer) {
      min-height: unset;
      padding: 0.35rem 0.5rem;
      font-size: 0.85rem;
      border-radius: 3px;
    }

    :deep(.change-value .formula-display),
    :deep(.change-condition .formula-display) {
      min-height: unset;
      padding: 0.35rem 0.5rem;
      font-size: 0.85rem;
      border-radius: 3px;
    }
  }

  .form-fields {
    display: contents;
  }

  .row-context {
    grid-column: 1 / -1;
    font-size: var(--font-size-11);
    color: var(--color-text-secondary);
    padding: 0.35rem 0.5rem;

    &.has-error {
      color: rgba(255, 100, 100, 0.85);
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