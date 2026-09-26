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
  const {
    leftHudContext,
    rightHudContext,
    bottomHudContext,
    middleHudContext: {
      useDefaultHpBar,
      displayBar1,
      bar1Value,
      bar1Editable,
      displayBar2,
      bar2Value,
      bar2Editable,
    },
  } = context;
</script>

<template>
  <LeftHudBar v-bind="leftHudContext" />
  <RightHudBar v-bind="rightHudContext" />

  <div
    class="col middle"
    :class="{ 'updater': !useDefaultHpBar}"
  >
    <div class="attribute bar2">
      <input 
        v-if="displayBar2" 
        type="text"
        name="bar2"
        :value="bar2Value"
        :disabled="!bar2Editable"
      >
    </div>

    <div
      class="attribute bar1"
      :class="{ 'placeable-hud control-icon': !useDefaultHpBar}"
    >
      <template v-if="displayBar1">
        <input
          v-if="useDefaultHpBar"
          type="text"
          name="bar1"
          :value="bar1Value"
          :disabled="!bar1Editable"
        >
        <HpUpdater v-else :editable="bar1Editable" compact />
      </template>
    </div>

    <BottomHudBar v-bind="bottomHudContext" />
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
