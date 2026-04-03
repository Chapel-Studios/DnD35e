<template>
  <div v-if="isEditViewMode" class="edit-mode-toggle">
    <label class="toggle-label">
      <input
        type="checkbox"
        :checked="isEditViewMode"
        @change="onToggle"
      >
      <span class="toggle-slider" />
      <span class="toggle-text">{{ toggleLabel }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
  import { type DocumentSheetStore,DocumentSheetStoreSymbol, RenderModeStore, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const store = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;


  const toggleLabel = computed(() =>
    game.i18n.localize(isEditViewMode.value ? 'D35E.SheetModeEdit' : 'D35E.SheetModePlay')
  );

  function onToggle () {
    // toggleEditMode();
  }
</script>

<style scoped lang="scss">
.edit-mode-toggle {
  display: flex;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  font-size: 0.85rem;
  margin: 0;
}

.toggle-label input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: relative;
  width: 36px;
  height: 20px;
  background-color: var(--color-border, #7a7971);
  border-radius: 10px;
  transition: background-color 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-label input:checked + .toggle-slider {
  background-color: var(--color-border-highlight, #7a7971);
}

.toggle-label input:checked + .toggle-slider::before {
  transform: translateX(16px);
}

.toggle-text {
  color: var(--color-text-light-6, #666);
}
</style>
