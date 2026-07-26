<template>
  <EffectRow :effect="effect" :can-edit="canEdit" :show-visibility-toggle="false" :read-only="readOnly">
    <template #effect-badge="{ effect: rowEffect }">
      <i
        v-if="(rowEffect.system as any).isPlayerEditSecret"
        class="fas fa-pencil player-edit-indicator"
        :title="localize('dnd35e.EFFECT.Secret.PlayerEditIndicator').value"
      />
    </template>
  </EffectRow>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { ActiveEffectDnd35e } from '@effects/index.mjs';
  import type { ComputedRef } from 'vue';
  import { inject } from 'vue';

  import EffectRow from './EffectRow.vue';

  interface SecretRowHostStore {
    _storeUtils: {
      createLocalizedComputed: (text: string) => ComputedRef<string>;
    };
  }

  defineProps<{
    effect: ActiveEffectDnd35e;
    canEdit: boolean;
    readOnly?: boolean;
  }>();

  const {
    _storeUtils: {
      createLocalizedComputed: localize,
    },
  } = inject(DocumentSheetStoreSymbol) as SecretRowHostStore;
</script>

<style scoped lang="scss">
  .player-edit-indicator {
    font-size: 0.75rem;
    opacity: 0.6;
    color: var(--color-level-warning);
  }
</style>
