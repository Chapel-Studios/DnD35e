import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import { canUserSeeActorName } from '@documents/token/logic/tokenNameVisibility.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import { buildDocumentDataMap } from '@helpers/formulae/utils.mjs';
import type { VueDialogContext } from '@vueApps/VueDialogMixin.mjs';
import type { ComputedRef, WritableComputedRef } from 'vue';
import { computed } from 'vue';

import type { RollDialogStore } from '../RollDialog/RollDialogStore.mjs';
import { resolveFormulaNumber, resolveFormulaString, useRollDialogStore } from '../RollDialog/RollDialogStore.mjs';
import type { CombatModifierToggle } from '../WeaponAttackRollDialog/types.mjs';
import type { CheckMode, CoveredState, RollDefenseDialogData, RollDefenseDialogResult } from './types.mjs';
import { COVER_AC_BONUS } from './types.mjs';

/**
 * Store for the Roll Defense Dialog (poc.10 Story E, §10.7) — the defender-side counterpart
 * to `WeaponAttackRollDialogStore`. `context.data.actor` (the base store's primary actor) is
 * the *defender* here; the attacker is surfaced separately for the secondary header slot
 * (mirrors the Attack dialog's `target`, reversed).
 *
 * Cover's AC bonus is deliberately kept out of `combatModifierToggles`' checked-sum — Cover
 * is a 3-way exclusive pick, not an independent checkbox, so it gets its own field/contribution
 * instead of being folded into the same array/sum the checkbox toggles share. It still feeds
 * the live AC preview via its own `registerTotalModifier` call, same mechanism
 * `combatModifierSum`/`situationalModifier` use.
 */
function useRollDefenseDialogStore(
  context: VueDialogContext<RollDefenseDialogData, RollDefenseDialogResult>
): RollDefenseDialogStore {
  const base = useRollDialogStore(context);

  const combatModifierToggles = computed(() => context.data.combatModifierToggles);
  const combatStatusModifiers = computed(() => context.data.combatModifierToggles.filter((mod) => mod.group === 'combatStatus'));
  const overrideModifiers = computed(() => context.data.combatModifierToggles.filter((mod) => mod.group === 'overrides'));
  const combatModifierSum = computed(() => context.data.combatModifierToggles
    .filter((mod) => mod.checked)
    .reduce((sum, mod) => sum + mod.value, 0));

  const concealment = computed({
    get: () => context.data.concealment,
    set: (value: string) => { context.data.concealment = value; },
  });
  const covered = computed({
    get: () => context.data.covered,
    set: (value: CoveredState) => { context.data.covered = value; },
  });
  const coverValue = computed(() => COVER_AC_BONUS[context.data.covered]);
  const situationalModifier = computed({
    get: () => context.data.situationalModifier,
    set: (value: string) => { context.data.situationalModifier = value; },
  });
  const checkMode = computed({
    get: () => context.data.checkMode,
    set: (value: CheckMode) => {
      context.data.checkMode = value;
      // Keeps `app.baseTotal`/`app.total` live as the check mode changes (mirrors Wield Mode's
      // same pattern in WeaponAttackRollDialogStore). 'noCheck' has no meaningful AC — the
      // preview box hides itself instead of reading a stale baseTotal (see RollDefenseDialog.vue).
      if (value !== 'noCheck') context.data.baseTotal = context.data.baseTotalByMode[value];
    },
  });

  const attacker = {
    document: computed(() => context.data.attacker),
    image: computed(() => context.data.attacker.img ?? ''),
    // Same name-visibility rules as WeaponAttackRollDialogStore's `target.name` (§10.8) — the
    // GM always sees the real name; players see it only under the token nameplate's own rules.
    name: computed(() => {
      const attackerActor = context.data.attacker;
      const attackerToken = context.data.attackerToken;
      return canUserSeeActorName(attackerActor, game.user, attackerToken?.document)
        ? attackerToken?.name ?? attackerActor.token?.name ?? attackerActor.name
        : game.i18n.localize('dnd35e.ROLL.HiddenName');
    }),
  };

  // No preferred-alias override yet (see RollDefenseDialogData.situationalModifier's doc) —
  // `self` stays the autocomplete's default term until that Story E task lands.
  const documentDataMap = computed(() => buildDocumentDataMap(context.data.actor, { attacker: context.data.attacker }));
  const formulaContexts = computed<FamiliarSchema>(() => FormulaData.buildFamiliarSchema(documentDataMap.value));

  base.actions.registerTotalModifier({
    value: computed(() => combatModifierSum.value),
    formula: computed(() => `${combatModifierSum.value}`),
  });
  base.actions.registerTotalModifier({
    value: computed(() => coverValue.value),
    formula: computed(() => `${coverValue.value}`),
  });
  base.actions.registerTotalModifier({
    value: computed(() => resolveFormulaNumber(context.data.situationalModifier, documentDataMap.value)),
    formula: computed(() => resolveFormulaString(context.data.situationalModifier, documentDataMap.value)),
  });

  const rollAction = (): void => {
    const applyHalfDamage = context.data.combatModifierToggles.find((mod) => mod.id === 'applyHalfDamage')?.checked ?? false;
    const ignoreCriticalHit = context.data.combatModifierToggles.find((mod) => mod.id === 'ignoreCriticalHit')?.checked ?? false;
    context.resolve({
      checkMode: context.data.checkMode,
      concealment: resolveFormulaNumber(context.data.concealment, documentDataMap.value),
      covered: context.data.covered,
      combatModifiers: context.data.combatModifierToggles,
      situationalModifier: resolveFormulaString(context.data.situationalModifier, documentDataMap.value),
      rollMode: context.data.rollMode,
      applyHalfDamage,
      ignoreCriticalHit,
    });
  };

  return {
    ...base,
    attacker,
    defense: {
      combatModifierToggles,
      combatStatusModifiers,
      overrideModifiers,
      combatModifierSum,
      concealment,
      covered,
      coverValue,
      situationalModifier,
      checkMode,
      formulaContexts,
    },
    actions: { ...base.actions, roll: rollAction },
  };
}

interface RollDefenseDialogAttackerStore {
  document: ComputedRef<ACTORS_DND35E>;
  image: ComputedRef<string>;
  name: ComputedRef<string>;
}
interface RollDefenseDialogDefenseStore {
  combatModifierToggles: ComputedRef<CombatModifierToggle[]>;
  combatStatusModifiers: ComputedRef<CombatModifierToggle[]>;
  overrideModifiers: ComputedRef<CombatModifierToggle[]>;
  combatModifierSum: ComputedRef<number>;
  concealment: WritableComputedRef<string>;
  covered: WritableComputedRef<CoveredState>;
  /** Cover's own resolved AC bonus — kept separate from `combatModifierSum` (see module doc). */
  coverValue: ComputedRef<number>;
  situationalModifier: WritableComputedRef<string>;
  checkMode: WritableComputedRef<CheckMode>;
  /** FormulaFamiliar schema (self/attacker) for the Situational Bonus/Concealment fields' `#` autocomplete dropdown. */
  formulaContexts: ComputedRef<FamiliarSchema>;
}
interface RollDefenseDialogStore extends RollDialogStore {
  attacker: RollDefenseDialogAttackerStore;
  defense: RollDefenseDialogDefenseStore;
}

export type { RollDefenseDialogDefenseStore, RollDefenseDialogStore };
export { useRollDefenseDialogStore };
