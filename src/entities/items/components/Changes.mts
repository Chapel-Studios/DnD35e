import type { fields as fieldsType } from '@common/data/_module.mjs';
const { fields } = foundry.data;

const CHANGE_FLAG_KEYS = [
  'loseDexToAC',
  'noStr',
  'noDex',
  'noInt',
  'noCon',
  'oneInt',
  'oneWis',
  'oneCha',
  'noEncumbrance',
  'mediumArmorFullSpeed',
  'heavyArmorFullSpeed',
  'multiAttack',
  'multiweaponAttack',
] as const;

// ✅ Type derived from the tuple
type ChangeFlagKey = typeof CHANGE_FLAG_KEYS[number];

// ✅ Runtime Set derived from the same list
const CHANGE_FLAGS = new Set<ChangeFlagKey>(CHANGE_FLAG_KEYS);

// ✅ Schema type using the derived key type
type ChangesPropertySet = {
  changes: Record<string, string | number>[];
  changeFlags: Record<ChangeFlagKey, boolean>[];
};

type ChangesPropertySetSchema = {
    changes: fieldsType.ArrayField<fieldsType.SchemaField<{
        [key: string]: fieldsType.StringField | fieldsType.NumberField
    }>>,
    changeFlags: fieldsType.ArrayField<fieldsType.SchemaField<{
        [key in ChangeFlagKey]?: fieldsType.BooleanField<boolean, boolean, true, false, true>;
    }>>;
    // resistances:
    // damage reduction:
    // size override:
}

const defineChangesSchema = (): ChangesPropertySetSchema => ({
  changes: new fields.ArrayField(new fields.SchemaField({})),
  changeFlags: new fields.ArrayField(new fields.SchemaField({})),
});

export { defineChangesSchema, type ChangesPropertySet, type ChangesPropertySetSchema, CHANGE_FLAGS, ChangeFlagKey };
