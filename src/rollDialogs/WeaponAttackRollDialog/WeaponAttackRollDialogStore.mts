import type { WieldedHand } from '@constants/equipmentSlots.mjs';
import { canUserSeeActorName } from '@documents/token/logic/tokenNameVisibility.mjs';
import { computed, reactive, ref } from 'vue';

import { useRollDialogStore } from '../RollDialog/RollDialogStore.mjs';
import { useRollBreakdown } from '../RollDialog/useRollBreakdown.mjs';
import type { WeaponAttackRollDialogContext, WeaponAttackRollDialogResult } from './types.mjs';

function useWeaponAttackRollDialogStore(context: WeaponAttackRollDialogContext) {
  const base = useRollDialogStore(context);
  const hand = ref(context.data.wieldedHand);
  const toggles = reactive(context.data.combatModifierToggles.map(toggle => ({ ...toggle })));
  const wieldMode = computed({
    get: () => hand.value,
    set: (value: WieldedHand) => { hand.value = value; },
  });
  const toggleModifiers = computed(() => toggles.map(toggle => toggle.createRollModifiers(toggle.checked, hand.value)));
  const attackRoll = useRollBreakdown(context, () => ({
    ...context.data.attackRoll,
    immutableModifiers: context.data.attackRoll.immutableModifiersByHand[hand.value],
  }), () => toggleModifiers.value.flatMap(mod => mod.attackModifiers),
  game.i18n.localize('dnd35e.ROLL.AttackSituationalModifier'));
  const damageRoll = useRollBreakdown(context, () => ({
    ...context.data.damageRoll,
    immutableModifiers: context.data.damageRoll.immutableModifiersByHand[hand.value],
  }), () => toggleModifiers.value.flatMap(mod => mod.damageModifiers),
  game.i18n.localize('dnd35e.ROLL.DamageSituationalModifier'));

  const target = {
    documents: computed(() => context.data.target ?? []),
    image: computed(() => context.data.target?.[0]?.img ?? ''),
    name: computed(() => {
      const actor = context.data.target?.[0];
      if (!actor) return '';
      const token = context.data.targetToken;
      return canUserSeeActorName(actor, game.user, token?.document)
        ? token?.name ?? actor.token?.name ?? actor.name
        : game.i18n.localize('dnd35e.ROLL.HiddenName');
    }),
  };

  const getResult = (): WeaponAttackRollDialogResult => ({
    rollMode: base.app.rollMode.value,
    wieldMode: hand.value,
    attackModifiers: foundry.utils.deepClone(attackRoll.modifiers.value),
    damageModifiers: foundry.utils.deepClone(damageRoll.modifiers.value),
    combatModifiers: toggles.map(({ id, checked }) => ({ id, checked })),
  });

  return {
    ...base,
    target,
    attackRoll,
    damageRoll,
    app: { ...base.app, wieldMode, handBab: computed(() => context.data.handBab) },
    toggles,
    getResult,
    actions: { ...base.actions, roll: () => context.resolve(getResult()) },
  };
}

type WeaponAttackRollDialogStore = ReturnType<typeof useWeaponAttackRollDialogStore>;

export type { WeaponAttackRollDialogStore };
export { useWeaponAttackRollDialogStore };
