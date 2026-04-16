const DAMAGE_TYPES = [
  'dnd35e.DAMAGE_TYPES.Piercing',
  'dnd35e.DAMAGE_TYPES.Bludgeoning',
  'dnd35e.DAMAGE_TYPES.Slashing',
  'dnd35e.DAMAGE_TYPES.Fire',
  'dnd35e.DAMAGE_TYPES.Cold',
  'dnd35e.DAMAGE_TYPES.Electricity',
  'dnd35e.DAMAGE_TYPES.Acid',
  'dnd35e.DAMAGE_TYPES.Sonic',
  'dnd35e.DAMAGE_TYPES.Force',
  'dnd35e.DAMAGE_TYPES.Positive',
  'dnd35e.DAMAGE_TYPES.Negative',
];
type DamageType = (typeof DAMAGE_TYPES)[number];

export { DAMAGE_TYPES, type DamageType };
