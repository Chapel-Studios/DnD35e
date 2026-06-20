<template>
  <div class="form-group" :class="formGroupClasses" :hidden="!isFieldVisible" :data-field-path="props.fieldPath || undefined">
    <div v-if="hasLabel" class="form-group-label">
      <label class="default-label" :title="labelTooltip">
        {{ resolvedLabel }}
        <MaskedBadge :field-path="props.fieldPath" />
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
    <slot v-if="showDefaultSlot"></slot>
    <div v-else class="readonly-content">
      <slot name="readonly">{{ resolvedValue }}</slot>
    </div>

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

<script setup lang="ts" generic="TValue extends string | number | boolean">
  import type { DocumentSheetStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject } from 'vue';

  import FieldControls from './FieldControls.vue';
  import {
    everyoneVisibility,
    gmOnlyEditability,
  } from './fieldPermissions.mjs';
  import MaskedBadge from './MaskedBadge.vue';
  import type { BaseFormGroupProps } from './types.mjs';

  const props = withDefaults(defineProps<BaseFormGroupProps<TValue>>(), {
    showFieldControls: true,
  });

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const {
    documentGetters: {
      getIsFieldVisible,
      getIsFieldEditable,
      getViewAwareFieldValue,
    },
    _storeUtils: {
      getFieldHint,
      getFieldLabel,
      resolveVisibility,
      resolveEditability,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const resolvedValue = computed(() => (props.value
    ?? getViewAwareFieldValue<TValue>(props.fieldPath).toString()));

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
    return localize(props.hint);
  });

  const hasHint = computed(() => !!resolvedHint.value);
  const labelTooltip = computed(() => getFieldHint(props.fieldPath) || undefined);

  // Get effective visibility: override > prop > schema default > 'everyone'
  const isFieldVisible = getIsFieldVisible(props.fieldPath, props.defaultVisibility);

  const isFieldEditable = getIsFieldEditable(props.fieldPath, props.defaultEditability, !!props.forceEdit);
  const showDefaultSlot = computed(() => !props.readOnly && (isFieldEditable.value || props.forceEdit));
  

  // Restriction checks
  const isVisibilityRestricted = computed(() => resolveVisibility(props.fieldPath, props.defaultVisibility) !== everyoneVisibility);
  const isEditabilityRestricted = computed(() => resolveEditability(props.fieldPath, props.defaultEditability) === gmOnlyEditability);

  // Form group classes
  const formGroupClasses = computed(() => ({
    'with-hint': hasHint.value,
    'restricted-visibility': isVisibilityRestricted.value,
    'restricted-editability': isEditabilityRestricted.value,
  }));
</script>

<style scoped lang="scss">
  
  .form-group {
    border: 1px solid var(--color-border, #7a7971);
    display: grid;
    grid-auto-flow: row;
    align-items: center;
    grid-gap: 0.33rem;
    padding: 0.5rem;

    &.contents {
      display: contents;
    }
  }

  .form-group-label {
    display: flex;
    align-items: center;
    justify-items: center;
    justify-content: center;
    gap: 0.25rem;
    flex-wrap: wrap;

    .default-label {
      margin: 0;
      cursor: help;
      overflow-wrap: break-word;
      min-width: 0;
      text-align: center;
    }

    &.with-hint {
      :slotted(.hint) {
        grid-column: 1 / -1;
        font-size: var(--font-size-11);
        color: var(--color-text-secondary);
        margin: 0;
      }
    }

    /* Direct child hint (not slotted) also spans full width */
    & > .hint {
      grid-column: 1 / -1;
      font-size: var(--font-size-11);
      color: var(--color-text-secondary);
      margin: 0;
    }

    :slotted(select[multiple]) {
      min-height: 80px;
    }

    :slotted(input[type='text']),
    :slotted(input[type='number']) {
      min-width: 10rem;
    }

    :slotted(input[type='color']) {
      width: 60px;
      height: 30px;
      padding: 0;
      border: 1px solid var(--color-border);
    }
  }

  /* Visual indicator for restricted fields */
  .form-group.restricted-visibility .default-label,
  .form-group.restricted-editability .default-label {
    position: relative;
  }

  .form-group.restricted-visibility .default-label::before {
    content: '';
    position: absolute;
    left: -0.5rem;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--color-level-warning);
    border-radius: 2px;
  }
  
  .readonly-content {
    justify-self: center;
  }
</style>
