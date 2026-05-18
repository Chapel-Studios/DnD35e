<template>
  <DocumentSheetBody>
    <template #header-summary>
      <DisableEffect />
      <span v-if="isPlayerEditSecret" class="player-edit-badge">
        <i class="fas fa-pencil" />
        {{ playerEditLabel }}
      </span>
    </template>
  </DocumentSheetBody>
</template>
<script lang="ts" setup>
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { DocumentSheetBody } from '@documents/document/index.mjs';
  import DisableEffect from '@effects/baseActiveEffect/sheet/components/DisableEffect.vue';
  import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
  import { computed, provide } from 'vue';

  import type { Secret } from '../Secret.mjs';
  import { useSecretStore } from './SecretStore.mjs';

  const props = defineProps<{
    context: VueApplicationContext<Secret>;
  }>();

  const store = useSecretStore(props.context);
  provide(DocumentSheetStoreSymbol, store);

  const isPlayerEditSecret = computed(() => props.context.document.system.isPlayerEditSecret);
  const playerEditLabel = game.i18n.localize('dnd35e.EFFECT.Secret.FIELDS.isPlayerEditSecret.label');
</script>

<style lang="scss" scoped>
  .player-edit-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15rem 0.5rem;
    font-size: 0.75rem;
    background: var(--color-level-warning-bg, rgba(255, 165, 0, 0.1));
    color: var(--color-level-warning);
    border-radius: 3px;
    font-style: italic;
  }
</style>
