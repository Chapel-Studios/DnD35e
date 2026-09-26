import type { WieldedHand } from '@constants/equipmentSlots.mjs';
import { canUserSeeActorName } from '@documents/token/logic/tokenNameVisibility.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import type { DocumentContext } from '@helpers/formulae/index.mjs';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import { buildDocumentDataMap } from '@helpers/formulae/utils.mjs';
import type { VueDialogContext } from '@vueApps/VueDialogMixin.mjs';
import type { ComputedRef, WritableComputedRef } from 'vue';
import { computed } from 'vue';

import type { RollDialogStore } from '../RollDialog/RollDialogStore.mjs';
import { resolveFormulaNumber, resolveFormulaString, useRollDialogStore } from '../RollDialog/RollDialogStore.mjs';
import type { CombatModifierToggle, WeaponAttackRollDialogData, WeaponAttackRollDialogResult } from './types.mjs';

/**
 * Builds the FormulaFamiliar documentDataMap for weapon-attack situational-modifier
 * formulas (poc.10 Story D) — `self` (the actor), `item`, and `target` (both real Foundry
 * Documents) go through `buildDocumentDataMap`'s `.toObject()` conversion as usual.
 * `thisAttack` is kept as the *live* DataModel instance instead — it's an embedded
 * (non-Document) DataModel, and `buildDocumentFamiliar`'s embedded-DataModel branch reads
 * its `.schema` getter directly (same convention as `ActionDataModel._buildFormulaContext`);
 * `.toObject()` would strip that getter and silently drop the context. No separate `actor`
 * key — `self` already points at the same actor, so `#actor.x` would be a pure duplicate.
 * Exported so `RangedAttackRollDialogStore` (which duplicates `rollAction()` for its own
 * ammo field) can reuse the exact same context map.
 */
function buildWeaponAttackFormulaContexts(data: WeaponAttackRollDialogData): Record<string, DocumentContext> {
  const map = buildDocumentDataMap(data.actor, {
    item: data.item,
    target: data.target?.[0] ?? null,
  });
  if (data.thisAttack) map.thisAttack = data.thisAttack as unknown as DocumentContext;
  return map;
}

/**
 * Store for the weapon-attack roll dialogs (Melee/Ranged, poc.10 Story D refactor) — adds
 * its own attack-situational and damage-situational formula fields (deliberately separate,
 * unlike the base's now-removed generic `situationalModifier` — see `RollDialogStore.mts`'s
 * doc), the combat-modifiers checklist, wield mode, and target info on top of the base
 * `RollDialogStore`, and registers checked modifiers' flat sum plus the attack situational
 * modifier as `roll.total`/`roll.totalFormula` contributions (see `registerTotalModifier`).
 */
function useWeaponAttackRollDialogStore<
  TData extends WeaponAttackRollDialogData,
  TResult extends WeaponAttackRollDialogResult
>(context: VueDialogContext<TData, TResult>): WeaponAttackRollDialogStore {
  const base = useRollDialogStore(context);

  const combatModifierToggles = computed(() => context.data.combatModifierToggles);
  const attackTypeModifiers = computed(() => context.data.combatModifierToggles.filter((mod) => mod.group === 'attackType'));
  const combatStatusModifiers = computed(() => context.data.combatModifierToggles.filter((mod) => mod.group === 'combatStatus'));
  const combatModifierSum = computed(() => context.data.combatModifierToggles
    .filter((mod) => mod.checked)
    .reduce((sum, mod) => sum + mod.value, 0));

  const attackSituationalModifier = computed({
    get: () => context.data.attackSituationalModifier,
    set: (value: string) => { context.data.attackSituationalModifier = value; },
  });
  const damageSituationalModifier = computed({
    get: () => context.data.damageSituationalModifier ?? '',
    set: (value: string) => { context.data.damageSituationalModifier = value; },
  });
  const wieldMode = computed({
    get: () => context.data.wieldModeFromEquippedSlots,
    set: (value: WieldedHand) => {
      context.data.wieldModeFromEquippedSlots = value;
      // Keeps `app.baseTotal`/`app.total` live as the player overrides Wield Mode, instead of
      // staying frozen at whatever hand was auto-detected when the dialog opened.
      context.data.baseTotal = context.data.baseTotalByHand[value];
    },
  });
  const handBab = computed(() => context.data.handBab);

  const target = {
    documents: computed(() => context.data.target ?? []),
    image: computed(() => context.data.target?.[0]?.img ?? ''),
    // Respects the target token's own name-visibility setting (§10.8 follow-up) — the GM
    // always sees the real name; players see it only under the same rules Foundry's own
    // token nameplate uses (see canUserSeeActorName()'s doc for the "or on hover" mapping).
    name: computed(() => {
      const targetActor = context.data.target?.[0] ?? null;
      if (!targetActor) return '';
      return canUserSeeActorName(targetActor, game.user)
        ? targetActor.token?.name ?? targetActor.name
        : game.i18n.localize('dnd35e.ROLL.HiddenName');
    }),
  };

  const documentDataMap = computed(() => buildWeaponAttackFormulaContexts(context.data));
  // Full FormulaFamiliar schema (self/item/thisAttack/target) for the situational modifier
  // fields' `#` autocomplete dropdown — see RollDialogFormulaField.vue's `contexts` prop.
  // Built from the exact same context map used to resolve them below. `target`'s generic
  // "Target" fallback label is overridden to match the dialog header's "Defender" wording.
  const formulaContexts = computed<FamiliarSchema>(() => {
    const schema = FormulaData.buildFamiliarSchema(documentDataMap.value);
    if (schema.target) schema.target = { ...schema.target, display: game.i18n.localize('dnd35e.ROLL.Defender') };
    return schema;
  });

  base.actions.registerTotalModifier({
    value: computed(() => combatModifierSum.value),
    formula: computed(() => `${combatModifierSum.value}`),
  });
  base.actions.registerTotalModifier({
    value: computed(() => resolveFormulaNumber(context.data.attackSituationalModifier, documentDataMap.value)),
    formula: computed(() => resolveFormulaString(context.data.attackSituationalModifier, documentDataMap.value)),
  });

  const rollAction = (): void => {
    const resolvedAttackSituational = resolveFormulaString(context.data.attackSituationalModifier, documentDataMap.value);
    const toggleSum = combatModifierSum.value;
    const attackSituationalModifier = toggleSum === 0
      ? resolvedAttackSituational
      : resolvedAttackSituational
        ? `${resolvedAttackSituational} ${toggleSum >= 0 ? '+' : '-'} ${Math.abs(toggleSum)}`
        : `${toggleSum}`;
    context.resolve({
      attackSituationalModifier,
      rollMode: context.data.rollMode,
      combatModifiers: context.data.combatModifierToggles,
      damageSituationalModifier: resolveFormulaString(context.data.damageSituationalModifier ?? '', documentDataMap.value),
      wieldMode: context.data.wieldModeFromEquippedSlots,
    } as TResult);
  };

  return {
    ...base,
    target,
    weapon: {
      combatModifierToggles,
      attackTypeModifiers,
      combatStatusModifiers,
      combatModifierSum,
      attackSituationalModifier,
      damageSituationalModifier,
      wieldMode,
      handBab,
      formulaContexts,
      damageLabel: computed(() => context.data.damageLabel),
      // Live total (poc.10 Story D) — pre-dialog base plus the resolved damage situational
      // modifier's flat portion, mirroring `app.total`'s base+contributions shape for to-hit.
      damageTotal: computed(() => context.data.damageTotal
        + resolveFormulaNumber(context.data.damageSituationalModifier ?? '', documentDataMap.value)),
    },
    actions: { ...base.actions, roll: rollAction },
  };
}

interface WeaponAttackRollDialogTargetStore {
  documents: ComputedRef<NonNullable<WeaponAttackRollDialogData['target']>>;
  image: ComputedRef<string>;
  name: ComputedRef<string>;
}
interface WeaponAttackRollDialogWeaponStore {
  combatModifierToggles: ComputedRef<CombatModifierToggle[]>;
  attackTypeModifiers: ComputedRef<CombatModifierToggle[]>;
  combatStatusModifiers: ComputedRef<CombatModifierToggle[]>;
  combatModifierSum: ComputedRef<number>;
  attackSituationalModifier: WritableComputedRef<string>;
  damageSituationalModifier: WritableComputedRef<string>;
  wieldMode: WritableComputedRef<WieldedHand | undefined>;
  /** Raw BAB pool per hand — feeds the Wield Mode toggle's per-option `(+N)` label. */
  handBab: ComputedRef<Record<WieldedHand, number>>;
  /** Full FormulaFamiliar schema (self/item/thisAttack/target) for the situational modifier fields' `#` autocomplete dropdown. */
  formulaContexts: ComputedRef<FamiliarSchema>;
  /** Damage box's base-row label, mirrors `RollDialogAppStore.baseLabel`. */
  damageLabel: ComputedRef<string>;
  /** Damage box's base-row total, mirrors `RollDialogAppStore.baseTotal`. */
  damageTotal: ComputedRef<number>;
}
interface WeaponAttackRollDialogStore extends RollDialogStore {
  target: WeaponAttackRollDialogTargetStore;
  weapon: WeaponAttackRollDialogWeaponStore;
}

export type { WeaponAttackRollDialogStore, WeaponAttackRollDialogWeaponStore };
export { buildWeaponAttackFormulaContexts, useWeaponAttackRollDialogStore };
