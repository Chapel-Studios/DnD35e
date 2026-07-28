// @vitest-environment happy-dom

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
import EffectChangesList from '@effects/baseActiveEffect/sheet/components/EffectChangesList.vue';
import type { FamiliarContext, FamiliarSchema } from '@helpers/formulae/types.mjs';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { computed, ref } from 'vue';

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
