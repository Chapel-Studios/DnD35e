// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@ec/CoreMixin/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));
vi.mock('@ec/CoreMixin/sheet/stores/RenderModeStore.mjs', () => ({
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import CheckBoxFormGroup from '@vc/Fields/FormGroups/CheckBoxFormGroup.vue';

import { createMockDocumentStore, createMockRenderModeStore, makeGlobalProvide } from './setup';

const FIELD_PATH = 'system.equipped';

const mountCheckBoxFormGroup = (options: { editable: boolean; value?: boolean }) => {
  const value = options.value ?? true;
  return mount(CheckBoxFormGroup, {
    props: {
      fieldPath: FIELD_PATH,
      label: 'Equipped',
      value,
    },
    global: {
      provide: makeGlobalProvide({
        documentStore: createMockDocumentStore({
          fieldEditability: { [FIELD_PATH]: options.editable },
          sourceValues: { [FIELD_PATH]: value },
        }),
        renderModeStore: createMockRenderModeStore({ isGM: true, isEditMode: true }),
      }),
      stubs: {
        FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
      },
    },
  });
};

describe('CheckBoxFormGroup — passthrough smoke test', () => {
  it('renders an editable checkbox when field is editable', () => {
    const wrapper = mountCheckBoxFormGroup({ editable: true, value: true });
    const inputs = wrapper.findAll('input[type="checkbox"]');
    // editable slot renders the live checkbox (no disabled attribute)
    const live = inputs.find(i => !i.attributes('disabled'));
    expect(live).toBeDefined();
    expect((live!.element as HTMLInputElement).checked).toBe(true);
  });

  it('renders the readonly slot (disabled checkbox) when not editable', () => {
    const wrapper = mountCheckBoxFormGroup({ editable: false, value: true });
    const inputs = wrapper.findAll('input[type="checkbox"]');
    // readonly slot renders a disabled checkbox; live editable slot should not render
    expect(inputs.length).toBe(1);
    expect(inputs[0]!.attributes('disabled')).toBeDefined();
  });
});
