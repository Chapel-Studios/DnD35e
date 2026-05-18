// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

// FormGroup imports `DocumentSheetStoreSymbol` from the heavy `@documents/document/index.mjs`
// barrel, which transitively pulls in document mixins, sheet stores, and Vue app classes
// that won't initialise cleanly in the unit env (they expect real Foundry ClientDocument /
// ApplicationV2 bases). Mock the barrel to expose just the Symbol the component needs.
vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));
// Same for FieldControls' deeper imports (it's stubbed in the mount but still gets parsed).
vi.mock('@documents/document/sheet/stores/RenderModeStore.mjs', () => ({
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import FormGroup from '@vc/fields/formGroups/FormGroup.vue';

import { createMockDocumentStore, createMockRenderModeStore, makeGlobalProvide } from './setup';

/**
 * Smoke test: FormGroup respects the visibility result returned by the document store.
 *
 * This is the cheapest possible verification that the override cascade wiring reaches
 * the DOM. The cascade logic itself is covered exhaustively in field-override-cascade.test.mts.
 */

const mountFormGroup = (options: {
  isGM: boolean;
  visible: boolean;
  fieldPath?: string;
}) => {
  const fieldPath = options.fieldPath ?? 'system.hp.value';
  return mount(FormGroup, {
    props: {
      fieldPath,
      label: 'HP',
      value: 10,
    },
    slots: {
      default: '<input class="test-input" type="text" />',
    },
    global: {
      provide: makeGlobalProvide({
        documentStore: createMockDocumentStore({
          fieldVisibility: { [fieldPath]: options.visible },
          labels: { [fieldPath]: 'HP' },
        }),
        renderModeStore: createMockRenderModeStore({ isGM: options.isGM, isEditMode: true }),
      }),
      stubs: {
        // Render the default slot so the `#controls` slot content actually appears.
        FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
      },
    },
  });
};

describe('FormGroup — visibility cascade smoke test', () => {
  it('hides the field for a non-GM user when getIsFieldVisible returns false', () => {
    const wrapper = mountFormGroup({ isGM: false, visible: false });
    const root = wrapper.find('.form-group');
    expect(root.exists()).toBe(true);
    // FormGroup sets the HTML `hidden` attribute when `isFieldVisible` is false.
    expect(root.attributes('hidden')).toBeDefined();
  });

  it('shows the field for a GM user even when (in this case) visible is also true', () => {
    const wrapper = mountFormGroup({ isGM: true, visible: true });
    const root = wrapper.find('.form-group');
    expect(root.exists()).toBe(true);
    expect(root.attributes('hidden')).toBeUndefined();
    // The default slot renders inside the form group when the field is editable.
    expect(wrapper.find('input.test-input').exists()).toBe(true);
  });
});
