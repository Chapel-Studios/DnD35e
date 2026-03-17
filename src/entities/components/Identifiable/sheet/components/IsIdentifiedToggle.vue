<template>
  <DmControl>
    <div 
      class="identify-toggle"
      :class="{ 'is-identified': isIdentified }"
    >
      <!-- Edit mode: show toggle -->
      <template v-if="isEditable">
        <ToggleSwitch
          name="system.isIdentified"
          :checked="isIdentified"
          @update="handleToggleUpdate"
        >
          <template #false>
            <i class="fa-solid fa-question-circle identify-icon identify-icon--unknown" :title="unidentifiedLabel"></i>
          </template>
          <template #true>
            <i class="fa-solid fa-scroll identify-icon identify-icon--identified" :title="identifiedLabel"></i>
          </template>
        </ToggleSwitch>
      </template>
      <!-- Readonly mode: show current state icon only -->
      <template v-else>
        <i 
          v-if="isIdentified" 
          class="fa-solid fa-scroll identify-icon identify-icon--identified" 
          :title="identifiedLabel"
        ></i>
        <i 
          v-else 
          class="fa-solid fa-question-circle identify-icon identify-icon--unknown" 
          :title="unidentifiedLabel"
        ></i>
      </template>
    </div>
  </DmControl>
</template>

<script setup lang="ts">
  import { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import { ToggleSwitch } from '@vc/Fields/index.mjs';
  import { DmControl } from '@vc/index.mjs';
  import { computed, inject } from 'vue';

  const {
    identifiableGetters: {
      isIdentified,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
    isEditable,
  } = inject('documentSheetStore') as IdentifiableDocumentStore;

  const identifiedLabel = computed(() => game.i18n.localize('D35E.Identified'));
  const unidentifiedLabel = computed(() => game.i18n.localize('D35E.Unidentified'));

  const handleToggleUpdate = (value: boolean) => getDirectFieldUpdater('system.isIdentified')(value);
</script>

<style lang="scss" scoped>
.identify-toggle {
  display: grid;
  align-items: center;
  justify-items: center;
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
