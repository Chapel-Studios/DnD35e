// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

// See FormGroup.test.mts for why we mock the CoreMixin barrel.
vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));
vi.mock('@documents/document/sheet/stores/RenderModeStore.mjs', () => ({
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import TextFormGroup from '@vc/Fields/FormGroups/TextFormGroup.vue';

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
      controls: `<template #controls="{ editable }">
        <button class="test-control" :data-editable="editable">edit</button>
      </template>`,
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

  it('forwards a truthy `editable` slot prop to #controls when editable', () => {
    const wrapper = mountTextFormGroup({ editable: true });
    const control = wrapper.find('button.test-control');
    expect(control.exists()).toBe(true);
    expect(control.attributes('data-editable')).toBe('true');
  });

  it('forwards a falsy `editable` slot prop when not editable', () => {
    const wrapper = mountTextFormGroup({ editable: false });
    const control = wrapper.find('button.test-control');
    expect(control.exists()).toBe(true);
    expect(control.attributes('data-editable')).toBe('false');
  });
});
