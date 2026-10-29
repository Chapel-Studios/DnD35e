<template>
  <RollDialog hide-total actor-header-label="dnd35e.ROLL.Defender">
    <template #header>
      <ActorRollHeader
        :header="localize('dnd35e.ROLL.Attacker')"
        :image="attackerImage"
        :name="attackerName"
        orientation="right"
      />
    </template>

    <div class="subgrid">
      <div v-if="checkMode !== 'noCheck'" class="ac-box">
        <div class="bonus-row">
          <span class="label">{{ acLabel }}</span>
          <span class="value">
            {{ acTotalFormula }}
            <RollModifierTooltip :modifiers="acModifierList" />
          </span>
        </div>
      </div>

      <div class="damage-box">
        <div class="bonus-row">
          <span class="label">{{ damageLabel }}</span>
          <span class="value">
            {{ damageTotalFormula }}
            <RollModifierTooltip :modifiers="damageModifierList" />
          </span>
        </div>
      </div>
    </div>

    <div class="subgrid">
      <RollDialogFormulaField
        id="defense-situational-modifier"
        v-model="situationalModifier"
        label="dnd35e.ROLL.SituationalModifier"
        :schema="formulaContexts"
      />
      <RollDialogFormulaField
        id="defense-concealment"
        v-model="concealment"
        label="dnd35e.ROLL.Concealment"
        placeholder="dnd35e.ROLL.ConcealmentPlaceholder"
        :schema="formulaContexts"
      />
    </div>

    <div v-if="combatModifierToggles.length" class="combat-modifiers subgrid">
      <div v-if="combatStatusModifiers.length" class="modifier-group">
        <h4>{{ localize('dnd35e.COMBAT.CombatModifiers.CombatStatus') }}</h4>
        <label v-for="mod in combatStatusModifiers" :key="mod.id" class="modifier-toggle">
          <input v-model="mod.checked" type="checkbox" />
          {{ mod.label }}
          <i class="fas fa-circle-question" :title="mod.tooltip" />
        </label>
      </div>
      <div v-if="overrideModifiers.length" class="modifier-group">
        <h4>{{ localize('dnd35e.COMBAT.CombatModifiers.Overrides') }}</h4>
        <label v-for="mod in overrideModifiers" :key="mod.id" class="modifier-toggle">
          <input v-model="mod.checked" type="checkbox" />
          {{ mod.label }}
          <i class="fas fa-circle-question" :title="mod.tooltip" />
        </label>
      </div>
    </div>

    <div class="form-group subgrid">
      <label>{{ localize('dnd35e.COMBAT.Covered.Label') }}</label>
      <MultiOptionToggle :options="coveredOptions" :value="covered" @update="onCoveredUpdate" />
    </div>

    <div class="form-group subgrid full">
      <label>{{ localize('dnd35e.COMBAT.CheckMode.Label') }}</label>
      <MultiOptionToggle :options="checkModeOptions" :value="checkMode" @update="onCheckModeUpdate" />
    </div>

    <slot />
  </RollDialog>
</template>

<script setup lang="ts">
  import type { SelectOption } from '@vc/fields/index.mjs';
  import MultiOptionToggle from '@vc/fields/MultiOptionToggle.vue';
  import { provide } from 'vue';

  import ActorRollHeader from '../RollDialog/ActorRollHeader.vue';
  import RollDialog from '../RollDialog/RollDialog.vue';
  import RollDialogFormulaField from '../RollDialog/RollDialogFormulaField.vue';
  import { RollDialogStoreSymbol } from '../RollDialog/RollDialogStore.mjs';
  import RollModifierTooltip from '../RollDialog/RollModifierTooltip.vue';
  import type { RollDialogContext } from '../RollDialog/types.mjs';
  import { useRollDefenseDialogStore } from './RollDefenseDialogStore.mjs';
  import type { CheckMode, CoveredState, RollDefenseDialogData, RollDefenseDialogResult } from './types.mjs';

  const props = defineProps<{
    context: RollDialogContext<RollDefenseDialogData, RollDefenseDialogResult>;
  }>();

  const store = useRollDefenseDialogStore(props.context);
  provide(RollDialogStoreSymbol, store);
  
  const {
    attacker: {
      image: attackerImage,
      name: attackerName,
    },
    defense: {
      combatModifierToggles,
      combatStatusModifiers,
      overrideModifiers,
      concealment,
      covered,
      situationalModifier,
      checkMode,
      damageLabel,
      damageTotalFormula,
      damageModifierList,
    },
    app: {
      familiarSchema: formulaContexts,
      baseLabel: acLabel,
      totalFormula: acTotalFormula,
      modifierList: acModifierList,
    },
  } = store;

  const coveredOptions: SelectOption<CoveredState>[] = [
    { label: 'dnd35e.COMBAT.Covered.none', value: 'none' },
    { label: 'dnd35e.COMBAT.Covered.covered', value: 'covered' },
    { label: 'dnd35e.COMBAT.Covered.improvedCover', value: 'improvedCover' },
  ];
  const checkModeOptions: SelectOption<CheckMode>[] = [
    { label: 'dnd35e.COMBAT.CheckMode.normal', value: 'normal' },
    { label: 'dnd35e.COMBAT.CheckMode.touch', value: 'touch' },
    { label: 'dnd35e.COMBAT.CheckMode.noCheck', value: 'noCheck' },
  ];

  function onCoveredUpdate(value: CoveredState): void {
    covered.value = value;
  }
  function onCheckModeUpdate(value: CheckMode): void {
    checkMode.value = value;
  }
  function localize(key: string): string {
    return game.i18n.localize(key);
  }
</script>

<style scoped lang="scss">
  :global(.roll-defense-roll-dialog .d20-roll-dialog .options) {
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
  }
</style>
