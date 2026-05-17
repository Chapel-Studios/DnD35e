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

import ColorFormGroup from '@vc/Fields/FormGroups/ColorFormGroup.vue';

import { createMockDocumentStore, createMockRenderModeStore, makeGlobalProvide } from './setup';

const FIELD_PATH = 'system.color';

const mountColorFormGroup = (options: { editable: boolean }) => {
  return mount(ColorFormGroup, {
    props: {
      fieldPath: FIELD_PATH,
      label: 'Color',
      value: '#ff00aa',
    },
    global: {
      provide: makeGlobalProvide({
        documentStore: createMockDocumentStore({
          fieldEditability: { [FIELD_PATH]: options.editable },
          sourceValues: { [FIELD_PATH]: '#ff00aa' },
        }),
        renderModeStore: createMockRenderModeStore({ isGM: true, isEditMode: true }),
      }),
      stubs: {
        FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
      },
    },
  });
};

describe('ColorFormGroup — passthrough smoke test', () => {
  it('renders the color input when editable', () => {
    const wrapper = mountColorFormGroup({ editable: true });
    expect(wrapper.find('input[type="color"]').exists()).toBe(true);
    expect(wrapper.find('.color-display').exists()).toBe(false);
  });

  it('renders the readonly color swatch when not editable', () => {
    const wrapper = mountColorFormGroup({ editable: false });
    expect(wrapper.find('input[type="color"]').exists()).toBe(false);
    expect(wrapper.find('.color-display').exists()).toBe(true);
  });
});
