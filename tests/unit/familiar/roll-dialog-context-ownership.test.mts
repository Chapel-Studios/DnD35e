import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import type { DocumentContext } from '@helpers/formulae/index.mjs';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import type { InitiativeRollDialogConfig } from '@source/rollDialogs/InitiativeRollDialog/InitiativeRollDialogConfig.mjs';
import { useInitiativeRollDialogStore } from '@source/rollDialogs/InitiativeRollDialog/InitiativeRollDialogStore.mjs';
import type { InitiativeRollDialogContext } from '@source/rollDialogs/InitiativeRollDialog/types.mjs';
import type { MeleeAttackRollDialogConfig } from '@source/rollDialogs/MeleeAttackRollDialog/MeleeAttackRollDialogConfig.mjs';
import type { RangedAttackRollDialogConfig } from '@source/rollDialogs/RangedAttackRollDialog/RangedAttackRollDialogConfig.mjs';
import type { RollDefenseDialogConfig } from '@source/rollDialogs/RollDefenseDialog/RollDefenseDialogConfig.mjs';
import { resolveFormulaString, useRollDialogStore } from '@source/rollDialogs/RollDialog/RollDialogStore.mjs';
import type { RollDialogContext, RollDialogData } from '@source/rollDialogs/RollDialog/types.mjs';
import type { SavingThrowRollDialogConfig } from '@source/rollDialogs/SavingThrowRollDialog/SavingThrowRollDialogConfig.mjs';
import { useSavingThrowRollDialogStore } from '@source/rollDialogs/SavingThrowRollDialog/SavingThrowRollDialogStore.mjs';
import type { SavingThrowRollDialogContext } from '@source/rollDialogs/SavingThrowRollDialog/types.mjs';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { shallowReactive } from 'vue';

vi.mock('@source/dice/index.mjs', async () => {
  const { combineDiceFormula, extractFlatModifier } = await import('@source/dice/d20Formula.mjs');
  const { buildSituationalModifierEntry } = await import('@source/dice/rollModifierBreakdown.mjs');
  return { combineDiceFormula, extractFlatModifier, buildSituationalModifierEntry };
});

const makeContexts = (): FamiliarSchema => ({
  self: {
    aliases: ['attacker'],
    properties: { bonus: { type: 'number', accessPath: 'system.init' } },
  },
});

// Only the document properties read by these stores are needed.
const makeActor = () => {
  const actor: Pick<RollDialogData['actor'], 'name' | 'img'> & {
    system: Pick<RollDialogData['actor']['system'], 'init'>;
  } = {
    name: 'Rolling Actor',
    img: 'icons/svg/mystery-man.svg',
    system: { init: 4 },
  };
  return actor as RollDialogData['actor'];
};

describe('caller-owned roll dialog contexts', () => {
  beforeEach(() => {
    class FlatRoll extends Roll {
      override get dice() { return []; }
    }
    vi.stubGlobal('Roll', FlatRoll);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('requires a schema for every roll entry point and roll context', () => {
    expectTypeOf<Parameters<typeof InitiativeRollDialogConfig.roll>[1]>().toEqualTypeOf<Record<string, DocumentContext>>();
    expectTypeOf<Parameters<typeof InitiativeRollDialogConfig.roll>[2]>().toEqualTypeOf<FamiliarSchema>();
    expectTypeOf<Parameters<typeof SavingThrowRollDialogConfig.roll>[1]>().toEqualTypeOf<Record<string, DocumentContext>>();
    expectTypeOf<Parameters<typeof SavingThrowRollDialogConfig.roll>[2]>().toEqualTypeOf<FamiliarSchema>();
    expectTypeOf<Parameters<typeof MeleeAttackRollDialogConfig.roll>[1]>().toEqualTypeOf<Record<string, DocumentContext>>();
    expectTypeOf<Parameters<typeof MeleeAttackRollDialogConfig.roll>[2]>().toEqualTypeOf<FamiliarSchema>();
    expectTypeOf<Parameters<typeof RangedAttackRollDialogConfig.roll>[1]>().toEqualTypeOf<Record<string, DocumentContext>>();
    expectTypeOf<Parameters<typeof RangedAttackRollDialogConfig.roll>[2]>().toEqualTypeOf<FamiliarSchema>();
    expectTypeOf<Parameters<typeof RollDefenseDialogConfig.roll>[1]>().toEqualTypeOf<Record<string, DocumentContext>>();
    expectTypeOf<Parameters<typeof RollDefenseDialogConfig.roll>[2]>().toEqualTypeOf<FamiliarSchema>();
    expectTypeOf<RollDialogContext['familiarSchema']>().toEqualTypeOf<FamiliarSchema>();
    expectTypeOf<RollDialogContext['formulaContext']>().toEqualTypeOf<Record<string, DocumentContext>>();
  });

  it('exposes the caller schema unchanged and follows context replacement', () => {
    const context = shallowReactive<RollDialogContext>({
      data: { title: 'Roll', rollMode: 'publicroll', actor: makeActor() },
      formulaContext: { self: makeActor() },
      familiarSchema: makeContexts(),
      resolve: vi.fn(),
      cancel: vi.fn(),
    });
    const buildSchema = vi.spyOn(FormulaData, 'buildFamiliarSchema');
    const store = useRollDialogStore(context);
    expect(store.app.familiarSchema.value).toBe(context.familiarSchema);
    context.familiarSchema = makeContexts();
    expect(store.app.familiarSchema.value).toBe(context.familiarSchema);
    expect(buildSchema).not.toHaveBeenCalled();
  });

  it('resolves initiative with the caller schema without constructing another one', () => {
    const context: InitiativeRollDialogContext = {
      data: {
        title: 'Initiative',
        rollMode: 'publicroll',
        actor: makeActor(),
        initRoll: { label: 'Initiative', immutableModifiers: [], situationalModifier: '#attacker.bonus' },
      },
      formulaContext: { self: makeActor() },
      familiarSchema: makeContexts(),
      resolve: vi.fn(),
      cancel: vi.fn(),
    };
    const buildSchema = vi.spyOn(FormulaData, 'buildFamiliarSchema');
    const store = useInitiativeRollDialogStore(context);
    expect(store.initRoll.activeTotal.value).toBe(4);
    expect(store.app.familiarSchema.value).toBe(context.familiarSchema);
    store.actions.roll();
    expect(context.resolve).toHaveBeenCalledWith({
      rollMode: 'publicroll',
      finalModifiers: [{ label: 'dnd35e.ROLL.SituationalModifier', value: 4 }],
    });
    expect(buildSchema).not.toHaveBeenCalled();
  });

  it('resolves saving throws with the caller schema without constructing another one', () => {
    const context: SavingThrowRollDialogContext = {
      data: {
        title: 'Save',
        rollMode: 'publicroll',
        actor: makeActor(),
        savingThrow: { label: 'Save', immutableModifiers: [], situationalModifier: '#attacker.bonus' },
      },
      formulaContext: { self: makeActor() },
      familiarSchema: makeContexts(),
      resolve: vi.fn(),
      cancel: vi.fn(),
    };
    const buildSchema = vi.spyOn(FormulaData, 'buildFamiliarSchema');
    const store = useSavingThrowRollDialogStore(context);
    expect(store.savingThrow.activeTotal.value).toBe(4);
    expect(store.app.familiarSchema.value).toBe(context.familiarSchema);
    expect(buildSchema).not.toHaveBeenCalled();
  });

  it('resolves against the caller formulaContext rather than rebuilding one from dialog data', () => {
    const callerSelf = { ...makeActor(), system: { init: 9 } } as RollDialogData['actor'];
    const context: SavingThrowRollDialogContext = {
      data: {
        title: 'Save',
        rollMode: 'publicroll',
        actor: makeActor(),
        savingThrow: { label: 'Save', immutableModifiers: [], situationalModifier: '#attacker.bonus' },
      },
      formulaContext: { self: callerSelf },
      familiarSchema: makeContexts(),
      resolve: vi.fn(),
      cancel: vi.fn(),
    };
    const store = useSavingThrowRollDialogStore(context);
    expect(store.savingThrow.activeTotal.value).toBe(9);
  });

  it('keeps dice text and resolves caller-defined aliases without deriving a schema', () => {
    const buildSchema = vi.spyOn(FormulaData, 'buildFamiliarSchema');
    expect(resolveFormulaString(
      '1d6 + #attacker.bonus',
      { self: makeActor() },
      makeContexts()
    )).toBe('1d6 + 4');
    expect(buildSchema).not.toHaveBeenCalled();
  });
});
