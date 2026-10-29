import type { FormulaDataSource } from '@helpers/formulae/FormulaData.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import type { ActionDataModel } from '@items/baseItem/actions/ActionDataModel.mjs';
import type { MeleeWeaponProperty } from '@items/physical/weapon/actions/MeleeWeaponAttack/constants.mjs';
import type { MeleeWeaponAttack } from '@items/physical/weapon/actions/MeleeWeaponAttack/MeleeAttackDataModel.mjs';
import type { RangedWeaponProperty } from '@items/physical/weapon/actions/RangedAttack/constants.mjs';
import type { RangedWeaponAttack } from '@items/physical/weapon/actions/RangedAttack/RangedAttackDataModel.mjs';
import type { WeaponAttackDataModel } from '@items/physical/weapon/actions/WeaponAttack/WeaponAttackDataModel.mjs';
import { describe, expect, expectTypeOf, it } from 'vitest';

describe('action source and runtime types', () => {
  it('distinguishes serialized formulas from live FormulaData at every action layer', () => {
    expectTypeOf<ActionDataModel['_source']['name']>().toEqualTypeOf<FormulaDataSource>();
    expectTypeOf<ActionDataModel['name']>().toEqualTypeOf<FormulaData>();
    expectTypeOf<WeaponAttackDataModel['_source']['attackFormula']>().toEqualTypeOf<FormulaDataSource>();
    expectTypeOf<WeaponAttackDataModel['attackFormula']>().toEqualTypeOf<FormulaData>();
    expectTypeOf<MeleeWeaponAttack['_source']['damageFormula']>().toEqualTypeOf<FormulaDataSource>();
    expectTypeOf<MeleeWeaponAttack['damageFormula']>().toEqualTypeOf<FormulaData>();
    expectTypeOf<RangedWeaponAttack['_source']['attackFormula']>().toEqualTypeOf<FormulaDataSource>();
    expectTypeOf<RangedWeaponAttack['attackFormula']>().toEqualTypeOf<FormulaData>();
    expectTypeOf<MeleeWeaponAttack['_source']['reachLength']>().toEqualTypeOf<number>();
    expectTypeOf<RangedWeaponAttack['_source']['isAmmoRequired']>().toEqualTypeOf<boolean>();
    expectTypeOf<MeleeWeaponAttack['_source']['properties']>().toEqualTypeOf<MeleeWeaponProperty[]>();
    expectTypeOf<MeleeWeaponAttack['properties']>().toEqualTypeOf<Set<MeleeWeaponProperty>>();
    expectTypeOf<RangedWeaponAttack['_source']['properties']>().toEqualTypeOf<RangedWeaponProperty[]>();
    expectTypeOf<RangedWeaponAttack['properties']>().toEqualTypeOf<Set<RangedWeaponProperty>>();
    expectTypeOf<FormulaData['_source']>().toEqualTypeOf<FormulaDataSource>();
  });
});

describe('FormulaData.resolveSource explicit result type', () => {
  it('returns string | null when string is requested', () => {
    const result = FormulaData.resolveSource<string>(FormulaData.toSource('1d20 + 3', { expectedType: 'rollFormula' }), {});
    expectTypeOf(result).toEqualTypeOf<string | null>();
    expect(result).toBe('1d20 + 3');
  });

  it('retains null and the failure callback for unresolved references', () => {
    const failures: string[] = [];
    const result = FormulaData.resolveSource<string>(
      FormulaData.toSource('#missing.value'), {}, '', [], reason => failures.push(reason)
    );
    expectTypeOf(result).toEqualTypeOf<string | null>();
    expect(result).toBeNull();
    expect(failures).toHaveLength(1);
  });

  it('keeps the full union without an explicit type, even with a string fallback', () => {
    const result = FormulaData.resolveSource(FormulaData.toSource('3 > 2', { expectedType: 'boolean' }), {}, '');
    expectTypeOf(result).toEqualTypeOf<string | number | boolean | null>();
    expect(result).toBe(true);
  });

  it('supports a matching typed fallback for blank boolean formulas', () => {
    const result = FormulaData.resolveSource<boolean>(FormulaData.toSource('', { expectedType: 'boolean' }), {}, false);
    expectTypeOf(result).toEqualTypeOf<boolean | null>();
    expect(result).toBe(false);
  });

  it('keeps the empty-string default and an authored string fallback', () => {
    const source = FormulaData.toSource('');
    expect(FormulaData.resolveSource<string>(source, {})).toBe('');
    expect(FormulaData.resolveSource<string>(source, {}, 'Attack')).toBe('Attack');
  });

  it('resolves numeric targets without changing runtime coercion', () => {
    const result = FormulaData.resolveSource<string | number>(
      FormulaData.toSource('42', { expectedType: 'number' }), {}, 0
    );
    expectTypeOf(result).toEqualTypeOf<string | number | null>();
    expect(result).toBe(42);
  });
});
