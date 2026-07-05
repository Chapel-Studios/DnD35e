<template>
  <div class="creature-sidebar">
    <EquipmentSilhouettePane />
    <CreatureHP />
    <!-- Actions placeholder -->
    <div class="actions-group">
      <div class="stat-group-label">{{ localize('dnd35e.ACTOR.section.Actions') }}</div>
      <div class="actions-empty-list"></div>
    </div>
  </div>  
</template>

<script setup lang="ts">
  import EquipmentSilhouettePane from '@actors/baseActor/sheet/components/EquipmentSilhouettePane.vue';

  import CreatureHP from './CreatureHP.vue';
  
  const localize = (key: string) => game.i18n.localize(key);
</script>
  
<style lang="scss" scoped>
  .creature-sidebar {
    gap: 0.75rem;
    display: grid;
    width: max-content;
  }

  .misc-group {
    display: grid;
    grid-auto-flow: column;
    gap: 1rem;
    padding: 0 0.25rem;

    :deep(.form-group) {
      border: solid 1px;
      display: grid;
      grid-auto-flow: column;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.5rem;
    }
  }
</style>
