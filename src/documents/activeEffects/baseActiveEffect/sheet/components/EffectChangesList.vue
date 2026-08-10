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
        <span class="col-header">{{ keyHeaderLabel }}</span>
        <span v-if="props.variant === 'mask'" class="col-header" />
        <span v-if="props.variant === 'default'" class="col-header">{{ typeHeaderLabel }}</span>
        <span class="col-header">{{ valueHeaderLabel }}</span>
        <span v-if="props.variant === 'default'" class="col-header">{{ bonusTypeLabel }}</span>
        <span v-if="props.variant === 'default'" class="col-header">{{ conditionHeaderLabel }}</span>
        <span class="col-header">{{ priorityHeaderLabel }}</span>
        <span v-if="props.showChangeFieldControls" class="col-header">{{ controlsHeaderLabel }}</span>
      </li>

      <li
        v-for="(change, index) in visibleChanges"
        v-show="isChangeVisible(index)"
        :key="change.id"
        class="change-row"
        :data-index="index"
      >
        <div class="form-fields">
          <AspectPicker
            :model-value="change.key"
            :placeholder="resolvedKeyPlaceholder"
            :disabled="!isChangeEditable(index) || change.isSystem"
            :contexts="keyPickerContexts"
            hide-context-hint
            @update:model-value="(val: string) => updateChangeKey(change.id, val)"
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
            @change="(e: Event) => updateChangeField(change.id, 'type', (e.target as HTMLSelectElement).value)"
          >
            <option v-for="(label, type) in changeTypes" :key="type" :value="type">
              {{ label }}
            </option>
          </select>

          <FormulaFormGroup
            class="change-value"
            :value="String(change.value ?? '')"
            :field-path="`system.changes.${index}.value`"
            :on-update="(val: string) => updateChangeField(change.id, 'value', val)"
            :disabled="!isChangeEditable(index) || change.isSystem"
            :contexts="valueConditionContexts"
            :expected-type="getExpectedTypeForChange(change)"
            :placeholder="resolvedValuePlaceholder"
            hide-field-controls
            hide-context-hint
            @update:error="(err: string | null) => setRowError(index, 'value', err)"
          />

          <select
            v-if="props.variant === 'default'"
            :name="`system.changes.${index}.bonusType`"
            :value="change.bonusType ?? ''"
            :disabled="!isChangeEditable(index) || change.isSystem"
            class="bonus-type-select"
            :title="bonusTypeLabel"
            @change="(e: Event) => updateChangeField(change.id, 'bonusType', (e.target as HTMLSelectElement).value || null)"
          >
            <option value="">{{ untypedLabel }}</option>
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
            :on-update="(val: string) => updateChangeField(change.id, 'condition', val || null)"
            :disabled="!isChangeEditable(index) || change.isSystem"
            :contexts="valueConditionContexts"
            :placeholder="resolvedConditionPlaceholder"
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
            <button type="button" @click="deleteChange(change.id)" :disabled="!isChangeEditable(index) || change.isSystem" class="delete-change field-control-btn">
              <i class="fa-solid fa-trash"></i>
            </button>
          </FieldControls>
        </div>

        <div
          v-if="getRowContextInfo() || getRowErrorText(index)"
          class="row-context"
          :class="{ 'has-error': hasRowError(index) }"
        >
          <p>
            <span v-if="getRowContextInfo()" class="context-info">{{ getRowContextInfo() }}. </span>
            <span v-if="getRowErrorText(index)" class="row-errors">{{ getRowErrorText(index) }}</span>
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
  import { BONUS_TYPE_UNTYPED, BONUS_TYPES } from '@constants/bonusTypes.mjs';
  import type { RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
  import { EFFECT_CHANGE_TARGET, EFFECT_CHANGE_TYPE, type EffectChangeTarget, SYSTEM_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
  import type { ActiveEffectConfigStore } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
  import { withChangeTargetGroups } from '@helpers/formulae/changeTargetGroups.mjs';
  import FormulaFormGroup from '@helpers/formulae/FormulaFormGroup.vue';
  import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
  import type { FamiliarSchema } from '@helpers/formulae/types.mts';
  import AspectPicker from '@vc/fields/formGroups/AspectPicker.vue';
  import FieldControls from '@vc/fields/formGroups/FieldControls.vue';
  import { computed, inject, reactive } from 'vue';

  const props = withDefaults(defineProps<{
    title?: string;
    addLabel?: string;
    emptyLabel?: string;
    keyPlaceholder?: string;
    variant?: 'default' | 'mask';
    showChangeFieldControls?: boolean;
    createChangeData?: Partial<EffectChangeDataDnd35e>;
  }>(), {
    title: undefined,
    addLabel: undefined,
    emptyLabel: undefined,
    keyPlaceholder: undefined,
    variant: 'default',
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

  const bonusTypeLabel = game.i18n.localize('dnd35e.EFFECT.BonusType.Label');
  // The empty selection (stored as `null`) IS the untyped bonus type (see stacking.mts's
  // undefined/null → BONUS_TYPE_UNTYPED normalization) — Untyped is never also listed
  // among `bonusTypeOptions` below, since that would just be the same option twice.
  const untypedLabel = game.i18n.localize(BONUS_TYPE_UNTYPED);
  const keyHeaderLabel = game.i18n.localize('dnd35e.EFFECT.Headers.TargetField');
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
    const cols = [
      '1fr',          // Key
      'max-content',  // Type
      '1fr',          // Value
      'max-content',  // BonusType
      '1fr',          // Condition
      'max-content',  // Priority
    ]; 
    if (props.showChangeFieldControls) cols.push('max-content'); // Controls
    return cols.join(' ');
  });
  const resolvedTitle = computed(() => props.title ?? game.i18n.localize('EFFECT.TABS.changes'));
  const resolvedAddLabel = computed(() => props.addLabel ?? game.i18n.localize('EFFECT.AddChange'));
  const resolvedEmptyLabel = computed(() => props.emptyLabel ?? '');
  const resolvedKeyPlaceholder = computed(() => props.keyPlaceholder ?? game.i18n.localize('dnd35e.EFFECT.FieldPlaceholder'));
  const resolvedValuePlaceholder = computed(() => game.i18n.localize('dnd35e.EFFECT.ValuePlaceholder'));
  const resolvedConditionPlaceholder = computed(() => game.i18n.localize('dnd35e.EFFECT.ConditionPlaceholder'));

  const changeFieldPath = (index: number): string => `system.changes.${index}`;
  const isChangeVisible = (index: number): boolean => getIsFieldVisible(changeFieldPath(index)).value;
  const isChangeEditable = (index: number): boolean => getIsFieldEditable(changeFieldPath(index)).value;

  // The Field/Key column no longer has a separate Target selector — both the item's and
  // the owning actor's contexts are always offered together (poc request), and the picked
  // property's own context prefix (#weapon./#character./etc.) determines `change.target`
  // (see `resolveTargetForKey` below). Group Change Targets (poc §7.7) only ever expand to
  // actor field paths, so they're folded into the actor context only.
  const keyPickerContexts = computed((): FamiliarSchema | undefined => {
    const schema: FamiliarSchema = {};

    const itemContext = store.documentGetters.getTargetFamiliarContext(EFFECT_CHANGE_TARGET.ITEM);
    if (itemContext) schema[store.documentGetters.getTargetFamiliarContextName(EFFECT_CHANGE_TARGET.ITEM)] = itemContext;

    const actorContext = store.documentGetters.getTargetFamiliarContext(EFFECT_CHANGE_TARGET.ACTOR);
    if (actorContext) schema[store.documentGetters.getTargetFamiliarContextName(EFFECT_CHANGE_TARGET.ACTOR)] = withChangeTargetGroups(actorContext);

    return Object.keys(schema).length ? schema : undefined;
  });

  // Value/Condition formulas may reference Self, the item, AND the actor at once — even a
  // change that targets the actor may want to read an item stat (e.g. a weapon's own
  // enhancement bonus) to compute its value, and vice versa, so both are always merged in
  // regardless of which document the change itself targets.
  const valueConditionContexts = computed((): FamiliarSchema | undefined => {
    const schema: FamiliarSchema = {};

    const selfContext = store.documentGetters.familiarSchema.value.self;
    if (selfContext) schema.self = selfContext;

    const itemContext = store.documentGetters.getTargetFamiliarContext(EFFECT_CHANGE_TARGET.ITEM);
    if (itemContext) schema[store.documentGetters.getTargetFamiliarContextName(EFFECT_CHANGE_TARGET.ITEM)] = itemContext;

    const actorContext = store.documentGetters.getTargetFamiliarContext(EFFECT_CHANGE_TARGET.ACTOR);
    if (actorContext) schema[store.documentGetters.getTargetFamiliarContextName(EFFECT_CHANGE_TARGET.ACTOR)] = actorContext;

    return Object.keys(schema).length ? schema : undefined;
  });

  // Derives which document a picked Field/Key path actually belongs to, replacing the
  // removed Target selector. Checked against the same (group-extended) contexts the
  // picker itself offers — item is checked first, actor (including groups) second.
  function resolveTargetForKey (key: string): EffectChangeTarget {
    if (!key) return EFFECT_CHANGE_TARGET.ITEM;

    const itemContext = store.documentGetters.getTargetFamiliarContext(EFFECT_CHANGE_TARGET.ITEM);
    if (itemContext && FormulaResolver.findAspectByAccessPath(itemContext.properties, key)) {
      return EFFECT_CHANGE_TARGET.ITEM;
    }

    const actorContext = store.documentGetters.getTargetFamiliarContext(EFFECT_CHANGE_TARGET.ACTOR);
    if (actorContext && FormulaResolver.findAspectByAccessPath(withChangeTargetGroups(actorContext).properties, key)) {
      return EFFECT_CHANGE_TARGET.ACTOR;
    }

    return EFFECT_CHANGE_TARGET.ITEM;
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

  // The row's shared "Available Contexts: [...]" hint — always shown alongside
  // any validation errors (below) rather than being replaced by them, so the
  // user can still see what contexts are available while fixing an error.
  function getRowContextInfo (): string {
    const schema = valueConditionContexts.value;
    if (!schema) return '';
    const names = Object.entries(schema).map(([k, ctx]) => ctx.display ?? (k.charAt(0).toUpperCase() + k.slice(1)));
    if (!names.length) return '';
    const localizedPrefix = game.i18n.localize('dnd35e.Formula.availableContexts');
    return `${localizedPrefix}: [${names.join(', ')}]`;
  }

  // Combined validation errors (prefixed by which column they came from),
  // surfaced alongside the context info rather than replacing it.
  function getRowErrorText (index: number): string {
    const errors = rowFieldErrors[index];
    if (!errors) return '';
    const parts: string[] = [];
    if (errors.field) parts.push(`${keyHeaderLabel}: ${errors.field}`);
    if (errors.value) parts.push(`${valueHeaderLabel}: ${errors.value}`);
    if (errors.condition) parts.push(`${conditionHeaderLabel}: ${errors.condition}`);
    return parts.join(' \u00b7 ');
  }

  // The Value column's expectedType is derived from the picked aspect (change.key),
  // not left to default to 'string' — enforces the aspect's real type in the formula input.
  // An AE change's Value formula always resolves to a scalar, so an 'array'-typed aspect
  // (e.g. targeting `senses`/`languages` directly) falls back to 'string' here rather than
  // propagating a type this input can't actually produce.
  function getExpectedTypeForChange (change: EffectChangeDataDnd35e): 'string' | 'number' | 'boolean' | undefined {
    if (!change.key) return undefined;
    const ctx = store.documentGetters.getTargetFamiliarContext(change.target ?? 'item');
    if (!ctx) return undefined;
    const aspectType = FormulaResolver.findAspectByAccessPath(ctx.properties, change.key)?.aspect.type;
    return aspectType === 'array' ? 'string' : aspectType;
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

  const bonusTypeOptions = computed(() =>
    BONUS_TYPES.filter((bt) => bt !== BONUS_TYPE_UNTYPED).map((bt) => ({
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
      // No phase selector exists in the change editor UI (matches vanilla Foundry, which
      // doesn't expose one either) - default to 'final' rather than 'initial' so authored
      // bonuses settle before the 'post' phase derives saves/AC from them.
      phase: 'final',
      priority: 10,
      target: EFFECT_CHANGE_TARGET.ITEM,
      isSystem: false,
      ...props.createChangeData,
    });
  };

  const deleteChange = async (id: string) => {
    await removeChange?.(id);
  };

  // Domain callback: each editor row targets a specific change entry by stable id.
  // Also re-derives `target` from the picked key (item vs actor), since there's no
  // longer a separate Target selector for the user to keep in sync manually.
  const updateChangeKey = async (id: string, val: string) => {
    await updateChangeField(id, 'key', val);
    await updateChangeField(id, 'target', resolveTargetForKey(val));
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
    padding: 0.35rem 0.5rem;

    p {
      margin: 0;
    }

    .context-info {
      color: var(--color-text-secondary);
    }

    .row-errors {
      color: rgba(255, 100, 100, 0.85);
    }
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