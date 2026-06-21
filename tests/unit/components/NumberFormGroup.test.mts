// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';

// See FormGroup.test.mts for why we mock the CoreMixin barrel. NumberFormGroup imports
// both stores from the same barrel.
vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));
vi.mock('@documents/document/sheet/stores/RenderModeStore.mjs', () => ({
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import NumberFormGroup from '@vc/fields/formGroups/NumberFormGroup.vue';

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
      controls: ({ editable }: { editable: boolean }) => h('button', {
        class: 'test-control',
        'data-editable': String(editable),
      }, 'edit'),
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

  it.todo('forwards the FormGroup `editable` scoped-slot prop to #controls when editable');

  it.todo('forwards a falsy `editable` scoped-slot prop when not editable');

  it('forceEdit shows input in play mode but keeps it disabled when resolved editable=false', () => {
    const wrapper = mount(NumberFormGroup, {
      props: {
        fieldPath: FIELD_PATH,
        value: 7,
        forceEdit: true,
      },
      global: {
        provide: makeGlobalProvide({
          documentStore: createMockDocumentStore({
            fieldEditability: { [FIELD_PATH]: false },
            sourceValues: { [FIELD_PATH]: 7 },
          }),
          renderModeStore: createMockRenderModeStore({ isGM: true, isEditMode: false, isPlayMode: true }),
        }),
        stubs: {
          FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
        },
      },
    });

    const input = wrapper.find('input[type="number"]');
    expect(input.exists()).toBe(true);
    expect(input.attributes('disabled')).toBeDefined();
  });

  it('forceEdit does not bypass non-GM lock in play mode', () => {
    const wrapper = mount(NumberFormGroup, {
      props: {
        fieldPath: FIELD_PATH,
        value: 7,
        forceEdit: true,
      },
      global: {
        provide: makeGlobalProvide({
          documentStore: createMockDocumentStore({
            fieldEditability: { [FIELD_PATH]: false },
            sourceValues: { [FIELD_PATH]: 7 },
          }),
          renderModeStore: createMockRenderModeStore({ isGM: false, isEditMode: false, isPlayMode: true }),
        }),
        stubs: {
          FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
        },
      },
    });

    const input = wrapper.find('input[type="number"]');
    expect(input.exists()).toBe(true);
    expect(input.attributes('disabled')).toBeDefined();
  });

  it('forceEdit remains enabled when resolved editable=true', () => {
    const wrapper = mount(NumberFormGroup, {
      props: {
        fieldPath: FIELD_PATH,
        value: 7,
        forceEdit: true,
      },
      global: {
        provide: makeGlobalProvide({
          documentStore: createMockDocumentStore({
            fieldEditability: { [FIELD_PATH]: true },
            sourceValues: { [FIELD_PATH]: 7 },
          }),
          renderModeStore: createMockRenderModeStore({ isGM: true, isEditMode: true }),
        }),
        stubs: {
          FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
        },
      },
    });

    const input = wrapper.find('input[type="number"]');
    expect(input.exists()).toBe(true);
    expect(input.attributes('disabled')).toBeUndefined();
  });

  it('uses explicit value prop for edit display when source differs', () => {
    const wrapper = mount(NumberFormGroup, {
      props: {
        fieldPath: FIELD_PATH,
        value: 42,
      },
      global: {
        provide: makeGlobalProvide({
          documentStore: createMockDocumentStore({
            fieldEditability: { [FIELD_PATH]: true },
            sourceValues: { [FIELD_PATH]: 7 },
          }),
          renderModeStore: createMockRenderModeStore({ isGM: true, isEditMode: true }),
        }),
        stubs: {
          FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
        },
      },
    });

    const input = wrapper.find('input[type="number"]');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('42');
  });
});
