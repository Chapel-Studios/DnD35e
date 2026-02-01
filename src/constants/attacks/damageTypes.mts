const DAMAGE_TYPES = [
  'D35E.DRPiercing',
  'D35E.DRBludgeoning',
  'D35E.DRSlashing',
];
type DamageType = (typeof DAMAGE_TYPES)[number];

export { DAMAGE_TYPES, type DamageType };
