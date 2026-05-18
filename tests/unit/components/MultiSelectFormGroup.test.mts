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

import MultiSelectFormGroup from '@vc/fields/formGroups/MultiSelectFormGroup.vue';

import { createMockDocumentStore, createMockRenderModeStore, makeGlobalProvide } from './setup';

const FIELD_PATH = 'system.properties';

const OPTIONS = [
  { value: 'reach', label: 'Reach' },
  { value: 'trip', label: 'Trip' },
  { value: 'disarm', label: 'Disarm' },
];

const mountMultiSelectFormGroup = (options: { editable: boolean }) => {
  return mount(MultiSelectFormGroup, {
    props: {
      fieldPath: FIELD_PATH,
      label: 'Properties',
      value: ['reach', 'trip'],
      options: OPTIONS,
    },
    global: {
      provide: makeGlobalProvide({
        documentStore: createMockDocumentStore({
          fieldEditability: { [FIELD_PATH]: options.editable },
          sourceValues: { [FIELD_PATH]: ['reach', 'trip'] },
        }),
        renderModeStore: createMockRenderModeStore({ isGM: true, isEditMode: true }),
      }),
      stubs: {
        FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
      },
    },
  });
};

describe('MultiSelectFormGroup — passthrough smoke test', () => {
  it('renders an editable checkbox per option', () => {
    const wrapper = mountMultiSelectFormGroup({ editable: true });
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(OPTIONS.length);
    // First two are selected
    expect((checkboxes[0]!.element as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1]!.element as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[2]!.element as HTMLInputElement).checked).toBe(false);
  });

  it('renders the readonly variant (no editable inputs) when not editable', () => {
    const wrapper = mountMultiSelectFormGroup({ editable: false });
    // Readonly slot renders a `.multi-select-checkboxes.readonly` block; verify the
    // editable variant is not rendered.
    expect(wrapper.find('.multi-select-checkboxes.readonly').exists()).toBe(true);
    // The editable variant has its own non-readonly checkboxes container; not rendered.
    const editableContainers = wrapper.findAll('.multi-select-checkboxes').filter(el => !el.classes('readonly'));
    expect(editableContainers.length).toBe(0);
  });
});
