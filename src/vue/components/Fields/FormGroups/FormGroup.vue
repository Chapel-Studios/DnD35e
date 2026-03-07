<template>
  <div class="form-group" :class="formGroupClasses" :hidden="!isFieldVisible">
    <label v-if="hasLabel">
      <i v-if="isVisibilityRestricted" class="fas fa-low-vision" :title="visibilityTooltip"></i>
      {{ localize(props.label!) }}
      <!-- GM permission controls in label -->
      <FieldControls
        :show-controls="isEditMode"
        :is-g-m="isGM"
        :field-path="props.fieldPath"
        :is-visibility-restricted="isVisibilityRestricted"
        :is-editability-restricted="isEditabilityRestricted"
        :visibility-icon="visibilityIcon"
        :visibility-tooltip="visibilityTooltip"
        :editability-icon="editabilityIcon"
        :editability-tooltip="editabilityTooltip"
        @cycle-visibility="cycleVisibility"
        @toggle-editability="toggleEditability"
      >
        <slot name="controls" />
      </FieldControls>
    </label>

    <!-- GM permission controls before content when no label -->
    <FieldControls
      v-if="!hasLabel"
      :show-controls="isEditMode"
      :is-g-m="isGM"
      :field-path="props.fieldPath"
      :is-visibility-restricted="isVisibilityRestricted"
      :is-editability-restricted="isEditabilityRestricted"
      :visibility-icon="visibilityIcon"
      :visibility-tooltip="visibilityTooltip"
      :editability-icon="editabilityIcon"
      :editability-tooltip="editabilityTooltip"
      @cycle-visibility="cycleVisibility"
      @toggle-editability="toggleEditability"
    >
      <slot name="controls" />
    </FieldControls>

    <!-- Content slot for input elements -->
    <slot v-if="isFieldEditable"></slot>
    <slot v-else name="readonly">{{ props.value }}</slot>

    <!-- Hint text -->
    <p v-if="props.hint" class="hint">{{ props.localizeHint === false ? props.hint : localize(props.hint) }}</p>
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  import FieldControls from './FieldControls.vue';
  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';

  const props = defineProps<{
    label?: string; // localization key
    hint?: string; // localization key for hint text, or raw string if localizeHint=false
    localizeHint?: boolean; // whether to localize hint (default: true)
    value?: string | number | null;
    // Field permissions
    fieldPath?: string; // unique identifier for this field's permission overrides
    defaultVisibility?: FieldVisibility; // defaults to 'everyone'
    defaultEditability?: FieldEditability; // defaults to 'normal'
    // Legacy prop - maps to defaultVisibility: 'gmOnly'
    isDmOnly?: boolean;
  }>();
  
  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const hasLabel = !!props.label;
  
  const store = inject('documentSheetStore') as DocumentSheetStore;
  const { isEditable, documentGetters, documentActions } = store;
  const { getFieldOverride } = documentGetters;
  const { setFieldOverride } = documentActions;
  
  // Safely access new store properties with fallbacks
  const isGM = computed(() => store.isGM?.value ?? game.user.isGM);
  const isOwnerOrGM = computed(() => store.isOwnerOrGM?.value ?? game.user.isGM);
  const isEditMode = computed(() => store.isEditMode?.value ?? true);

  // Get effective visibility: override > prop > legacy isDmOnly > 'everyone'
  const effectiveVisibility = computed((): FieldVisibility => {
    const override = props.fieldPath ? getFieldOverride(props.fieldPath) : undefined;
    if (override?.visibility) return override.visibility;
    if (props.defaultVisibility) return props.defaultVisibility;
    if (props.isDmOnly) return 'gmOnly';
    return 'everyone';
  });

  // Get effective editability: override > prop > 'normal'
  const effectiveEditability = computed((): FieldEditability => {
    const override = props.fieldPath ? getFieldOverride(props.fieldPath) : undefined;
    if (override?.editability) return override.editability;
    if (props.defaultEditability) return props.defaultEditability;
    return 'normal';
  });

  // Determine if current user can see this field
  const isFieldVisible = computed((): boolean => {
    switch (effectiveVisibility.value) {
    case 'everyone': return true;
    case 'ownerPlus': return isOwnerOrGM.value;
    case 'gmOnly': return isGM.value;
    default: return true;
    }
  });

  // Determine if current user can edit this field
  const isFieldEditable = computed((): boolean => {
    if (!isEditable.value) return false;
    if (effectiveEditability.value === 'gmOnly') return isGM.value;
    return true;
  });

  // Restriction checks
  const isVisibilityRestricted = computed(() => effectiveVisibility.value !== 'everyone');
  const isEditabilityRestricted = computed(() => effectiveEditability.value === 'gmOnly');

  // Form group classes
  const formGroupClasses = computed(() => ({
    'with-hint': !!props.hint,
    'restricted-visibility': isVisibilityRestricted.value,
    'restricted-editability': isEditabilityRestricted.value,
  }));

  // Permission control icons and tooltips
  const visibilityIcon = computed(() => {
    switch (effectiveVisibility.value) {
    case 'everyone': return 'fas fa-eye';
    case 'ownerPlus': return 'fas fa-user-shield';
    case 'gmOnly': return 'fas fa-low-vision';
    default: return 'fas fa-eye';
    }
  });

  const visibilityTooltip = computed(() => {
    switch (effectiveVisibility.value) {
    case 'everyone': return 'Visible to everyone';
    case 'ownerPlus': return 'Visible to owners and GMs only';
    case 'gmOnly': return 'Visible to GMs only';
    default: return 'Visibility';
    }
  });

  const editabilityIcon = computed(() => {
    return effectiveEditability.value === 'gmOnly' ? 'fas fa-lock' : 'fas fa-lock-open';
  });

  const editabilityTooltip = computed(() => {
    return effectiveEditability.value === 'gmOnly' ? 'GM-only editing' : 'Normal editing';
  });

  // Permission control actions
  const cycleVisibility = async () => {
    if (!props.fieldPath) return;
    const order: FieldVisibility[] = ['everyone', 'ownerPlus', 'gmOnly'];
    const currentIndex = order.indexOf(effectiveVisibility.value);
    const nextVisibility = order[(currentIndex + 1) % order.length];
    const current = getFieldOverride(props.fieldPath) ?? {};
    await setFieldOverride(props.fieldPath, { ...current, visibility: nextVisibility });
  };

  const toggleEditability = async () => {
    if (!props.fieldPath) return;
    const nextEditability: FieldEditability = effectiveEditability.value === 'normal' ? 'gmOnly' : 'normal';
    const current = getFieldOverride(props.fieldPath) ?? {};
    await setFieldOverride(props.fieldPath, { ...current, editability: nextEditability });
  };
</script>

<style scoped>
.form-group {
  display: contents;
}

.form-group.with-hint {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 0.25rem 0.5rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border-light-tertiary);
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
  color: var(--color-text-dark-secondary);
  margin: 0;
}

/* Direct child hint (not slotted) also spans full width */
.form-group.with-hint > .hint {
  grid-column: 1 / -1;
  font-size: var(--font-size-11);
  color: var(--color-text-dark-secondary);
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
  border: 1px solid var(--color-border-light-tertiary);
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
