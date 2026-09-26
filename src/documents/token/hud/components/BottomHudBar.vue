<template>
  <div class="dnd35e-hud-actions">
    <HudButton
      data-action="togglePalette"
      data-palette="weaponAttacks"
      label-key="dnd35e.COMBAT.HUD.WeaponAttacks"
      iconClass="fa-solid fa-swords"
      tooltip-direction="UP"
    />
    <div class="palette palette-list" data-palette="weaponAttacks">
      <p v-if="!weaponActions.length" class="palette-list-empty">
        {{ localize('dnd35e.COMBAT.HUD.NoWeaponAttacks') }}
      </p>
      <a
        v-for="action in weaponActions"
        :key="`${action.itemId}.${action.actionId}`"
        class="palette-list-entry"
        :class="{ disabled: !action.enabled }"
        data-action="attackAction"
        :data-item-id="action.itemId"
        :data-action-id="action.actionId"
        :data-enabled="action.enabled"
      >
        <span><img :src="action.img" alt="">{{ action.label }}</span>
      </a>
    </div>

    <HudButton
      data-action="togglePalette"
      data-palette="combatManeuvers"
      label-key="dnd35e.COMBAT.HUD.CombatManeuvers"
      iconClass="fa-solid fa-shield-halved"
      tooltip-direction="UP"
    />
    <div class="palette palette-list" data-palette="combatManeuvers">
      <a
        v-for="maneuver in combatManeuvers"
        :key="maneuver.id"
        class="palette-list-entry"
        :class="{ disabled: !maneuver.enabled }"
        data-action="combatManeuver"
        :data-maneuver-id="maneuver.id"
        :data-enabled="maneuver.enabled"
      >
        <span>{{ maneuver.label }}</span>
      </a>
    </div>
  </div>
</template>

<script lang="ts">
  export type BottomHudBarProps = {
    weaponActions: TokenHudWeaponActionRow[];
    combatManeuvers: TokenHudCombatManeuverRow[];
  };
</script>

<script setup lang="ts">
  import type { TokenHudCombatManeuverRow, TokenHudWeaponActionRow } from '../tokenHudTypes.mjs';
  import HudButton from './HudButton.vue';

  function localize (key: string): string {
    return game.i18n.localize(key);
  }

  defineProps<BottomHudBarProps>();
</script>

<style scoped lang="scss">
  // stretches columns the full token height for the flanking layout, which doesn't apply here.
  .dnd35e-hud-actions {
    position: absolute;
    inset-block-start: 100%;
    inset-inline-start: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
    height: calc(var(--column-width) + 0.5rem);
    align-items: center;

    .palette.palette-list {
      top: 100%;
      transform: unset;
    }
  
    .palette-list-empty {
      margin: 0;
      padding: 0.25rem;
      font-style: italic;
      opacity: 0.7;
      white-space: nowrap;
    }
  }
</style>
