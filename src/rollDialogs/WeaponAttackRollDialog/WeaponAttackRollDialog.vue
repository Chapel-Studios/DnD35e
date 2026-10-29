<template>
  <RollDialog actor-header-label="dnd35e.ROLL.Attacker">
    <template #header>
      <ActorRollHeader
        v-if="targetName"
        :header="localize('dnd35e.ROLL.Defender')"
        :image="targetImage"
        :name="targetName"
        orientation="right"
      />
    </template>

    <div class="subgrid">
      <RollBreakdown
        class="to-hit-box"
        type="multi"
        input-id="attack-situational-modifier"
        situational-label="dnd35e.ROLL.AttackSituationalModifier"
        v-bind="attackRoll"
        :schema="familiarSchema"
      />
      
      <RollBreakdown
        class="damage-box"
        type="multi"
        :show-sign="false"
        input-id="damage-situational-modifier"
        situational-label="dnd35e.ROLL.DamageSituationalModifier"
        v-bind="damageRoll"
        :schema="familiarSchema"
      />
    </div>

    <slot />

    <div class="form-group subgrid">
      <label>{{ localize('dnd35e.COMBAT.WieldMode.Label') }}</label>
      <MultiOptionToggle
        :options="wieldModeOptions"
        :value="wieldMode"
        @update="onWieldModeUpdate"
      />
    </div>
  </RollDialog>
</template>

<script setup lang="ts">
  import { WIELD_HANDS, type WieldedHand } from '@constants/equipmentSlots.mjs';
  import type { SelectOption } from '@vc/fields/index.mjs';
  import MultiOptionToggle from '@vc/fields/MultiOptionToggle.vue';
  import { computed, inject } from 'vue';

  import ActorRollHeader from '../RollDialog/ActorRollHeader.vue';
  import RollBreakdown from '../RollDialog/RollBreakdown.vue';
  import RollDialog from '../RollDialog/RollDialog.vue';
  import { formatBonus, RollDialogStoreSymbol } from '../RollDialog/RollDialogStore.mjs';
  import type { WeaponAttackRollDialogStore } from './WeaponAttackRollDialogStore.mjs';

  const {
    attackRoll,
    damageRoll,
    target: {
      image: targetImage,
      name: targetName,
    },
    app: {
      familiarSchema,
      wieldMode,
      handBab,
    },
  } = inject(RollDialogStoreSymbol) as WeaponAttackRollDialogStore;

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  // Each option's label gets a live `(+N)` BAB suffix (tokenHudActions.mts's own convention) —
  // `MultiOptionToggle` runs `game.i18n.localize()` on the composed string too, which is a
  // no-op once it no longer matches a translation key (see SelectFormGroup's same idiom).
  const wieldModeOptions = computed<SelectOption<WieldedHand>[]>(() => WIELD_HANDS.map(option => ({
    value: option,
    label: `${localize(`dnd35e.COMBAT.WieldMode.${option}`)} (${formatBonus(handBab.value[option])})`,
  })));
  
  function onWieldModeUpdate(value: WieldedHand): void {
    wieldMode.value = value;
  }
</script>

<style scoped lang="scss">
  :global(.weapon-attack-roll-dialog .d20-roll-dialog .options) {
    grid-template-columns: 1fr 1fr;
  }

  .full {
    grid-column: span 2;
  }

  .bonus-row {
    display: flex;
    justify-content: space-around;
    font-size: 1.2rem;
  }

  .target-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .target-image {
      width: 2rem;
      height: 2rem;
      border-radius: 4px;
      object-fit: cover;
    }

    .label {
      font-weight: 500;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    label {
      font-weight: 500;
      font-size: 0.9rem;
    }
  }

  .combat-modifiers {
    gap: 0.75rem;
    align-items: stretch;

    .modifier-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-auto-rows: min-content;
      gap: 0.25rem 0.5rem;
      flex: 1 1 20rem;
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 0.5rem;

      h4 {
        grid-column: 1 / -1;
        margin: 0;
        font-size: 1.15rem;
        letter-spacing: 0.075rem;
        font-weight: 500;
      }
    }

    .modifier-toggle {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.85rem;

      .fa-circle-question {
        opacity: 0.6;
      }
    }
    
    .wield-mode {
      align-items: center;
    }
  }
</style>
