<template>
  <section
    v-show="isActiveTab"
    class="secret-masks"
    data-group="primary"
    data-tab="masks"
  >
    <DescriptionEditor />
    <EffectChangesList
      variant="mask"
      :title="masksLabel"
      :add-label="addMaskLabel"
      :empty-label="emptyLabel"
      :key-placeholder="fieldPlaceholder"
      :show-change-field-controls="false"
      :create-change-data="createMaskData"
    />
  </section>
</template>

<script setup lang="ts">
  import type { TabStore } from '@documents/document/index.mjs';
  import { DescriptionEditor } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, TabStoreSymbol } from '@documents/document/index.mjs';
  import { EFFECT_CHANGE_TARGET } from '@effects/baseActiveEffect/data/constants.mjs';
  import { SYSTEM_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
  import type { ActiveEffectConfigStore } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
  import EffectChangesList from '@effects/baseActiveEffect/sheet/components/EffectChangesList.vue';
  import { computed, inject } from 'vue';

  const { getIsTabOpen } = inject(TabStoreSymbol) as TabStore;
  const isActiveTab = getIsTabOpen('masks');
  // Generic ActiveEffectConfigStore (not SecretStore) - importing SecretStore here would
  // be circular, since SecretStore.mts itself imports this tab via tabs/index.mts.
  const store = inject(DocumentSheetStoreSymbol) as ActiveEffectConfigStore;

  const masksLabel = game.i18n.localize('dnd35e.EFFECT.Secret.Masks');
  const addMaskLabel = game.i18n.localize('dnd35e.EFFECT.Secret.AddMask');
  const emptyLabel = game.i18n.localize('dnd35e.EFFECT.Secret.EmptyMasks');
  const fieldPlaceholder = game.i18n.localize('dnd35e.EFFECT.Secret.FieldPlaceholder');
  // A Secret AE's parent may be an Item (existing use: unidentified items) or an Actor
  // (new: Secrets as a Character capability, poc.10 Story I) - new mask rows must default
  // to whichever target the effect is actually embedded on, not always 'item'.
  const createMaskData = computed(() => ({
    type: SYSTEM_CHANGE_TYPE.MASK,
    priority: 10,
    target: store._storeUtils.document.value.parent?.documentName === 'Actor'
      ? EFFECT_CHANGE_TARGET.ACTOR
      : EFFECT_CHANGE_TARGET.ITEM,
  }));
</script>

<style lang="scss" scoped>
  .secret-masks {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
