import type { DocumentContext } from '@helpers/formulae/registry.mjs';
import type { IntellisenseObject } from '@helpers/formulae/types.mjs';
import { intellisenseProp } from '@helpers/formulae/utils.mjs';
import { createBaseItemIntellisense } from '@items/baseItem/data/baseItemIntellisense.mjs';
import { applyEquippableIntellisense } from '@items/components/Equippable/data/equippableIntellisense.mjs';

/**
 * Intellisense schema for WeaponSystemModel properties.
 * Composes: BaseItem + Equippable (which includes Physical + Identifiable) + weapon-specific.
 *
 * This is the concrete intellisense schema for weapon documents.
 * When a live document is provided, property values are resolved from its data.
 */
const buildWeaponIntellisense = (context?: DocumentContext): IntellisenseObject => {
  // BaseItem level 
  const schema: IntellisenseObject = createBaseItemIntellisense(context);

  // Equippable level (which chains Physical → Identifiable)
  applyEquippableIntellisense(schema, context);

  // Weapon-specific properties
  // isMasterwork is a boolean — excluded from formula intellisense

  schema.weaponType = intellisenseProp('Weapon Type', 'string', 'system.weaponType', context);
  schema.weaponSubtype = intellisenseProp('Weapon Subtype', 'string', 'system.weaponSubtype', context);
  schema.weaponBaseType = intellisenseProp('Base Type', 'string', 'system.weaponBaseType', context);

  schema.weaponDamage = {
    damageRoll: intellisenseProp('Damage Roll', 'string', 'system.weaponDamage.damageRoll', context),
    damageType: intellisenseProp('Damage Type', 'string', 'system.weaponDamage.damageType', context),
    critRange: intellisenseProp('Critical Range', 'string', 'system.weaponDamage.critRange', context),
    critMultiplier: intellisenseProp('Critical Multiplier', 'number', 'system.weaponDamage.critMultiplier', context),
    rangeIncrement: intellisenseProp('Range Increment', 'number', 'system.weaponDamage.rangeIncrement', context),
  };

  return schema;
};

export { buildWeaponIntellisense };
