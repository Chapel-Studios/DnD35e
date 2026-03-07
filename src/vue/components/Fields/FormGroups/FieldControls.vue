<template>
  <div v-if="showControls" class="controls">
    <!-- GM permission controls -->
    <template v-if="isGM && fieldPath">
      <button
        type="button"
        class="permission-control visibility-control"
        :class="{ 'is-restricted': isVisibilityRestricted }"
        :title="visibilityTooltip"
        @click="cycleVisibility"
      >
        <i :class="visibilityIcon"></i>
      </button>
      <button
        type="button"
        class="permission-control editability-control"
        :class="{ 'is-restricted': isEditabilityRestricted }"
        :title="editabilityTooltip"
        @click="toggleEditability"
      >
        <i :class="editabilityIcon"></i>
      </button>
    </template>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    showControls: boolean;
    isGM: boolean;
    fieldPath?: string;
    isVisibilityRestricted: boolean;
    isEditabilityRestricted: boolean;
    visibilityIcon: string;
    visibilityTooltip: string;
    editabilityIcon: string;
    editabilityTooltip: string;
  }>();

  const emit = defineEmits<{
    cycleVisibility: [];
    toggleEditability: [];
  }>();

  const cycleVisibility = () => emit('cycleVisibility');
  const toggleEditability = () => emit('toggleEditability');
</script>

<style scoped>
.controls {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
}

/* Permission control buttons */
.permission-control {
  background: transparent;
  border: none;
  padding: 0.125rem 0.25rem;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s ease;
  font-size: var(--font-size-11);
}

.permission-control:hover {
  opacity: 1;
}

.permission-control.is-restricted {
  opacity: 1;
  color: var(--color-level-warning);
}
</style>
