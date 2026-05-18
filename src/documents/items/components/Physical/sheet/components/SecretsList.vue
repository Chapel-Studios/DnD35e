<template>
  <DmControl v-if="secrets.length || isEditMode">
    <div class="secrets-list">
      <EffectCategory
        v-if="secrets.length"
        :label="localize('dnd35e.EFFECT.Secret.Secrets').value"
        :effects="secrets"
        :can-edit="isEditMode"
        :show-visibility-toggle="false"
        default-collapsed
      >
        <template #effect-badge="{ effect }">
          <i
            v-if="(effect.system as any).isPlayerEditSecret"
            class="fas fa-pencil player-edit-indicator"
            :title="localize('dnd35e.EFFECT.Secret.PlayerEditIndicator').value"
          />
        </template>
        <template #actions>
          <div class="secrets-actions">
            <button
              v-if="isEditMode"
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
        </template>
      </EffectCategory>
    </div>
  </DmControl>
</template>

<script setup lang="ts">
  import type { RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { EffectCategory } from '@items/baseItem/index.mjs';
  import DmControl from '@vc/DmControl.vue';
  import { computed, inject } from 'vue';

  import type { PhysicalDocumentStore } from '../PhysicalItemStore.mjs';

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
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

  :deep(.player-edit-indicator) {
    font-size: 0.75rem;
    opacity: 0.6;
    color: var(--color-level-warning);
  }
</style>
