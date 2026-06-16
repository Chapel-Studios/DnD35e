<template>
  <CreatureDefenseStat
    fieldPath="system.defense.armorClass"
    :value="resolvedAc"
    :sublabel="shieldSublabel"
  >
    <button
      class="sheild-badge touch-ac-toggle"
      type="button"
      :class="{ 'is-active': showTouchAC }"
      :title="touchAcToggleTitle"
      @click="toggleTouchAC"
    >
      <i :class="touchAcIcon"></i>
    </button>
    <button
      v-if="showFlatFootedAC"
      class="sheild-badge touch-ac-toggle"
      type="button"
      :class="{ 'is-active': showTouchAC }"
      :title="flatFootedAcTitle"
    >
      <i class="fa-duotone fa-solid fa-boot-heeled"></i>
    </button>
  </CreatureDefenseStat>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject, ref } from 'vue';

  import type { CreatureStore } from '../CreatureStore.mjs';
  import CreatureDefenseStat from './CreatureDefenseStat.vue';

  const showTouchAC = ref(false);
  const toggleTouchAC = () => showTouchAC.value = !showTouchAC.value;
  const touchAcToggleTitle = computed(() => showTouchAC.value
    ? game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.armorClass.tooltip')
    : game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.touchAC.tooltip'));
  const touchAcIcon = computed(() => showTouchAC.value
    ? 'fa-solid fa-hand'
    : 'fa-light fa-hand');

  const shieldSublabel = computed(() => showTouchAC.value
    ? game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.touchAC.label')
    : undefined);
  
  const flatFootedAcTitle = '';
  const showFlatFootedAC = ref(false); // TODO: implement flat-footed AC toggle

  const {
    documentGetters: {
      getArmorClass,
    },
  } = inject(DocumentSheetStoreSymbol) as CreatureStore;

  const resolvedAc = computed(() => {
    return getArmorClass(showTouchAC.value, showFlatFootedAC.value);
  });

</script>

<style lang="scss" scoped>
  .sheild-badge {
    position: absolute;
    bottom: 0;
    right: 20%;
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    z-index: 3;
    background-color: var(--sidebar-background);
  }
</style>
