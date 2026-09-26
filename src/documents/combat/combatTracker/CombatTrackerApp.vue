<script setup lang="ts">
  import type { CombatTrackerContext } from '@documents/combat/combatTrackerTypes.mjs';

  import CombatTrackerRow from './CombatTrackerRow.vue';

  interface Props {
    context: CombatTrackerContext;
  }

  defineProps<Props>();

  function localize (key: string, data?: Record<string, string | number | boolean>): string {
    return data ? game.i18n.format(key, data) : game.i18n.localize(key);
  }
</script>

<template>
  <header class="combat-tracker-header">
    <nav v-if="context.isGM" class="encounters" :class="context.css" :aria-label="localize('COMBAT.NavLabel')">
      <template v-if="context.displayCycle">
        <button
          type="button"
          class="inline-control icon fa-solid fa-plus"
          data-action="createCombat"
          data-tooltip
          :aria-label="localize('COMBAT.Create')"
        />
        <div class="cycle-combats">
          <button
            type="button"
            class="inline-control icon fa-solid fa-caret-left"
            data-action="cycleCombat"
            :data-combat-id="context.previousId"
            :disabled="!context.previousId"
            data-tooltip
            :aria-label="localize('COMBAT.EncounterPrevious')"
          />
          <div class="encounter-count">
            <span class="value">{{ context.currentIndex }}</span>
            <span class="separator">/</span>
            <span class="max">{{ context.combats.length }}</span>
          </div>
          <button
            type="button"
            class="inline-control icon fa-solid fa-caret-right"
            data-action="cycleCombat"
            :data-combat-id="context.nextId"
            :disabled="!context.nextId"
            data-tooltip
            :aria-label="localize('COMBAT.EncounterNext')"
          />
        </div>
        <button type="button" class="inline-control icon fa-solid fa-gear" data-action="trackerSettings" data-tooltip :aria-label="localize('COMBAT.Settings')" />
      </template>
      <template v-else-if="context.combats.length">
        <button type="button" class="inline-control icon fa-solid fa-plus" data-action="createCombat" data-tooltip :aria-label="localize('COMBAT.Create')" />
        <button
          v-for="combat in context.combats"
          :key="combat.id"
          type="button"
          class="inline-control"
          :class="{ active: combat.active }"
          data-action="cycleCombat"
          :data-combat-id="combat.id"
          data-tooltip
          :aria-label="combat.name"
        >
          {{ combat.label }}
        </button>
        <button type="button" class="inline-control icon fa-solid fa-gear" data-action="trackerSettings" data-tooltip :aria-label="localize('COMBAT.Settings')" />
      </template>
      <template v-else>
        <button type="button" class="combat-control-lg" data-action="createCombat">
          <i class="fa-solid fa-plus" inert />
          <span>{{ localize('COMBAT.Create') }}</span>
        </button>
      </template>
    </nav>

    <h2 v-if="context.combatName" class="encounter-name">{{ context.combatName }}</h2>

    <div class="encounter-controls" :class="{ combat: context.hasCombat }">
      <div class="control-buttons left flexrow">
        <template v-if="context.isGM">
          <button
            type="button"
            class="inline-control combat-control icon fa-solid fa-users"
            data-action="rollAll"
            :disabled="!context.combatTurnsLength"
            data-tooltip="COMBAT.RollAll"
            :aria-label="localize('COMBAT.RollAll')"
          />
          <button
            type="button"
            class="inline-control combat-control icon fa-solid fa-users-cog"
            data-action="rollNPC"
            :disabled="!context.combatTurnsLength"
            data-tooltip="COMBAT.RollNPC"
            :aria-label="localize('COMBAT.RollNPC')"
          />
        </template>
        <template v-else>
          <div class="spacer" />
          <div class="spacer" />
        </template>
      </div>

      <strong class="encounter-title">
        <template v-if="context.combats.length">
          {{ context.combatRound ? localize('COMBAT.Round', { round: context.combatRound }) : localize('COMBAT.NotStarted') }}
        </template>
        <template v-else>{{ localize('COMBAT.None') }}</template>
      </strong>

      <div class="control-buttons right flexrow">
        <div class="spacer" />
        <button
          type="button"
          class="encounter-context-menu inline-control combat-control icon fa-solid fa-ellipsis-vertical"
          :disabled="!(context.isGM && context.hasCombat)"
        />
      </div>
    </div>
  </header>

  <ol class="combat-tracker plain">
    <CombatTrackerRow
      v-for="turn in context.turns"
      :key="turn.id"
      :turn="turn"
      :is-g-m="context.isGM"
      :has-decimals="context.hasDecimals"
      :initiative-icon="context.initiativeIcon"
    />
  </ol>

  <nav class="combat-controls" data-tooltip-direction="UP">
    <template v-if="context.hasCombat">
      <template v-if="context.isGM">
        <template v-if="context.combatRound">
          <button type="button" class="inline-control combat-control icon fa-solid fa-backward-step" data-action="previousRound" data-tooltip :aria-label="localize('COMBAT.RoundPrev')" />
          <button type="button" class="inline-control combat-control icon fa-solid fa-arrow-left" data-action="previousTurn" data-tooltip :aria-label="localize('COMBAT.TurnPrev')" />
          <button type="button" class="combat-control combat-control-lg" data-action="endCombat">
            <i class="fa-solid fa-xmark" inert />
            <span>{{ localize('COMBAT.End') }}</span>
          </button>
          <button type="button" class="inline-control combat-control icon fa-solid fa-arrow-right" data-action="nextTurn" data-tooltip :aria-label="localize('COMBAT.TurnNext')" />
          <button type="button" class="inline-control combat-control icon fa-solid fa-forward-step" data-action="nextRound" data-tooltip :aria-label="localize('COMBAT.RoundNext')" />
        </template>
        <template v-else>
          <button type="button" class="combat-control combat-control-lg" data-action="startCombat">
            <i class="fa-solid fa-swords" inert />
            <span>{{ localize('COMBAT.Begin') }}</span>
          </button>
        </template>
      </template>
      <template v-else-if="context.control">
        <button type="button" class="inline-control combat-control icon fa-solid fa-arrow-left" data-action="previousTurn" data-tooltip :aria-label="localize('COMBAT.TurnPrev')" />
        <button type="button" class="combat-control combat-control-lg" data-action="nextTurn">
          <i class="fa-solid fa-check" />
          <span>{{ localize('COMBAT.TurnEnd') }}</span>
        </button>
        <button type="button" class="inline-control combat-control icon fa-solid fa-arrow-right" data-action="nextTurn" data-tooltip :aria-label="localize('COMBAT.TurnNext')" />
      </template>
    </template>
  </nav>
</template>
