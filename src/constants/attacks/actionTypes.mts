export const ActionTypes = {
  meleeWeaponAttack: 'meleeWeaponAttack',
  rangedWeaponAttack: 'rangedWeaponAttack',
  meleeSpellAttack: 'meleeSpellAttack',
  rangedSpellAttack: 'rangedSpellAttack',
};

export type ActionTypes = typeof ActionTypes[keyof typeof ActionTypes];
export const ActionsTypesList = Object.values(ActionTypes);
export const isAttackAction = (action: string): action is ActionTypes => {
  return ActionsTypesList.includes(action as ActionTypes);
};
