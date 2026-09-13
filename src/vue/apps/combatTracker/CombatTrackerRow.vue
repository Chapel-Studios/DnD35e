<script setup lang="ts">
  import type { CombatTrackerTurn } from '@documents/combat/combatTrackerTypes.mjs';
  import { computed } from 'vue';

  interface Props {
    turn: CombatTrackerTurn;
    isGM: boolean;
    hasDecimals: boolean;
  }

  const props = defineProps<Props>();

  function localize (key: string): string {
    return game.i18n.localize(key);
  }

  const ACTION_PIPS: { icon: string; flag: 'standard' | 'move' | 'minor'; labelKey: string }[] = [
    { icon: 'fa-swords', flag: 'standard', labelKey: 'dnd35e.COMBAT.ACTION_ECONOMY.Standard' },
    { icon: 'fa-shoe-prints', flag: 'move', labelKey: 'dnd35e.COMBAT.ACTION_ECONOMY.Move' },
    { icon: 'fa-circle', flag: 'minor', labelKey: 'dnd35e.COMBAT.ACTION_ECONOMY.Minor' },
  ];

  const hasResource = computed(() => props.turn.resource !== null && props.turn.resource !== undefined);
  const hasInitiative = computed(() => props.turn.initiative !== null && props.turn.initiative !== undefined);
</script>

<template>
  <li class="combatant" :class="turn.css" :data-combatant-id="turn.id" data-action="activateCombatant">
    <img class="token-image" :src="turn.img" :alt="turn.name" loading="lazy">

    <div class="token-name">
      <strong class="name">{{ turn.name }}</strong>
      <div class="combatant-controls">
        <template v-if="isGM">
          <button
            type="button"
            class="inline-control combatant-control icon fa-solid fa-eye-slash"
            :class="{ active: turn.hidden }"
            data-action="toggleHidden"
            data-tooltip
            :aria-label="localize(turn.hidden ? 'COMBATANT.Show' : 'COMBATANT.Hide')"
          />
          <button
            type="button"
            class="inline-control combatant-control icon fa-solid fa-skull"
            :class="{ active: turn.isDefeated }"
            data-action="toggleDefeated"
            data-tooltip
            :aria-label="localize(turn.isDefeated ? 'COMBATANT.UnmarkDefeated' : 'COMBATANT.MarkDefeated')"
          />
        </template>
        <button
          v-if="turn.canPing"
          type="button"
          class="inline-control combatant-control icon fa-solid fa-bullseye-arrow"
          data-action="pingCombatant"
          data-tooltip
          :aria-label="localize('COMBATANT.Ping')"
        />
        <button
          v-if="!isGM"
          type="button"
          class="inline-control combatant-control icon fa-solid fa-arrows-to-eye"
          data-action="panToCombatant"
          data-tooltip
          :aria-label="localize('COMBATANT.PanTo')"
        />

        <div v-if="turn.actionEconomy" class="action-economy-pips">
          <i
            v-for="pip in ACTION_PIPS"
            :key="pip.flag"
            class="fas action-economy-pip"
            :class="[pip.icon, { 'is-spent': !turn.actionEconomy?.actions[pip.flag] }]"
            :data-tooltip="localize(pip.labelKey)"
          />
          <span class="action-economy-aoo" :data-tooltip="localize('dnd35e.COMBAT.ACTION_ECONOMY.AttacksOfOpportunity')">{{ turn.actionEconomy.actions.aoo }}</span>
        </div>

        <div class="token-effects" :data-tooltip-html="turn.effects.tooltip">
          <img v-for="effect in turn.effects.icons" :key="effect.img" class="token-effect" :src="effect.img" :alt="effect.name">
        </div>
      </div>
    </div>

    <div v-if="hasResource" class="token-resource">
      <span class="resource">{{ turn.resource }}</span>
    </div>

    <div class="token-initiative">
      <template v-if="hasInitiative">
        <span v-if="hasDecimals">{{ turn.initiative }}</span>
        <input
          v-else
          type="text"
          class="initiative-input"
          inputmode="numeric"
          pattern="^[+=\-]?\d*"
          :value="turn.initiative"
          :aria-label="localize('COMBATANT.FIELDS.initiative.label')"
          :readonly="!isGM"
        >
      </template>
      <button
        v-else-if="turn.isOwner"
        type="button"
        class="combatant-control roll"
        data-action="rollInitiative"
        data-tooltip
        :aria-label="localize('COMBAT.InitiativeRoll')"
      />
    </div>
  </li>
</template>

<style scoped lang="scss">
.action-economy-pips {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-inline-end: 0.5rem;
  flex: 0 0 auto;

  .action-economy-pip {
    font-size: var(--font-size-12, 12px);
    opacity: 1;

    &.is-spent {
      opacity: 0.3;
    }
  }

  .action-economy-aoo {
    font-size: var(--font-size-12, 12px);
    opacity: 0.75;
    min-width: 1em;
    text-align: center;
  }
}
</style>
