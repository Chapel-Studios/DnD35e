<template>
  <div class="form-group" :class="formGroupClasses" :hidden="!isFieldVisible" :data-field-path="props.fieldPath || undefined">
    <div v-if="hasLabel" class="form-group-label">
      <label :title="labelTooltip">
        {{ resolvedLabel }}
        <span v-if="showMaskedBadge" class="masked-badge" :title="maskedBadgeTooltip" :aria-label="maskedBadgeTooltip">
          <i class="fa-solid fa-mask" aria-hidden="true" />
        </span>
      </label>
      <!-- GM permission controls next to label -->
      <FieldControls
        v-if="props.showFieldControls !== false"
        :field-path="props.fieldPath"
        :default-editability="props.defaultEditability"
        :default-visibility="props.defaultVisibility"
        :read-only="props.readOnly"
      >
        <slot name="controls" :editable="isFieldEditable" />
      </FieldControls>
    </div>

    <!-- Content slot for input elements -->
    <slot v-if="isFieldEditable"></slot>
    <slot v-else name="readonly">{{ props.value }}</slot>

    <p v-if="hasHint" class="hint">
      {{ resolvedHint }}
    </p>

    <!-- Standalone controls when no label -->
    <FieldControls
      v-if="!hasLabel && props.showFieldControls !== false"
      :field-path="props.fieldPath"
      :default-editability="props.defaultEditability"
      :default-visibility="props.defaultVisibility"
      :read-only="props.readOnly"
    >
      <slot name="controls" :editable="isFieldEditable" />
    </FieldControls>
  </div>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { RenderModeStore } from '@ec/CoreMixin/sheet/stores/RenderModeStore.mjs';
  import { RenderModeStoreSymbol } from '@ec/CoreMixin/sheet/stores/RenderModeStore.mjs';
  import { computed, inject } from 'vue';

  import FieldControls from './FieldControls.vue';
  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import {
    everyoneVisibility,
    gmOnlyEditability,
  } from './fieldPermissions.mjs';

  const props = withDefaults(defineProps<{
    label?: string; // localization key
    hint?: string; // localization key for hint text, or raw string if localizeHint=false
    // TODO(Phase 3): evaluate removing localizeHint — hints are pre-localized via LOCALIZATION_PREFIXES
    localizeHint?: boolean; // whether to localize hint (default: true)
    value?: string | number | null;
    // Field permissions
    fieldPath: string; // unique identifier for this field's permission overrides
    defaultVisibility?: FieldVisibility; // defaults to 'everyone'
    defaultEditability?: FieldEditability; // defaults to 'normal'
    /** When true, forces the readonly display. */
    readOnly?: boolean;
    /** When false, suppress the built-in FieldControls for this field wrapper. */
    showFieldControls?: boolean;
  }>(), {
    localizeHint: true,
    showFieldControls: true,
  });
  
  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const {
    documentGetters: {
      getIsFieldVisible,
      getIsFieldEditable,
      getMaskForField,
      hasMaskForField,
    },
    _storeUtils: {
      getFieldHint,
      getFieldLabel,
      resolveVisibility,
      resolveEditability,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  /**
   * Resolve label: explicit prop (localization key) > schema field label (already localized)
   * When explicit, the value is a localization key that needs localize().
   * When from schema, field.label is already localized text.
   */
  const resolvedLabel = computed(() => {
    if (props.label) return localize(props.label);
    return getFieldLabel(props.fieldPath);
  });

  const hasLabel = computed(() => !!resolvedLabel.value);

  /**
   * Resolve explicit inline helper text only.
   * Schema field hints stay on the label tooltip.
   */
  const resolvedHint = computed(() => {
    if (!props.hint) return '';
    return props.localizeHint === false ? props.hint : localize(props.hint);
  });

  const hasHint = computed(() => !!resolvedHint.value);
  const fieldHint = computed(() => getFieldHint(props.fieldPath));
  const labelTooltip = computed(() => fieldHint.value || undefined);

  const { isGM } = inject(RenderModeStoreSymbol) as RenderModeStore;

  // Get effective visibility: override > prop > schema default > 'everyone'
  const isFieldVisible = getIsFieldVisible(props.fieldPath, props.defaultVisibility);

  const isFieldEditable = getIsFieldEditable(props.fieldPath, props.defaultEditability);

  // Restriction checks
  const isVisibilityRestricted = computed(() => resolveVisibility(props.fieldPath, props.defaultVisibility) !== everyoneVisibility);
  const isEditabilityRestricted = computed(() => resolveEditability(props.fieldPath, props.defaultEditability) === gmOnlyEditability);

  const showMaskedBadge = computed(() => isGM.value && hasMaskForField(props.fieldPath).value);
  const maskValue = getMaskForField(props.fieldPath);

  const formatMaskValue = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value);
    if (value && typeof value === 'object') {
      const objectValue = value as { toString?: () => string };
      if (typeof objectValue.toString === 'function' && objectValue.toString !== Object.prototype.toString) {
        return objectValue.toString();
      }
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const maskedBadgeTooltip = computed(() => game.i18n.format('dnd35e.IDENTIFIABLE.MaskedValueHint', {
    value: formatMaskValue(maskValue.value),
  }));

  // Form group classes
  const formGroupClasses = computed(() => ({
    'with-hint': hasHint.value,
    'restricted-visibility': isVisibilityRestricted.value,
    'restricted-editability': isEditabilityRestricted.value,
  }));
</script>

<style scoped>
  .view-mode .form-group {
    & > :first-child {
      justify-self: left;
    }

    & > :not(:first-child) {
      justify-self: center;
    }
  }
  
  .form-group {
    display: contents;
    padding: 0.5rem;
  }

  .form-group-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .form-group-label label {
    margin: 0;
    cursor: help;
  }

  .masked-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 0.35rem;
    width: 1rem;
    height: 1rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-level-warning) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-level-warning) 40%, transparent);
    color: var(--color-level-warning);
    font-size: var(--font-size-10);
    font-weight: 600;
    line-height: 1.2;
    vertical-align: middle;
  }

  .masked-badge i {
    font-size: 0.65rem;
  }

  .form-group.with-hint :slotted(.hint) {
    grid-column: 1 / -1;
    font-size: var(--font-size-11);
    color: var(--color-text-secondary);
    margin: 0;
  }

  /* Direct child hint (not slotted) also spans full width */
  .form-group.with-hint > .hint {
    grid-column: 1 / -1;
    font-size: var(--font-size-11);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .form-group.with-hint :slotted(select[multiple]) {
    min-height: 80px;
  }

  .form-group.with-hint :slotted(input[type='text']),
  .form-group.with-hint :slotted(input[type='number']) {
    min-width: 10rem;
  }

  .form-group.with-hint :slotted(input[type='color']) {
    width: 60px;
    height: 30px;
    padding: 0;
    border: 1px solid var(--color-border);
  }

  /* Visual indicator for restricted fields */
  .form-group.restricted-visibility > label,
  .form-group.restricted-editability > label {
    position: relative;
  }

  .form-group.restricted-visibility > label::before {
    content: '';
    position: absolute;
    left: -0.5rem;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--color-level-warning);
    border-radius: 2px;
  }
</style>
