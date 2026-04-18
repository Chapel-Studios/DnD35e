<template>
  <DmControl>
    <div 
      class="identify-toggle"
      :class="{ 'is-identified': isIdentified }"
    >
      <!-- Identified state: show identified icon -->
      <template v-if="isIdentified">
        <i 
          class="fa-solid fa-scroll identify-icon identify-icon--identified" 
          :title="identifiedLabel"
        ></i>
      </template>
      <!-- Unidentified state: show Reveal All button -->
      <template v-else>
        <button 
          type="button" 
          class="reveal-all-btn"
          :title="revealAllHint"
          @click="handleRevealAll"
        >
          <i class="fa-solid fa-eye"></i>
          {{ revealAllLabel }}
        </button>
      </template>
    </div>
  </DmControl>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import { DmControl } from '@vc/index.mjs';
  import { computed, inject } from 'vue';

  const {
    documentGetters: {
      isIdentified,
    },
    documentActions: {
      revealAllSecrets,
    },
  } = inject(DocumentSheetStoreSymbol) as IdentifiableDocumentStore;

  const identifiedLabel = computed(() => game.i18n.localize('dnd35e.IDENTIFIABLE.Identified'));
  const revealAllLabel = computed(() => game.i18n.localize('dnd35e.EFFECT.Secret.RevealAll'));
  const revealAllHint = computed(() => game.i18n.localize('dnd35e.EFFECT.Secret.RevealAllHint'));

  const handleRevealAll = async () => {
    await revealAllSecrets();
  };
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

.reveal-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.5rem;
  background: rgba(128, 0, 128, 0.12);
  border: 1px solid rgba(128, 0, 128, 0.3);
  border-radius: 3px;
  color: var(--color-text-primary, #191813);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgba(128, 0, 128, 0.2);
    border-color: rgba(128, 0, 128, 0.5);
  }

  i {
    font-size: 0.7rem;
  }
}
</style>
