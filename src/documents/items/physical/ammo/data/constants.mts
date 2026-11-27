import type { SelectOption } from '@vc/fields/index.mjs';

const ARROW_AMMO = 'arrow';
const BOLT_AMMO = 'bolt';
const BULLET_AMMO = 'bullet';
const SHURIKEN_AMMO = 'shuriken';
const DART_AMMO = 'dart';

const AMMO_TYPES = new Set([
  ARROW_AMMO,
  BOLT_AMMO,
  BULLET_AMMO,
  SHURIKEN_AMMO,
  DART_AMMO,
] as const);
const AMMO_TYPE = {
  ARROW: ARROW_AMMO,
  BOLT: BOLT_AMMO,
  BULLET: BULLET_AMMO,
  SHURIKEN: SHURIKEN_AMMO,
  DART: DART_AMMO,
} as const;

type AmmoType = SetElement<typeof AMMO_TYPES>;
const AMMO_TYPE_LOCALIZED: Record<AmmoType, string> = {
  arrow: 'dnd35e.AMMO.Type.arrow',
  bolt: 'dnd35e.AMMO.Type.bolt',
  bullet: 'dnd35e.AMMO.Type.bullet',
  shuriken: 'dnd35e.AMMO.Type.shuriken',
  dart: 'dnd35e.AMMO.Type.dart',
} as const;
const AMMO_TYPE_SELECT_OPTIONS = Object.entries(AMMO_TYPE_LOCALIZED)
  .map(([value, label]) => ({ value, label } as SelectOption<AmmoType>));

export type {
  AmmoType,
};

export {
  AMMO_TYPE,
  AMMO_TYPE_LOCALIZED,
  AMMO_TYPE_SELECT_OPTIONS,
  AMMO_TYPES,
};
