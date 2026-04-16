<template>
  <div 
    class="identify-toggle"
    :class="{ 'is-identified': isIdentified }"
  >
    <i class="fa-solid fa-question-circle identify-icon identify-icon--unknown"></i>
    
    <ToggleSwitch
      name="system.isIdentified"
      :label="toggleLabel"
      :checked="isIdentified"
      :editable="isEditViewMode"
      @update="handleToggleUpdate"
    />
    
    <i class="fa-solid fa-scroll identify-icon identify-icon--identified"></i>
  </div>
</template>

<script setup lang="ts">
  import type { RenderModeStore } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import ToggleSwitch from '@vc/Fields/ToggleSwitch.vue';
  import { computed, inject } from 'vue';

  const {
    documentGetters: {
      isIdentified,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject(DocumentSheetStoreSymbol) as IdentifiableDocumentStore;
  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;

  const toggleLabel = computed(() => 
    isIdentified.value 
      ? game.i18n.localize('dnd35e.IDENTIFIABLE.Identified') 
      : game.i18n.localize('dnd35e.IDENTIFIABLE.Unidentified')
  );

  const handleToggleUpdate = (value: boolean) => getDirectFieldUpdater('system.isIdentified')(value);
</script>

<style lang="scss" scoped>
.identify-toggle {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.5rem;
}

.identify-icon {
  font-size: 1rem;
  line-height: 1;
  opacity: 0.45;
  color: var(--identify-icon-muted, #8a8a8a);
  transition:
    color 0.25s ease,
    opacity 0.25s ease,
    text-shadow 0.25s ease,
    transform 0.25s ease;
}

.identify-icon--unknown {
  color: var(--identify-unknown-color, #9a8f7a);
}

.identify-toggle:not(.is-identified) .identify-icon--unknown {
  opacity: 1;
  text-shadow: 0 0 4px rgba(154, 143, 122, 0.4);
  transform: scale(1.05);
}

.identify-icon--identified {
  color: var(--identify-identified-color, #e6c27a);
}

.identify-toggle.is-identified .identify-icon--identified {
  opacity: 1;
  text-shadow:
    0 0 6px rgba(230, 194, 122, 0.6),
    0 0 12px rgba(230, 194, 122, 0.35);
  transform: scale(1.05);
}

@keyframes identify-reveal {
  0% {
    text-shadow: 0 0 0 rgba(230, 194, 122, 0);
  }
  50% {
    text-shadow:
      0 0 10px rgba(230, 194, 122, 0.8),
      0 0 18px rgba(230, 194, 122, 0.5);
  }
  100% {
    text-shadow:
      0 0 6px rgba(230, 194, 122, 0.6),
      0 0 12px rgba(230, 194, 122, 0.35);
  }
}

.identify-toggle.is-identified .identify-icon--identified {
  animation: identify-reveal 0.35s ease-out;
}
</style>
