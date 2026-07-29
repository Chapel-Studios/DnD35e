// @vitest-environment happy-dom

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));
// `FormulaFormGroup.vue` imports these symbols directly from their defining modules
// rather than the `@documents/document` barrel — mock those paths too so the real
// (unstubbed) FormulaFormGroup used by the tests below can inject successfully.
vi.mock('@documents/document/sheet/DocumentSheetStore.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
}));
vi.mock('@documents/document/sheet/stores/RenderModeStore.mjs', () => ({
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import EffectChangesList from '@effects/baseActiveEffect/sheet/components/EffectChangesList.vue';
import type { FamiliarContext, FamiliarSchema } from '@helpers/formulae/types.mjs';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { computed, nextTick, ref } from 'vue';

import { createMockDocumentStore } from './setup';

/**
 * Regression test for `EffectChangesList.vue`'s `getContextsForTarget()` — the Value/
 * Condition formula columns must see BOTH the effect document's own "Self" context AND
 * the change's target (item/actor) context merged into one schema (e.g. a Material AE's
 * Value formula referencing `#Self.MagicEquivalency` alongside `#item.hardness`). The
 * Field column (AspectPicker) deliberately does NOT get Self — verified separately.
 */

const selfContext: FamiliarContext = {
  display: 'Self',
  properties: { magicEquivalency: { type: 'number', accessPath: 'system.magicEquivalency', value: 1 } },
};
const itemContext: FamiliarContext = {
  display: 'Item',
  properties: { hardness: { type: 'number', accessPath: 'system.hardness', value: 5 } },
};

// Capture the `contexts` prop each real editor is mounted with instead of exercising the
// full formula-editing machinery — this test is only about the merge, not formula UX.
const capturedContexts: { value?: Record<string, FamiliarSchema | undefined> } = { value: {} };

const FormulaFormGroupStub = defineComponent({
  props: ['fieldPath', 'contexts'],
  setup (props) {
    capturedContexts.value![props.fieldPath] = props.contexts;
    return () => h('div', { class: 'formula-stub' });
  },
});

const AspectPickerStub = defineComponent({
  props: ['familiarContext'],
  setup () {
    return () => h('div', { class: 'aspect-picker-stub' });
  },
});

const FieldControlsStub = defineComponent({
  setup (_props, { slots }) {
    return () => h('div', { class: 'field-controls-stub' }, slots.default?.());
  },
});

const mkStore = () => ({
  documentGetters: {
    visibleChanges: computed(() => [
      { key: 'system.hardness', type: 'add', value: '#self.magicEquivalency', target: 'item', priority: 10 },
    ]),
    getIsFieldEditable: vi.fn(() => computed(() => true)),
    getIsFieldVisible: vi.fn(() => computed(() => true)),
    familiarSchema: ref({ self: selfContext }),
    getTargetFamiliarContext: vi.fn((target: string) => (target === 'item' ? itemContext : undefined)),
    getTargetFamiliarContextName: vi.fn((target: string) => target),
  },
  documentActions: {
    addChange: vi.fn(),
    removeChange: vi.fn(),
    updateChangeField: vi.fn(),
  },
});

const mountEffectChangesList = (variant: 'default' | 'mask' = 'mask') => {
  capturedContexts.value = {};
  return mount(EffectChangesList, {
    props: { variant },
    global: {
      provide: {
        [DocumentSheetStoreSymbol as symbol]: mkStore(),
        [RenderModeStoreSymbol as symbol]: { isEditMode: computed(() => true) },
      },
      stubs: {
        FormulaFormGroup: FormulaFormGroupStub,
        AspectPicker: AspectPickerStub,
        FieldControls: FieldControlsStub,
      },
    },
  });
};

describe('EffectChangesList — getContextsForTarget Self-context merge', () => {
  it('merges Self and the change target context for the Value formula editor', () => {
    mountEffectChangesList('mask');
    const valueContexts = capturedContexts.value!['system.changes.0.value'];
    expect(valueContexts).toBeDefined();
    expect(Object.keys(valueContexts!).sort()).toEqual(['item', 'self']);
    expect(valueContexts!.item).toEqual(itemContext);
    expect(valueContexts!.self).toEqual(selfContext);
  });

  it('also merges Self and the change target context for the Condition formula editor (default variant)', () => {
    mountEffectChangesList('default');
    const conditionContexts = capturedContexts.value!['system.changes.0.condition'];
    expect(conditionContexts).toBeDefined();
    expect(Object.keys(conditionContexts!).sort()).toEqual(['item', 'self']);
  });
});

/**
 * The tests below mount the REAL `FormulaFormGroup`/`FormGroup` chain (only `AspectPicker`
 * is stubbed, since the Field/key column isn't under test) to verify two integration points
 * that a stubbed-FormulaFormGroup test can't reach: the Condition column's operator
 * highlighting, and the Value column's expected-type mismatch surfacing.
 */

const numberAspectItemContext: FamiliarContext = {
  display: 'Item',
  properties: { hardness: { type: 'number', accessPath: 'system.hardness', value: 5 } },
};

const conditionSelfContext: FamiliarContext = {
  display: 'Self',
  properties: {
    hp: { value: { type: 'number', accessPath: 'system.hp.value', value: 5 } },
  },
};

const mkFullStore = (changes: Partial<EffectChangeDataDnd35e>[]) => {
  const base = createMockDocumentStore() as {
    documentGetters: Record<string, unknown>;
    documentActions: Record<string, unknown>;
    _storeUtils: Record<string, unknown>;
  };
  return {
    ...base,
    documentGetters: {
      ...base.documentGetters,
      visibleChanges: computed(() => changes),
      familiarSchema: ref({ self: conditionSelfContext }),
      getTargetFamiliarContext: vi.fn((target: string) => (target === 'item' ? numberAspectItemContext : undefined)),
      getTargetFamiliarContextName: vi.fn((target: string) => target),
    },
    documentActions: {
      ...base.documentActions,
      addChange: vi.fn(),
      removeChange: vi.fn(),
      updateChangeField: vi.fn(),
    },
  };
};

const mountEffectChangesListReal = (changes: Partial<EffectChangeDataDnd35e>[]) => {
  return mount(EffectChangesList, {
    props: { variant: 'default', showChangeFieldControls: false },
    global: {
      provide: {
        [DocumentSheetStoreSymbol as symbol]: mkFullStore(changes),
        [RenderModeStoreSymbol as symbol]: { isEditMode: computed(() => true) },
      },
      stubs: {
        AspectPicker: AspectPickerStub,
      },
    },
  });
};

describe('EffectChangesList — Condition column accepts and evaluates a boolean formula with operator highlighting', () => {
  it('highlights comparison and logical operators in a boolean condition formula', async () => {
    const wrapper = mountEffectChangesListReal([
      {
        key: 'system.hardness',
        type: 'add',
        value: '5',
        condition: '#self.hp.value > 0 && #self.hp.value < 10',
        target: 'item',
        priority: 10,
      },
    ]);
    await nextTick();

    const operatorSpans = wrapper.findAll('.change-condition .formula-operator');
    expect(operatorSpans.map(span => span.text())).toEqual(['>', '&&', '<']);
  });
});

describe('EffectChangesList — Value column rejects/flags a formula that doesn\'t match the picked aspect\'s type', () => {
  // The global `Roll.safeEval` test stub (tests/setup.mts) always falls back to `0` (a
  // finite number) for anything it can't parse, so it can never reproduce a genuine
  // "not a number" failure on its own — the setup file explicitly invites per-test
  // overrides for cases like this. Restore the original stub after this test.
  const originalSafeEval = (globalThis as unknown as { Roll: { safeEval: unknown } }).Roll.safeEval;

  afterEach(() => {
    (globalThis as unknown as { Roll: { safeEval: unknown } }).Roll.safeEval = originalSafeEval;
  });

  it('surfaces a type-mismatch error when the Value formula resolves to a non-number for a number-typed aspect', async () => {
    (globalThis as unknown as { Roll: { safeEval: (expr: string) => number } }).Roll.safeEval = vi.fn(
      function (this: unknown, expr: string) {
        // Mirrors the real Foundry behavior this stub otherwise papers over: a quoted
        // string literal isn't a valid arithmetic expression and safeEval throws.
        const n = Number(expr);
        if (Number.isFinite(n)) return n;
        throw new Error(`Invalid roll expression: ${expr}`);
      }
    );

    const wrapper = mountEffectChangesListReal([
      {
        key: 'system.hardness',
        type: 'add',
        value: '"broken"',
        condition: null,
        target: 'item',
        priority: 10,
      },
    ]);
    await nextTick();

    const rowContext = wrapper.find('.row-context');
    expect(rowContext.exists()).toBe(true);
    expect(rowContext.text()).toContain('dnd35e.EFFECT.Headers.Value');
    expect(rowContext.text()).toContain('dnd35e.Formula.Errors.notANumber');
  });

  it('does not flag a Value formula that resolves to a valid number for a number-typed aspect', async () => {
    const wrapper = mountEffectChangesListReal([
      {
        key: 'system.hardness',
        type: 'add',
        value: '5',
        condition: null,
        target: 'item',
        priority: 10,
      },
    ]);
    await nextTick();

    expect(wrapper.find('.row-context.has-error').exists()).toBe(false);
  });
});
