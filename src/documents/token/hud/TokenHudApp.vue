<script setup lang="ts">
  import HpUpdater from '@actors/creature/sheet/components/HpUpdater.vue';
  import type { TokenHudContext } from '@documents/token/hud/tokenHudTypes.mjs';

  import BottomHudBar from './components/BottomHudBar.vue';
  import LeftHudBar from './components/LeftHudBar.vue';
  import RightHudBar from './components/RightHudBar.vue';

  interface Props {
    context: TokenHudContext;
  }

  const { context } = defineProps<Props>();
</script>

<template>
  <LeftHudBar v-bind="context.leftHudContext" />
  <RightHudBar v-bind="context.rightHudContext" />

  <div
    class="col middle"
    :class="{ 'updater': !context.middleHudContext.useDefaultHpBar}"
  >
    <div class="attribute bar2">
      <input 
        v-if="context.middleHudContext.displayBar2" 
        type="text"
        name="bar2"
        :value="context.middleHudContext.bar2Value"
        :disabled="!context.middleHudContext.bar2Editable"
      >
    </div>

    <div
      class="attribute bar1"
      :class="{ 'placeable-hud control-icon': !context.middleHudContext.useDefaultHpBar}"
    >
      <template v-if="context.middleHudContext.displayBar1">
        <input
          v-if="context.middleHudContext.useDefaultHpBar"
          type="text"
          name="bar1"
          :value="context.middleHudContext.bar1Value"
          :disabled="!context.middleHudContext.bar1Editable"
        >
        <HpUpdater v-else :editable="context.middleHudContext.bar1Editable" compact />
      </template>
    </div>

    <BottomHudBar v-bind="context.bottomHudContext" />
  </div>
</template>

<style scoped lang="scss">
  // Empty state for Weapon Attacks / Combat Maneuvers palettes.
  :deep(.palette-list-entry.disabled) {
    opacity: 0.35;
    cursor: not-allowed;
    filter: grayscale(1);
  }

  .updater {
    top: -2rem;

    .attribute.bar1 {
      height: unset;
      width: unset;
    }
  }
</style>
