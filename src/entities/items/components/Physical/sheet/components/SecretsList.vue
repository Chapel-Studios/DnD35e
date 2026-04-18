<template>
  <DmControl v-if="secrets.length || isEditViewMode">
    <div class="secrets-list">
      <EffectCategory
        v-if="secrets.length"
        :label="localize('dnd35e.EFFECT.Secret.Secrets').value"
        :effects="secrets"
        :can-edit="isEditViewMode"
      />
      <div class="secrets-actions">
        <button
          v-if="isEditViewMode"
          type="button"
          class="create-secret-btn"
          @click="createSecret"
        >
          <i class="fas fa-plus" />
          {{ localize('dnd35e.EFFECT.Secret.AddSecret').value }}
        </button>
        <button
          v-if="secrets.length"
          type="button"
          class="reveal-all-btn"
          :disabled="!hasActiveSecrets"
          @click="revealAllSecrets"
        >
          <i class="fas fa-eye" />
          {{ localize('dnd35e.EFFECT.Secret.RevealAll').value }}
        </button>
      </div>
    </div>
  </DmControl>
</template>

<script setup lang="ts">
  import type { RenderModeStore } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { EffectCategory } from '@items/baseItem/index.mjs';
  import DmControl from '@vc/DmControl.vue';
  import { computed, inject } from 'vue';

  import type { PhysicalDocumentStore } from '../PhysicalItemStore.mjs';

  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      secrets,
    },
    documentActions: {
      createSecret,
      revealAllSecrets,
    },
    _storeUtils: {
      createLocalizedComputed: localize,
    },
  } = inject(DocumentSheetStoreSymbol) as PhysicalDocumentStore;

  const hasActiveSecrets = computed(() => secrets.value.some(s => !s.disabled));
</script>

<style scoped lang="scss">
  .secrets-list {
    display: flex;
    flex-direction: column;
  }

  .secrets-actions {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    justify-content: flex-end;

    button {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.75rem;
      font-size: 0.8rem;
      cursor: pointer;
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: 3px;

      &:hover:not(:disabled) {
        background: var(--color-hover-bg);
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }
    }
  }
</style>
