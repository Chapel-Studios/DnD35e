<template>
  <span v-if="!hideEverything" class="controls">
    <HasActiveEffectsNotification :field-path="props.fieldPath" />
    <!-- GM permission controls - only show when GM, in edit mode, and fieldPath provided -->
    <template v-if="showGMControls">
      <!-- Visibility cycle (eye icon) - only shown for identifiable fields -->
      <button
        v-if="showVisibilityButton"
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
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject, useSlots } from 'vue';

  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import {
    everyoneVisibility,
    gmOnlyEditability,
    gmOnlyVisibility,
    normalEditability,
    ownerPlusVisibility,
  } from './fieldPermissions.mjs';
  import HasActiveEffectsNotification from './HasActiveEffectsNotification.vue';

  const slots = useSlots();
  const props = defineProps<{
    fieldPath: string;
    defaultEditability?: FieldEditability;
    defaultVisibility?: FieldVisibility;
    /** When true, forces the readonly display. */
    readOnly?: boolean;
  }>();

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    isGM,
    documentGetters: {
      hasEffectsForField,
    },
    documentActions: {
      setFieldOverride,
    },
    _storeUtils: {
      resolveEditability,
      resolveVisibility,
      resolveFieldMeta,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
  const hasActiveEffects = hasEffectsForField(props.fieldPath);

  // Resolve schema field metadata (null for non-schema fields)
  const fieldMeta = computed(() => resolveFieldMeta(props.fieldPath));

  // For schema fields: only show controls if the field supports overrides. For legacy fields: always show.
  const hasOverrides = computed(() => fieldMeta.value ? fieldMeta.value.hasOverrides : true);
  const showGMControls = computed(() =>
    isEditMode.value
    && isGM.value
    && !!props.fieldPath
    && !props.readOnly
    && hasOverrides.value
  );

  // Visibility button: only for identifiable fields (or legacy fields where we default to showing it)
  const showVisibilityButton = computed(() => fieldMeta.value ? fieldMeta.value.identifiable : true);

  const hideEverything = computed(() => 
    (
      !isEditMode.value
      || (!showGMControls.value && !slots.default)
    )
    && !hasActiveEffects.value
  );

  // === VISIBILITY ===
  // Controls display: show this field's OWN override, not the merged restrictive result
  const effectiveVisibility = computed((): FieldVisibility => {
    return resolveVisibility(props.fieldPath, props.defaultVisibility) ?? everyoneVisibility;
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
    await setFieldOverride(props.fieldPath, 'visibility', nextVisibility);
  };

  // === EDITABILITY ===
  // Controls display: show this field's OWN override, not the merged restrictive result
  const effectiveEditability = computed((): FieldEditability => {
    return resolveEditability(props.fieldPath, props.defaultEditability) ?? normalEditability;
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
    await setFieldOverride(props.fieldPath, 'editability', nextEditability);
  };
</script>

<style scoped>
  .controls {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
    justify-content: center;
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
  }

  .field-control:hover {
    opacity: 1;
  }

  .field-control.is-restricted {
    opacity: 1;
    color: var(--color-level-warning);
  }
</style>
