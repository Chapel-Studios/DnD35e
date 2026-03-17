<template>
  <span v-if="!hideEverything" class="controls">
    <!-- GM permission controls - only show when GM, in edit mode, and fieldPath provided -->
    <template v-if="showControls">
      <!-- Visibility cycle (eye icon) -->
      <button
        type="button"
        class="field-control visibility-control"
        :class="{ 'is-restricted': isVisibilityRestricted }"
        :title="visibilityTooltip"
        @click.stop.prevent="cycleVisibility"
      >
        <i :class="visibilityIcon"></i>
      </button>
      <!-- Editability toggle (lock icon) -->
      <button
        type="button"
        class="field-control editability-control"
        :class="{ 'is-restricted': isEditabilityRestricted }"
        :title="editabilityTooltip"
        @click.stop.prevent="toggleEditability"
      >
        <i :class="editabilityIcon"></i>
      </button>
    </template>
    <slot></slot>
  </span>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject, useSlots } from 'vue';

  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import {
    everyoneVisibility,
    gmOnlyEditability,
    gmOnlyVisibility,
    normalEditability,
    ownerPlusVisibility,
  } from './fieldPermissions.mjs';

  const slots = useSlots();
  const props = defineProps<{
    fieldPath?: string;
    defaultEditability?: FieldEditability;
    defaultVisibility?: FieldVisibility;
  }>();

  const store = inject('documentSheetStore') as DocumentSheetStore;
  const { documentGetters, documentActions } = store;
  const { getFieldOverride } = documentGetters;
  const { setFieldOverride } = documentActions;

  // Computed: should we show controls?
  const isGM = computed(() => store.isGM?.value ?? game.user.isGM);
  const isEditMode = computed(() => store.isEditMode?.value ?? true);
  const showControls = computed(() => isEditMode.value && isGM.value && !!props.fieldPath);
  const hideEverything = computed(() => !isEditMode.value
    || (!showControls.value && !slots.default)
  );

  // === VISIBILITY ===
  // Effective visibility: override > prop default > 'everyone'
  const effectiveVisibility = computed((): FieldVisibility => {
    const override = props.fieldPath ? getFieldOverride(props.fieldPath) : undefined;
    if (override?.visibility) return override.visibility;
    if (props.defaultVisibility) return props.defaultVisibility;
    return everyoneVisibility;
  });

  const isVisibilityRestricted = computed(() => effectiveVisibility.value !== everyoneVisibility);

  const visibilityIcon = computed(() => {
    switch (effectiveVisibility.value) {
    case everyoneVisibility: return 'fas fa-eye';
    case ownerPlusVisibility: return 'fas fa-user-shield';
    case gmOnlyVisibility: return 'fas fa-eye-slash';
    default: return 'fas fa-eye';
    }
  });

  const visibilityTooltip = computed(() => {
    switch (effectiveVisibility.value) {
    case everyoneVisibility: return 'Visible to everyone';
    case ownerPlusVisibility: return 'Visible to owners and GMs only';
    case gmOnlyVisibility: return 'Visible to GMs only';
    default: return 'Visibility';
    }
  });

  // Action: cycle visibility (everyone -> ownerPlus -> gmOnly -> everyone)
  const cycleVisibility = async () => {
    if (!props.fieldPath) return;
    const order: FieldVisibility[] = [everyoneVisibility, ownerPlusVisibility, gmOnlyVisibility];
    const currentIndex = order.indexOf(effectiveVisibility.value);
    const nextVisibility = order[(currentIndex + 1) % order.length];
    const current = getFieldOverride(props.fieldPath) ?? {};
    await setFieldOverride(props.fieldPath, { ...current, visibility: nextVisibility });
  };

  // === EDITABILITY ===
  // Effective editability: override > prop default > 'normal'
  const effectiveEditability = computed((): FieldEditability => {
    const override = props.fieldPath ? getFieldOverride(props.fieldPath) : undefined;
    if (override?.editability) return override.editability;
    if (props.defaultEditability) return props.defaultEditability;
    return normalEditability;
  });

  const isEditabilityRestricted = computed(() => effectiveEditability.value === gmOnlyEditability);

  const editabilityIcon = computed(() => 
    effectiveEditability.value === gmOnlyEditability ? 'fas fa-lock' : 'fas fa-lock-open'
  );

  const editabilityTooltip = computed(() => 
    effectiveEditability.value === gmOnlyEditability ? 'GM-only editing' : 'Normal editing'
  );

  // Action: toggle editability
  const toggleEditability = async () => {
    if (!props.fieldPath) return;
    const nextEditability: FieldEditability = effectiveEditability.value === normalEditability ? gmOnlyEditability : normalEditability;
    const current = getFieldOverride(props.fieldPath) ?? {};
    await setFieldOverride(props.fieldPath, { ...current, editability: nextEditability });
  };
</script>

<style scoped>
.controls {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  position: relative;
}

/* Permission control buttons */
.field-control {
  background: transparent;
  border: none;
  padding: 0.125rem 0.25rem;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s ease;
  font-size: var(--font-size-11);
  position: relative;
  z-index: 1;

  &.is-active {
    
  }
}

.field-control:hover {
  opacity: 1;
}

.field-control.is-restricted {
  opacity: 1;
  color: var(--color-level-warning);
}
</style>
