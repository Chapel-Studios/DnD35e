// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));
vi.mock('@documents/document/sheet/stores/RenderModeStore.mjs', () => ({
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import SelectFormGroup from '@vc/fields/formGroups/SelectFormGroup.vue';

import { createMockDocumentStore, createMockRenderModeStore, makeGlobalProvide } from './setup';

const FIELD_PATH = 'system.weaponType';

const OPTIONS = [
  { value: 'simple', label: 'Simple' },
  { value: 'martial', label: 'Martial' },
  { value: 'exotic', label: 'Exotic' },
];

const mountSelectFormGroup = (options: { editable: boolean }) => {
  return mount(SelectFormGroup, {
    props: {
      fieldPath: FIELD_PATH,
      label: 'Weapon Type',
      value: 'martial',
      options: OPTIONS,
    },
    global: {
      provide: makeGlobalProvide({
        documentStore: createMockDocumentStore({
          fieldEditability: { [FIELD_PATH]: options.editable },
          sourceValues: { [FIELD_PATH]: 'martial' },
        }),
        renderModeStore: createMockRenderModeStore({ isGM: true, isEditMode: true }),
      }),
      stubs: {
        FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
      },
    },
  });
};

describe('SelectFormGroup — passthrough smoke test', () => {
  it('renders the select element with options when editable', () => {
    const wrapper = mountSelectFormGroup({ editable: true });
    const select = wrapper.find('select');
    expect(select.exists()).toBe(true);
    expect(select.findAll('option').length).toBe(OPTIONS.length);
  });

  it('renders the readonly slot (no select) when not editable', () => {
    const wrapper = mountSelectFormGroup({ editable: false });
    expect(wrapper.find('select').exists()).toBe(false);
    // readonly fallback renders the selected option label in a span
    expect(wrapper.find('span').exists()).toBe(true);
  });
});
