import type { SelectOption } from '@vc/fields/formGroups/types.mjs';

// Action Types
const MELEE_WEAPON_ATTACK = 'melee_weapon_attack';
const RANGED_WEAPON_ATTACK = 'ranged_weapon_attack';
// const SPELL_CAST = 'spell_cast'; // deferred — see ACTION_TYPES/ACTION_TYPE below

const WEAPON_ACTION_TYPES = [
  MELEE_WEAPON_ATTACK,
  RANGED_WEAPON_ATTACK,
] as const;
type WeaponActionType = typeof WEAPON_ACTION_TYPES[number];

const WEAPON_ACTION_TYPE = {
  MELEE: MELEE_WEAPON_ATTACK,
  RANGED: RANGED_WEAPON_ATTACK,
} as const;

const ACTION_TYPES = [
  ...WEAPON_ACTION_TYPES,
  // SPELL_CAST,
] as const;
type ActionType = typeof ACTION_TYPES[number];

const ACTION_TYPE = {
  ...WEAPON_ACTION_TYPE,
  // SPELL_CAST,
} as const;

const ActionTypeSelectOptions: SelectOption<ActionType>[] = ACTION_TYPES.map(type => ({
  value: type,
  label: `dnd35e.WEAPON.ACTIONS.Type.${type}`,
}));


// Action Triggers
const SUCCESS_TRIGGER = 'onSuccess';
const FAILURE_TRIGGER = 'onFailure';
const CRIT_TRIGGER = 'onCrit';
const FUMBLE_TRIGGER = 'onFumble';
const ALWAYS_TRIGGER = 'always';

const ACTION_TRIGGERS = [
  SUCCESS_TRIGGER,
  FAILURE_TRIGGER,
  CRIT_TRIGGER,
  FUMBLE_TRIGGER,
  ALWAYS_TRIGGER,
] as const;
type ActionTrigger = typeof ACTION_TRIGGERS[number];

const ACTION_TRIGGER = {
  SUCCESS: SUCCESS_TRIGGER,
  FAILURE: FAILURE_TRIGGER,
  CRIT: CRIT_TRIGGER,
  FUMBLE: FUMBLE_TRIGGER,
  ALWAYS: ALWAYS_TRIGGER,
} as const;


const ActionTriggerSelectOptions: SelectOption<ActionTrigger>[] = [
  { value: ACTION_TRIGGER.SUCCESS, label: 'dnd35e.WEAPON.ACTIONS.Trigger.onSuccess' },
  { value: ACTION_TRIGGER.FAILURE, label: 'dnd35e.WEAPON.ACTIONS.Trigger.onFailure' },
  { value: ACTION_TRIGGER.CRIT, label: 'dnd35e.WEAPON.ACTIONS.Trigger.onCrit' },
  { value: ACTION_TRIGGER.FUMBLE, label: 'dnd35e.WEAPON.ACTIONS.Trigger.onFumble' },
  { value: ACTION_TRIGGER.ALWAYS, label: 'dnd35e.WEAPON.ACTIONS.Trigger.always' },
];

export type {
  ActionTrigger,
  ActionType,
  WeaponActionType,
};

export {
  ACTION_TRIGGER,
  ACTION_TRIGGERS,
  ACTION_TYPE,
  ACTION_TYPES,
  ActionTriggerSelectOptions,
  ActionTypeSelectOptions,
  WEAPON_ACTION_TYPE,
  WEAPON_ACTION_TYPES,
};
