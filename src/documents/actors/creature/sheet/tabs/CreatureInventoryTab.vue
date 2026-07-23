<template>
  <ActorInventoryTab>
    <template #top>
      <CoinageFormGroup
        field-path="system.currency"
        class="actor-currency grid-full-row"
      />
    </template>
    <template #bottom>
      <div class="totalValue">{{ inventoryValueLabel }}: {{ creatureValue.toString() }}</div>
    </template>
    <template #append-section>
      <CreatureEncumbrance />
    </template>
  </ActorInventoryTab>
</template>

<script setup lang="ts">
  import ActorInventoryTab from '@actors/baseActor/sheet/tabs/ActorInventoryTab.vue';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { CoinageFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import CreatureEncumbrance from '../components/CreatureEncumbrance.vue';
  import type { CreatureStore } from '../CreatureStore.mjs';

  const { documentGetters: { creatureValue } } = inject(DocumentSheetStoreSymbol) as CreatureStore;
  const inventoryValueLabel = game.i18n.localize('dnd35e.ACTOR.inventory.section.inventoryValue');
</script>
