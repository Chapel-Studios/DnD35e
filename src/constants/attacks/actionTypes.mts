const ActionTypes = {
  meleeWeaponAttack: 'meleeWeaponAttack',
  rangedWeaponAttack: 'rangedWeaponAttack',
  meleeSpellAttack: 'meleeSpellAttack',
  rangedSpellAttack: 'rangedSpellAttack',
};

type ActionType = typeof ActionTypes[keyof typeof ActionTypes];
const ActionsTypesList = Object.values(ActionTypes);
const isAttackAction = (action: string): action is ActionType => {
  return ActionsTypesList.includes(action as ActionType);
};

export {
  ActionsTypesList,
  ActionTypes,
  isAttackAction,
};

export type {
  ActionType,
};
