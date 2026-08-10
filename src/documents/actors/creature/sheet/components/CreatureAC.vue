<template>
  <CreatureDefenseStat
    field-path="system.defense.armorClass"
    :value="resolvedAc"
    :sublabel="acSublabel"
    :class="{ 'flat-footed': isFlatFooted }"
    no-sign
  >
    <button
      class="shield-badge touch-ac-toggle"
      type="button"
      :class="{ 'is-active': acMode === 'touch' }"
      :title="touchAcToggleTitle"
      @click="toggleTouchAC"
    >
      <i :class="touchAcIcon"></i>
    </button>
    <button
      v-if="isFlatFooted"
      class="shield-badge flat-footed-ac-toggle"
      type="button"
      :title="flatFootedRemoveTitle"
      @click="removeFlatFooted"
    >
      <i class="fa-duotone fa-solid fa-boot-heeled"></i>
    </button>
  </CreatureDefenseStat>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject, ref } from 'vue';

  import type { CreatureDocumentStore } from '../CreatureStore.mjs';
  import CreatureDefenseStat from './CreatureDefenseStat.vue';

  type AcMode = 'normal' | 'touch';

  const acMode = ref<AcMode>('normal');
  const toggleTouchAC = (): void => {
    acMode.value = acMode.value === 'touch' ? 'normal' : 'touch';
  };

  const touchAcToggleTitle = computed(() => acMode.value === 'touch'
    ? game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.armorClass.tooltip')
    : game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.touchAC.tooltip'));
  const touchAcIcon = computed(() => acMode.value === 'touch'
    ? 'fa-solid fa-hand'
    : 'fa-light fa-hand');

  const acFieldPath = computed(() => acMode.value === 'touch'
    ? 'system.defense.touchAC'
    : 'system.defense.armorClass');

  const acSublabel = computed(() => acMode.value === 'touch'
    ? game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.touchAC.label')
    : undefined);

  const {
    documentGetters: {
      getViewAwareFieldValue,
      conditions,
    },
    documentActions: {
      toggleCondition,
    },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  const resolvedAc = computed(() => getViewAwareFieldValue<number>(acFieldPath.value) ?? 10);

  // Flat-footed is the real SRD condition (statuses, not a manual view toggle) — the
  // badge only shows while it's active, and clicking it removes the condition rather
  // than switching which AC value is displayed.
  const isFlatFooted = computed(() => conditions.value.find((c) => c.id === 'flatFooted')?.active ?? false);
  const flatFootedRemoveTitle = game.i18n.localize('dnd35e.CREATURE.FIELDS.defense.flatFootedRemoveTooltip');
  const removeFlatFooted = (): void => {
    void toggleCondition('flatFooted');
  };

</script>

<style lang="scss" scoped>
  .flat-footed {
    :deep(.sublabel) {
      width: max-content;
      font-size: 0.8rem;
    }
  }
  
  .shield-badge {
    position: absolute;
    bottom: 0;
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    z-index: 3;
    background-color: var(--sidebar-background);

    &.touch-ac-toggle {
      right: 20%;
    }

    &.flat-footed-ac-toggle {
      left: 20%;
    }
  }
</style>
