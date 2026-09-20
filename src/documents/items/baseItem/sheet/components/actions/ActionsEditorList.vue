<template>
  <div>
    <p v-if="!topLevelActions.length" class="actions-empty">{{ localize('dnd35e.WEAPON.ACTIONS.Empty') }}</p>
    <ul v-else class="action-accordion-list">
      <ActionAccordionRow
        v-for="action in topLevelActions"
        :key="action._id"
        :actionId="action._id"
        :actionType="action.type"
      />
    </ul>
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { WeaponStore } from '@items/physical/weapon/index.mjs';
  import { inject } from 'vue';

  import ActionAccordionRow from './ActionAccordionRow.vue';

  const localize = (key: string) => game.i18n.localize(key);
  
  const {
    documentGetters: { topLevelActions },
  } = inject(DocumentSheetStoreSymbol) as WeaponStore;
</script>

<style scoped lang="scss">
  .actions-empty {
    font-style: italic;
    color: var(--color-text-muted, #888);
  }

  .action-accordion-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
</style>
