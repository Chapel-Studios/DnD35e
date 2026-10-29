import { BAKED_AC_CONDITION_IDS } from '@actors/creature/logic/defenseCombatModifiers.mjs';
import { canUserSeeActorName } from '@documents/token/logic/tokenNameVisibility.mjs';
import { reconcileBakedConditionEntry, reconcileFlatFootedDexEntry } from '@source/dice/rollModifierBreakdown.mjs';
import { getDisplayModifiers } from '@source/dice/rollModifiers.mjs';
import type { RollModifier } from '@source/dice/types.mjs';
import { computed, reactive, shallowReactive } from 'vue';

import { resolveFormulaNumber, useRollDialogStore } from '../RollDialog/RollDialogStore.mjs';
import type { RollDialogContext } from '../RollDialog/types.mjs';
import { useRollBreakdown } from '../RollDialog/useRollBreakdown.mjs';
import type { CheckMode, CoveredState, RollDefenseDialogData, RollDefenseDialogResult } from './types.mjs';
import { COVER_AC_BONUS, IMPROVED_COVER } from './types.mjs';

function useRollDefenseDialogStore(context: RollDialogContext<RollDefenseDialogData, RollDefenseDialogResult>) {
  const base = useRollDialogStore(context);
  const data = shallowReactive({
    ...context.data,
    combatModifierToggles: reactive(context.data.combatModifierToggles.map(mod => ({ ...mod }))),
  });
  const toggles = data.combatModifierToggles;
  // Snapshot the state which produced the prepared AC, not live conditions after the dialog opens.
  const bakedConditions = new Set(context.data.actor.statuses);
  const baseConcealment = context.data.actor.system.defense.concealment;
  const isBaked = (id: string) => BAKED_AC_CONDITION_IDS.some(condition => condition === id);
  const checked = (id: string) => toggles.find(mod => mod.id === id)?.checked ?? false;
  const acLabel = computed(() => game.i18n.localize(data.checkMode === 'touch'
    ? 'dnd35e.CREATURE.FIELDS.defense.touchAC.label'
    : 'dnd35e.CREATURE.FIELDS.defense.armorClass.label'));
  const preparedAc = computed<RollModifier[]>(() => {
    if (data.checkMode === 'noCheck') return [];
    const immutableModifiers = data.defenseRollByMode[data.checkMode].immutableModifiers;
    let value = immutableModifiers.filter(mod => !mod.isIgnored).reduce((sum, mod) => sum + mod.value, 0);
    let breakdown = reconcileFlatFootedDexEntry(
      getDisplayModifiers(immutableModifiers), checked('flatFooted'), data.defenderDenyDexToAC
    );
    if (checked('flatFooted') !== data.defenderDenyDexToAC) {
      value += checked('flatFooted') ? -data.defenderDexMod : data.defenderDexMod;
    }
    for (const mod of toggles.filter(mod => isBaked(mod.id))) {
      const reconciliation = reconcileBakedConditionEntry(breakdown, mod.label, mod.checked, bakedConditions.has(mod.id), mod.value);
      breakdown = reconciliation.modifierList;
      value += reconciliation.delta;
    }
    return [{ id: 'preparedAc', label: acLabel.value, value, breakdown }];
  });
  const acRoll = useRollBreakdown(context, () => ({
    label: acLabel.value,
    immutableModifiers: preparedAc.value,
    situationalModifier: data.situationalModifier,
  }), () => {
    if (data.checkMode === 'noCheck') return [];
    const cover = COVER_AC_BONUS[data.covered];
    return [
      ...toggles.filter(mod => mod.checked && mod.value !== 0 && !isBaked(mod.id))
        .map(mod => ({ id: mod.id, label: mod.label, value: mod.value })),
      ...(cover ? [{
        id: 'cover',
        label: game.i18n.localize(data.covered === IMPROVED_COVER ? 'dnd35e.COMBAT.Covered.improvedCover' : 'dnd35e.COMBAT.Covered.covered'),
        value: cover,
      }] : []),
    ];
  });
  // AC is not a rolled check: only the flat portion of situational dice applies.
  const finalModifiers = computed(() => acRoll.modifiers.value.map(mod => mod.formula
    ? { ...mod, value: mod.value, formula: undefined }
    : mod));
  const damageModifierList = computed<RollModifier[]>(() => [
    ...data.damageModifierList,
    ...(checked('applyHalfDamage') ? [{
      label: game.i18n.localize('dnd35e.COMBAT.CombatModifiers.ApplyHalfDamage.Label'),
      value: 0,
      formula: game.i18n.localize('dnd35e.ROLL.RESOLUTION_CARD.HalfDamage'),
    }] : []),
  ]);
  return {
    ...base,
    app: {
      ...base.app,
      baseLabel: acLabel,
      totalFormula: computed(() => String(finalModifiers.value.filter(mod => !mod.isIgnored).reduce((sum, mod) => sum + mod.value, 0))),
      modifierList: finalModifiers,
    },
    attacker: {
      document: computed(() => data.attacker),
      image: computed(() => data.attacker.img ?? ''),
      name: computed(() => canUserSeeActorName(data.attacker, game.user, data.attackerToken?.document)
        ? data.attackerToken?.name ?? data.attacker.token?.name ?? data.attacker.name
        : game.i18n.localize('dnd35e.ROLL.HiddenName')),
    },
    defense: {
      combatModifierToggles: computed(() => toggles),
      combatStatusModifiers: computed(() => toggles.filter(mod => mod.group === 'combatStatus')),
      overrideModifiers: computed(() => toggles.filter(mod => mod.group === 'overrides')),
      concealment: computed({ get: () => data.concealment, set: (value: string) => { data.concealment = value; } }),
      covered: computed({ get: () => data.covered, set: (value: CoveredState) => { data.covered = value; } }),
      situationalModifier: acRoll.situationalModifier,
      checkMode: computed({ get: () => data.checkMode, set: (value: CheckMode) => { data.checkMode = value; } }),
      damageLabel: computed(() => data.damageLabel),
      damageTotalFormula: computed(() => data.damageTotalFormula),
      damageModifierList,
    },
    actions: {
      ...base.actions,
      roll: () => context.resolve({
        finalModifiers: foundry.utils.deepClone(data.checkMode === 'noCheck' ? [] : finalModifiers.value),
        checkMode: data.checkMode,
        concealment: Math.min(100, Math.max(0, baseConcealment, resolveFormulaNumber(data.concealment, context.formulaContext, context.familiarSchema))),
        rollMode: base.app.rollMode.value,
        applyHalfDamage: checked('applyHalfDamage'),
        ignoreCriticalHit: checked('ignoreCriticalHit'),
      }),
    },
  };
}

type RollDefenseDialogStore = ReturnType<typeof useRollDefenseDialogStore>;
type RollDefenseDialogDefenseStore = RollDefenseDialogStore['defense'];
export type { RollDefenseDialogDefenseStore, RollDefenseDialogStore };
export { useRollDefenseDialogStore };
