<template>
  <div class="col left">
    <div class="attribute elevation" data-tooltip :aria-label="localize('HUD.Elevation')">
      <i class="caret fa-solid fa-angle-up" inert />
      <input type="text" name="elevation" :value="elevation" :disabled="elevationDisabled">
    </div>

    <template v-if="canChangeLevel">
      <HudButton
        data-palette="levels"
        data-action="togglePalette"
        label-key="HUD.ChangeLevel"
        icon-class="fa-solid fa-layer-group"
      />
      <div class="palette palette-list" data-palette="levels">
        <a
          v-for="level in levels"
          :key="level.id"
          class="palette-list-entry"
          :class="level.cssClass"
          data-action="level"
          :data-level-id="level.id"
        >
          <span>{{ level.name }}</span>
        </a>
      </div>
    </template>

    <HudButton
      data-action="sort"
      label-key="HUD.ToFrontOrBack"
      icon-class="fa-solid fa-bring-forward"
    />

    <HudButton
      v-if="isGM"
      :class="{ active: locked }"
      :label-key="locked ? 'HUD.Unlock' : 'HUD.Lock'"
      :icon-class="lockedIconClass"
      data-action="locked"
    />

    <HudButton
      v-if="canConfigure"
      label-key="HUD.OpenConfig"
      icon-class="fa-solid fa-gear"
      data-action="config"
    />
  </div>
</template>

<script lang="ts">
  export type LeftHudBarProps = {
    elevation: number;
    elevationDisabled: boolean;
    canChangeLevel: boolean;
    levels: TokenHudLevelRow[];
    locked: boolean;
    canConfigure: boolean;
  };
</script>

<script setup lang="ts">
  import type { TokenHudLevelRow } from '../tokenHudTypes.mjs';
  import HudButton from './HudButton.vue';

  function localize (key: string): string {
    return game.i18n.localize(key);
  }

  const isGM = game.user?.isGM ?? false;

  const { locked } = defineProps<LeftHudBarProps>();

  const lockedIconClass = `fa-solid ${locked ? 'fa-lock' : 'fa-lock-open'}`;
</script>

<style lang="scss" scoped>
</style>
