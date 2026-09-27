<template>
  <div class="col right">
    <HudButton
      v-if="isGM"
      :class="{ active: hidden }"
      :label-key="hidden ? 'HUD.Show' : 'HUD.Hide'"
      :icon-class="hidden ? 'fa-eye-slash' : 'fa-eye'"
      data-action="visibility"
    />

    <HudButton
      label-key="HUD.AssignStatusEffects"
      data-action="togglePalette"
      data-palette="effects"
    >
      <img :src="statusEffectsIcon" alt="">
    </HudButton>    
    <div class="palette status-effects" data-palette="effects">
      <img
        v-for="status in statusEffects"
        :key="status.id"
        class="effect-control"
        :class="status.cssClass"
        :src="status.src"
        :alt="status.title"
        data-action="effect"
        :data-tooltip-text="status.title || undefined"
        :data-status-id="status.id"
      >
    </div>

    <HudButton
      label-key="HUD.SelectMovementAction"
      data-action="togglePalette"
      data-palette="movementActions"
    >
      <img v-if="movementActionImg" :src="movementActionImg" :alt="localize('HUD.SelectMovementAction')">
      <i v-else class="fa-fw" :class="movementActionIcon" inert />
    </HudButton>

    <div class="palette palette-list" data-palette="movementActions">
      <a
        v-for="action in movementActions"
        :key="action.id"
        class="palette-list-entry"
        :class="action.cssClass"
        data-action="movementAction"
        :data-movement-action="action.id"
      >
        <span>
          <img v-if="action.img" :src="action.img" :alt="action.label">
          <i v-else class="fa-fw" :class="action.icon" inert />
          {{ action.label }}
        </span>
      </a>
    </div>

    <HudButton
      :class="{ active: targeted }"
      label-key="HUD.Target"
      data-action="target"
      icon-class="fa-solid fa-bullseye"
    />

    <HudButton
      v-if="canToggleCombat"
      :class="{ active: combatActive }"
      :label-key="combatActive ? 'HUD.ExitCombat' : 'HUD.EnterCombat'"
      data-action="combat"
      icon-class="fa-solid fa-swords"
    />
  </div>
</template>

<script lang="ts">
  export type RightHudBarProps = {
    hidden: boolean;
    statusEffects: TokenHudStatusEffectRow[];
    movementActionImg?: string;
    movementActionIcon?: string;
    movementActions: TokenHudMovementActionRow[];
    targeted: boolean;
    canToggleCombat: boolean;
    combatActive: boolean;
  };
</script>

<script setup lang="ts">
  import type { TokenHudMovementActionRow, TokenHudStatusEffectRow } from '../tokenHudTypes.mjs';
  import HudButton from './HudButton.vue';

  function localize (key: string): string {
    return game.i18n.localize(key);
  }

  const isGM = game.user?.isGM ?? false;
  const statusEffectsIcon: string = CONFIG.controlIcons.effects;

  defineProps<RightHudBarProps>();
</script>

<style lang="scss" scoped>
</style>
