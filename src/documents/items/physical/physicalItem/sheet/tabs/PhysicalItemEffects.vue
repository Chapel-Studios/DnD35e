<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
  import { ItemEffects } from '@items/baseItem/index.mjs';
  import { computed, inject } from 'vue';

  import type { PhysicalDocumentStore } from '../PhysicalItemStore.mjs';

  const {
    documentGetters: {
      secrets,
    },
    documentActions: {
      revealAllSecrets,
    },
    _storeUtils: {
      createLocalizedComputed: localize,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

  const isGM = game.user.isGM;
  const hasActiveSecrets = computed(() => secrets.value.some((s) => !s.disabled));
</script>

<template>
  <ItemEffects :additional-creatable-types="[secretEffectType]">
    <template v-if="isGM" #header-actions>
      <button
        type="button"
        class="reveal-secrets-btn"
        :disabled="!hasActiveSecrets"
        @click="revealAllSecrets"
      >
        <i class="fas fa-eye" />
        {{ localize('dnd35e.EFFECT.Secret.RevealAll').value }}
      </button>
    </template>
  </ItemEffects>
</template>

<style scoped lang="scss">
  .reveal-secrets-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
</style>
