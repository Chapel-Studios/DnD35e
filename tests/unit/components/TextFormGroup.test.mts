// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';

// See FormGroup.test.mts for why we mock the CoreMixin barrel.
vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));
vi.mock('@documents/document/sheet/stores/RenderModeStore.mjs', () => ({
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import TextFormGroup from '@vc/fields/formGroups/TextFormGroup.vue';

import { createMockDocumentStore, createMockRenderModeStore, makeGlobalProvide } from './setup';

const FIELD_PATH = 'system.notes';

const mountTextFormGroup = (options: { editable: boolean }) => {
  return mount(TextFormGroup, {
    props: {
      fieldPath: FIELD_PATH,
      label: 'Notes',
      value: 'hello',
    },
    slots: {
      controls: ({ editable }: { editable: boolean }) => h('button', {
        class: 'test-control',
        'data-editable': String(editable),
      }, 'edit'),
    },
    global: {
      provide: makeGlobalProvide({
        documentStore: createMockDocumentStore({
          fieldEditability: { [FIELD_PATH]: options.editable },
          sourceValues: { [FIELD_PATH]: 'hello' },
          labels: { [FIELD_PATH]: 'Notes' },
        }),
        renderModeStore: createMockRenderModeStore({ isGM: true, isEditMode: true }),
      }),
      stubs: {
        FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
      },
    },
  });
};

describe('TextFormGroup — passthrough smoke test', () => {
  it('renders the text input', () => {
    const wrapper = mountTextFormGroup({ editable: true });
    expect(wrapper.find('input[type="text"]').exists()).toBe(true);
  });

  it.todo('forwards a truthy `editable` slot prop to #controls when editable');

  it.todo('forwards a falsy `editable` slot prop when not editable');

  it('forceEdit shows input in play mode but keeps it disabled when resolved editable=false', () => {
    const wrapper = mount(TextFormGroup, {
      props: {
        fieldPath: FIELD_PATH,
        value: 'hello',
        forceEdit: true,
      },
      global: {
        provide: makeGlobalProvide({
          documentStore: createMockDocumentStore({
            fieldEditability: { [FIELD_PATH]: false },
            sourceValues: { [FIELD_PATH]: 'hello' },
          }),
          renderModeStore: createMockRenderModeStore({ isGM: false, isEditMode: false, isPlayMode: true }),
        }),
        stubs: {
          FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
        },
      },
    });

    const input = wrapper.find('input[type="text"]');
    expect(input.exists()).toBe(true);
    expect(input.attributes('disabled')).toBeDefined();
  });

  it('forceEdit remains enabled when resolved editable=true', () => {
    const wrapper = mount(TextFormGroup, {
      props: {
        fieldPath: FIELD_PATH,
        value: 'hello',
        forceEdit: true,
      },
      global: {
        provide: makeGlobalProvide({
          documentStore: createMockDocumentStore({
            fieldEditability: { [FIELD_PATH]: true },
            sourceValues: { [FIELD_PATH]: 'hello' },
          }),
          renderModeStore: createMockRenderModeStore({ isGM: true, isEditMode: false, isPlayMode: true }),
        }),
        stubs: {
          FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
        },
      },
    });

    const input = wrapper.find('input[type="text"]');
    expect(input.exists()).toBe(true);
    expect(input.attributes('disabled')).toBeUndefined();
  });
});
