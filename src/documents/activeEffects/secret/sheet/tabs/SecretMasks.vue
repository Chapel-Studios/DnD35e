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
  import { TabStoreSymbol } from '@documents/document/index.mjs';
  import { EFFECT_CHANGE_TARGET } from '@effects/baseActiveEffect/data/constants.mjs';
  import { SYSTEM_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
  import EffectChangesList from '@effects/baseActiveEffect/sheet/components/EffectChangesList.vue';
  import { inject } from 'vue';

  const { getIsTabOpen } = inject(TabStoreSymbol) as TabStore;
  const isActiveTab = getIsTabOpen('masks');

  const masksLabel = game.i18n.localize('dnd35e.EFFECT.Secret.Masks');
  const addMaskLabel = game.i18n.localize('dnd35e.EFFECT.Secret.AddMask');
  const emptyLabel = game.i18n.localize('dnd35e.EFFECT.Secret.EmptyMasks');
  const fieldPlaceholder = game.i18n.localize('dnd35e.EFFECT.Secret.FieldPlaceholder');
  const createMaskData = {
    type: SYSTEM_CHANGE_TYPE.MASK,
    priority: 10,
    target: EFFECT_CHANGE_TARGET.ITEM,
  };
</script>

<style lang="scss" scoped>
  .secret-masks {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
