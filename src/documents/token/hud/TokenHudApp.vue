<script setup lang="ts">
  import type { TokenHudContext } from '@documents/token/hud/tokenHudTypes.mjs';

  interface Props {
    context: TokenHudContext;
  }

  defineProps<Props>();

  function localize (key: string): string {
    return game.i18n.localize(key);
  }
</script>

<template>
  <div class="col left">
    <div class="attribute elevation" data-tooltip :aria-label="localize('HUD.Elevation')">
      <i class="caret fa-solid fa-angle-up" inert />
      <input type="text" name="elevation" :value="context.elevation" :disabled="context.elevationDisabled">
    </div>

    <template v-if="context.canChangeLevel">
      <button
        type="button"
        class="control-icon"
        data-action="togglePalette"
        data-palette="levels"
        data-tooltip
        :aria-label="localize('HUD.ChangeLevel')"
      >
        <i class="fa-solid fa-layer-group" inert />
      </button>
      <div class="palette palette-list" data-palette="levels">
        <a
          v-for="level in context.levels"
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

    <button type="button" class="control-icon" data-action="sort" data-tooltip :aria-label="localize('HUD.ToFrontOrBack')">
      <i class="fa-solid fa-bring-forward" inert />
    </button>

    <button
      v-if="context.isGM"
      type="button"
      class="control-icon"
      :class="{ active: context.locked }"
      data-action="locked"
      data-tooltip
      :aria-label="localize(context.locked ? 'HUD.Unlock' : 'HUD.Lock')"
    >
      <i class="fa-solid" :class="context.locked ? 'fa-lock' : 'fa-lock-open'" inert />
    </button>

    <button v-if="context.canConfigure" type="button" class="control-icon" data-action="config" data-tooltip :aria-label="localize('HUD.OpenConfig')">
      <i class="fa-solid fa-gear" inert />
    </button>
  </div>

  <div class="col middle">
    <div class="attribute bar2">
      <input v-if="context.displayBar2" type="text" name="bar2" :value="context.bar2Value" :disabled="!context.bar2Editable">
    </div>

    <div class="attribute bar1">
      <input v-if="context.displayBar1" type="text" name="bar1" :value="context.bar1Value" :disabled="!context.bar1Editable">
    </div>
  </div>

  <div class="col right">
    <button
      v-if="context.isGM"
      type="button"
      class="control-icon"
      :class="{ active: context.hidden }"
      data-action="visibility"
      data-tooltip
      :aria-label="localize(context.hidden ? 'HUD.Show' : 'HUD.Hide')"
    >
      <i class="fa-solid" :class="context.hidden ? 'fa-eye-slash' : 'fa-eye'" inert />
    </button>

    <button
      type="button"
      class="control-icon"
      data-action="togglePalette"
      data-palette="effects"
      data-tooltip
      :aria-label="localize('HUD.AssignStatusEffects')"
    >
      <img :src="context.statusEffectsIcon" alt="">
    </button>
    <div class="palette status-effects" data-palette="effects">
      <img
        v-for="status in context.statusEffects"
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

    <button
      type="button"
      class="control-icon"
      data-action="togglePalette"
      data-palette="movementActions"
      data-tooltip
      :aria-label="localize('HUD.SelectMovementAction')"
    >
      <img v-if="context.movementActionImg" :src="context.movementActionImg" :alt="localize('HUD.SelectMovementAction')">
      <i v-else class="fa-fw" :class="context.movementActionIcon" inert />
    </button>
    <div class="palette palette-list" data-palette="movementActions">
      <a
        v-for="action in context.movementActions"
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

    <button
      type="button"
      class="control-icon"
      :class="{ active: context.targeted }"
      data-action="target"
      data-tooltip
      :aria-label="localize(context.targeted ? 'HUD.Untarget' : 'HUD.Target')"
    >
      <i class="fa-solid fa-bullseye" inert />
    </button>

    <button
      v-if="context.canToggleCombat"
      type="button"
      class="control-icon"
      :class="{ active: context.combatActive }"
      data-action="combat"
      data-tooltip
      :aria-label="localize(context.combatActive ? 'HUD.ExitCombat' : 'HUD.EnterCombat')"
    >
      <i class="fa-solid fa-swords" inert />
    </button>
  </div>

  <div class="dnd35e-hud-actions">
    <button
      type="button"
      class="control-icon"
      data-action="togglePalette"
      data-palette="weaponAttacks"
      data-tooltip
      :aria-label="localize('dnd35e.COMBAT.HUD.WeaponAttacks')"
    >
      <i class="fa-solid fa-swords" inert />
    </button>
    <div class="palette palette-list" data-palette="weaponAttacks">
      <p v-if="!context.weaponActions.length" class="palette-list-empty">
        {{ localize('dnd35e.COMBAT.HUD.NoWeaponAttacks') }}
      </p>
      <a
        v-for="action in context.weaponActions"
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

    <button
      type="button"
      class="control-icon"
      data-action="togglePalette"
      data-palette="combatManeuvers"
      data-tooltip
      :aria-label="localize('dnd35e.COMBAT.HUD.CombatManeuvers')"
    >
      <i class="fa-solid fa-shield-halved" inert />
    </button>
    <div class="palette palette-list" data-palette="combatManeuvers">
      <a
        v-for="maneuver in context.combatManeuvers"
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

<style scoped lang="scss">
// Distinct from the existing left/middle/right `.col`s: core's shared `#token-hud .col` rule
// stretches columns the full token height for the flanking layout, which doesn't apply here.
.dnd35e-hud-actions {
  position: absolute;
  inset-block-start: 100%;
  inset-inline-start: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  padding-block-start: 4px;
}

// Weapon Attacks / Combat Maneuvers entries the current combatant can't use right now.
.palette-list-entry.disabled {
  opacity: 0.35;
  cursor: not-allowed;
  filter: grayscale(1);
}

.palette-list-empty {
  margin: 0;
  padding: 3px;
  font-style: italic;
  opacity: 0.7;
  white-space: nowrap;
}
</style>
