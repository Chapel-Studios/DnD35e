// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

// See FormGroup.test.mts for why we mock the CoreMixin barrel. NumberFormGroup imports
// both stores from the same barrel.
vi.mock('@ec/CoreMixin/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));
vi.mock('@ec/CoreMixin/sheet/stores/RenderModeStore.mjs', () => ({
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import NumberFormGroup from '@vc/Fields/FormGroups/NumberFormGroup.vue';

import { createMockDocumentStore, createMockRenderModeStore, makeGlobalProvide } from './setup';

/**
 * Smoke test: NumberFormGroup is a passthrough wrapper around FormGroup. We verify the
 * number input renders and that the `#controls` slot receives the FormGroup's `editable`
 * scoped-slot prop (reflecting the override result).
 */

const FIELD_PATH = 'system.hp.value';

const mountNumberFormGroup = (options: { editable: boolean }) => {
  return mount(NumberFormGroup, {
    props: {
      fieldPath: FIELD_PATH,
      label: 'HP',
      value: 7,
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
          sourceValues: { [FIELD_PATH]: 7 },
          labels: { [FIELD_PATH]: 'HP' },
        }),
        renderModeStore: createMockRenderModeStore({ isGM: true, isEditMode: true }),
      }),
      stubs: {
        // Render the default slot so the `<slot name="controls" :editable />` passed
        // through from FormGroup actually appears in the DOM.
        FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
      },
    },
  });
};

describe('NumberFormGroup — passthrough smoke test', () => {
  it('renders the number input', () => {
    const wrapper = mountNumberFormGroup({ editable: true });
    const input = wrapper.find('input[type="number"]');
    expect(input.exists()).toBe(true);
  });

  it('forwards the FormGroup `editable` scoped-slot prop to #controls when editable', () => {
    const wrapper = mountNumberFormGroup({ editable: true });
    const control = wrapper.find('button.test-control');
    expect(control.exists()).toBe(true);
    expect(control.attributes('data-editable')).toBe('true');
  });

  it('forwards a falsy `editable` scoped-slot prop when not editable', () => {
    const wrapper = mountNumberFormGroup({ editable: false });
    const control = wrapper.find('button.test-control');
    expect(control.exists()).toBe(true);
    expect(control.attributes('data-editable')).toBe('false');
  });
});
