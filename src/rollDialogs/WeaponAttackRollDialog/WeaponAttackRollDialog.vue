<template>
  <RollDialog hide-total>
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
      <div class="to-hit-box">
        <div class="bonus-row">
          <span class="label">{{ toHitLabel }}</span>
          <span class="value">{{ formatBonus(toHitTotal) }}</span>
        </div>
        <RollDialogFormulaField
          id="attack-situational-modifier"
          v-model="attackSituationalModifier"
          label="dnd35e.ROLL.AttackSituationalModifier"
          :contexts="formulaContexts"
        />
      </div>

      <div class="damage-box">
        <div class="bonus-row">
          <span class="label">{{ damageLabel }}</span>
          <span class="value">{{ formatBonus(damageTotal) }}</span>
        </div>
        <RollDialogFormulaField
          id="damage-situational-modifier"
          v-model="damageSituationalModifier"
          label="dnd35e.ROLL.DamageSituationalModifier"
          :contexts="formulaContexts"
        />
      </div>
    </div>

    <div v-if="combatModifierToggles.length" class="combat-modifiers subgrid">
      <div v-if="attackTypeModifiers.length" class="modifier-group">
        <h4>{{ localize('dnd35e.COMBAT.CombatModifiers.AttackType') }}</h4>
        <label v-for="mod in attackTypeModifiers" :key="mod.id" class="modifier-toggle">
          <input v-model="mod.checked" type="checkbox" />
          {{ mod.label }}
          <i class="fas fa-circle-question" :title="mod.tooltip" />
        </label>
      </div>
      <div v-if="combatStatusModifiers.length" class="modifier-group">
        <h4>{{ localize('dnd35e.COMBAT.CombatModifiers.CombatStatus') }}</h4>
        <label v-for="mod in combatStatusModifiers" :key="mod.id" class="modifier-toggle">
          <input v-model="mod.checked" type="checkbox" />
          {{ mod.label }}
          <i class="fas fa-circle-question" :title="mod.tooltip" />
        </label>
      </div>
    </div>
    <div v-if="wieldMode !== undefined" class="form-group subgrid">
      <label>{{ localize('dnd35e.COMBAT.WieldMode.Label') }}</label>
      <MultiOptionToggle :options="wieldModeOptions" :value="wieldMode" @update="onWieldModeUpdate" />
    </div>

    <slot />
  </RollDialog>
</template>

<script setup lang="ts">
  import type { WieldedHand } from '@constants/equipmentSlots.mjs';
  import { BOTH_HANDS_EQUIP_SLOT, MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT } from '@constants/equipmentSlots.mjs';
  import type { SelectOption } from '@vc/fields/index.mjs';
  import MultiOptionToggle from '@vc/fields/MultiOptionToggle.vue';
  import { inject } from 'vue';

  import ActorRollHeader from '../RollDialog/ActorRollHeader.vue';
  import RollDialog from '../RollDialog/RollDialog.vue';
  import RollDialogFormulaField from '../RollDialog/RollDialogFormulaField.vue';
  import { formatBonus, RollDialogStoreSymbol } from '../RollDialog/RollDialogStore.mjs';
  import type { WeaponAttackRollDialogStore } from './WeaponAttackRollDialogStore.mjs';

  const {
    weapon: {
      combatModifierToggles,
      attackTypeModifiers,
      combatStatusModifiers,
      attackSituationalModifier,
      damageSituationalModifier,
      wieldMode,
      formulaContexts,
      damageTotal,
      damageLabel,
    },
    target: {
      image: targetImage,
      name: targetName,
    },
    app: {
      baseLabel: toHitLabel,
      total: toHitTotal,
    },
  } = inject(RollDialogStoreSymbol) as WeaponAttackRollDialogStore;

  const wieldModeOptions: SelectOption<WieldedHand>[] = [
    { label: `dnd35e.COMBAT.WieldMode.${MAIN_HAND_EQUIP_SLOT}`, value: MAIN_HAND_EQUIP_SLOT },
    { label: `dnd35e.COMBAT.WieldMode.${OFF_HAND_EQUIP_SLOT}`, value: OFF_HAND_EQUIP_SLOT },
    { label: `dnd35e.COMBAT.WieldMode.${BOTH_HANDS_EQUIP_SLOT}`, value: BOTH_HANDS_EQUIP_SLOT },
  ];

  function onWieldModeUpdate(value: WieldedHand): void {
    wieldMode.value = value;
  }

  function localize(key: string): string {
    return game.i18n.localize(key);
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
