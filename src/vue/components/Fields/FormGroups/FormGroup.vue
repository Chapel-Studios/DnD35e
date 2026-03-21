<template>
  <div class="form-group" :class="formGroupClasses" :hidden="!isFieldVisible">
    <div v-if="hasLabel" class="form-group-label">
      <label>
        <!-- <i v-if="isVisibilityRestricted" class="fas fa-low-vision" :title="visibilityTooltip"></i> -->
        {{ localize(props.label!) }}
      </label>
      <!-- GM permission controls next to label -->
      <FieldControls
        :field-path="props.fieldPath"
        :default-editability="props.defaultEditability"
        :default-visibility="props.defaultVisibility"
      >
        <slot name="controls" />
      </FieldControls>
    </div>

    <!-- Content slot for input elements -->
    <slot v-if="isFieldEditable"></slot>
    <slot v-else name="readonly">{{ props.value }}</slot>

    <!-- Hint text -->
    <p v-if="props.hint" class="hint">
      <!-- GM permission controls before content when no label -->
      <FieldControls
        v-if="!hasLabel"
        :field-path="props.fieldPath"
        :default-editability="props.defaultEditability"
        :default-visibility="props.defaultVisibility"
      >
        <slot name="controls" />
      </FieldControls>
      {{ props.localizeHint === false ? props.hint : localize(props.hint) }}
    </p>

    <!-- Standalone controls when no label and no hint -->
    <FieldControls
      v-if="!hasLabel && !props.hint"
      :field-path="props.fieldPath"
      :default-editability="props.defaultEditability"
      :default-visibility="props.defaultVisibility"
    >
      <slot name="controls" />
    </FieldControls>
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  import FieldControls from './FieldControls.vue';
  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import {
    everyoneVisibility,
    gmOnlyEditability,
    gmOnlyVisibility,
    normalEditability,
    ownerPlusVisibility,
  } from './fieldPermissions.mjs';

  const props = defineProps<{
    label?: string; // localization key
    hint?: string; // localization key for hint text, or raw string if localizeHint=false
    localizeHint?: boolean; // whether to localize hint (default: true)
    value?: string | number | null;
    // Field permissions
    fieldPath: string; // unique identifier for this field's permission overrides
    defaultVisibility?: FieldVisibility; // defaults to 'everyone'
    defaultEditability?: FieldEditability; // defaults to 'normal'
  }>();
  
  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const hasLabel = !!props.label;
  
  const store = inject('documentSheetStore') as DocumentSheetStore;
  const { isEditable, documentGetters } = store;
  const { getFieldOverride } = documentGetters;
  
  // Safely access new store properties with fallbacks
  const isGM = computed(() => store.isGM?.value ?? game.user.isGM);
  const isOwnerOrGM = computed(() => store.isOwnerOrGM?.value ?? game.user.isGM);

  // Get effective visibility: override > prop > 'everyone'
  const effectiveVisibility = computed((): FieldVisibility => {
    const override = props.fieldPath ? getFieldOverride(props.fieldPath) : undefined;
    if (override?.visibility) return override.visibility;
    if (props.defaultVisibility) return props.defaultVisibility;
    return everyoneVisibility;
  });

  // Get effective editability: override > prop > 'normal'
  const effectiveEditability = computed((): FieldEditability => {
    const override = props.fieldPath ? getFieldOverride(props.fieldPath) : undefined;
    if (override?.editability) return override.editability;
    if (props.defaultEditability) return props.defaultEditability;
    return normalEditability;
  });

  // Determine if current user can see this field
  const isFieldVisible = computed((): boolean => {
    switch (effectiveVisibility.value) {
    case everyoneVisibility: return true;
    case ownerPlusVisibility: return isOwnerOrGM.value;
    case gmOnlyVisibility: return isGM.value;
    default: return true;
    }
  });

  // Determine if current user can edit this field
  const isFieldEditable = computed((): boolean => {
    if (!isEditable.value) return false;
    if (effectiveEditability.value === gmOnlyEditability) return isGM.value;
    return true;
  });

  // Restriction checks
  const isVisibilityRestricted = computed(() => effectiveVisibility.value !== everyoneVisibility);
  const isEditabilityRestricted = computed(() => effectiveEditability.value === gmOnlyEditability);

  // Form group classes
  const formGroupClasses = computed(() => ({
    'with-hint': !!props.hint,
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
    padding: 0.25rem 0.5rem;
  }

  .form-group-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .form-group-label label {
    margin: 0;
  }

  .form-group.with-hint {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 0.25rem 0.5rem;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-border);
  }

  .form-group.with-hint:last-child {
    border-bottom: none;
  }

  .form-group.with-hint label {
    font-weight: 500;
  }

  /* When no label, let slotted content span full grid width */
  .form-group.with-hint :slotted(:first-child:last-of-type) {
    grid-column: 1 / -1;
  }

  .form-group.with-hint :slotted(input),
  .form-group.with-hint :slotted(select),
  .form-group.with-hint :slotted(.form-fields) {
    justify-self: end;
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
