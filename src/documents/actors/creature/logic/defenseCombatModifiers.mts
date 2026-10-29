/**
 * Roll Defense Dialog's Combat Status/Overrides toggle builder (poc.10 Story E, §10.7) —
 * defender-side sibling of `WeaponAttack/combatModifiers.mts`'s `createCombatModifiers()`.
 * Every toggle here reads from the **target** being attacked, not the attacker.
 *
 * @module
 */
import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import {
  CHARGED_CONDITION_ID,
  DEFENSIVE_FIGHTING_CONDITION_ID,
  FLAT_FOOTED_CONDITION_ID,
  TOTAL_DEFENSE_CONDITION_ID,
} from '@constants/conditions.mjs';
import type { DefenseModifierToggle } from '@source/rollDialogs/RollDefenseDialog/types.mjs';

/**
 * Combat Status toggle ids whose flat SRD bonus is already baked into the defender's
 * `armorClass`/`touchAC` once truly active, via the matching condition's own `acAdjustment()`
 * AE (`conditions.mts`) — `evaluateDefense()`/`RollDefenseDialogStore` must reconcile these
 * against `actor.statuses.has(id)` (`reconcileBakedConditionEntry()`) rather than naively
 * summing `toggle.value` on top of `baseAc`, or the real bonus gets double-counted whenever
 * the checkbox agrees with the real condition (the common case). `flatFooted` isn't here —
 * its own value is always `0`; it's reconciled separately against `defenderDenyDexToAC`.
 */
const BAKED_AC_CONDITION_IDS = [CHARGED_CONDITION_ID, TOTAL_DEFENSE_CONDITION_ID, DEFENSIVE_FIGHTING_CONDITION_ID] as const;

const createDefenseCombatModifiers = (actor: ACTORS_DND35E): DefenseModifierToggle[] => {
  const localize = (key: string) => game.i18n.localize(`dnd35e.COMBAT.CombatModifiers.${key}`);

  return [
    {
      id: 'charged',
      group: 'combatStatus',
      label: localize('Charged.Label'),
      tooltip: localize('Charged.Tooltip'),
      value: -2,
      checked: actor.statuses.has(CHARGED_CONDITION_ID),
      autoDetected: true,
    },
    {
      id: 'flatFooted',
      group: 'combatStatus',
      label: localize('FlatFooted.Label'),
      tooltip: localize('FlatFooted.Tooltip'),
      // `value` stays 0 — Dex denial isn't a flat number, it's `defenderDexMod`, so
      // `RollDefenseDialogStore` reconciles this checkbox against the already-baked
      // `defenderDenyDexToAC` separately rather than folding it into `combatModifierSum`.
      value: 0,
      checked: actor.statuses.has(FLAT_FOOTED_CONDITION_ID),
      autoDetected: true,
    },
    {
      id: 'totalDefense',
      group: 'combatStatus',
      label: localize('TotalDefense.Label'),
      tooltip: localize('TotalDefense.Tooltip'),
      value: 4,
      checked: actor.statuses.has(TOTAL_DEFENSE_CONDITION_ID),
      autoDetected: true,
    },
    {
      id: 'defensiveFighting',
      group: 'combatStatus',
      label: localize('DefensiveFightingActive.Label'),
      tooltip: localize('DefensiveFightingActive.Tooltip'),
      value: 2,
      checked: actor.statuses.has(DEFENSIVE_FIGHTING_CONDITION_ID),
      autoDetected: true,
    },
    {
      id: 'applyHalfDamage',
      group: 'overrides',
      label: localize('ApplyHalfDamage.Label'),
      tooltip: localize('ApplyHalfDamage.Tooltip'),
      value: 0,
      checked: false,
      autoDetected: false,
    },
    {
      id: 'ignoreCriticalHit',
      group: 'overrides',
      label: localize('IgnoreCriticalHit.Label'),
      tooltip: localize('IgnoreCriticalHit.Tooltip'),
      value: 0,
      checked: actor.system.defense.criticalImmune,
      autoDetected: true,
    },
  ];
};

export { BAKED_AC_CONDITION_IDS, createDefenseCombatModifiers };
