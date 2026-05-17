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

import FormGroupSection from '@vc/Fields/FormGroups/FormGroupSection.vue';

import { createMockDocumentStore, createMockRenderModeStore, makeGlobalProvide } from './setup';

const SECTION_PATH = 'system.hp';
const CHILD_VALUE = `${SECTION_PATH}.value`;
const CHILD_MAX = `${SECTION_PATH}.max`;

const mountSection = (options: {
  sectionVisible?: boolean;
  childValueVisible?: boolean;
  childMaxVisible?: boolean;
}) => {
  const sectionVisible = options.sectionVisible ?? true;
  const childValueVisible = options.childValueVisible ?? true;
  const childMaxVisible = options.childMaxVisible ?? true;

  return mount(FormGroupSection, {
    props: {
      fieldPath: SECTION_PATH,
      label: 'HP',
    },
    slots: {
      default: '<div class="children-stub">children</div>',
    },
    global: {
      provide: makeGlobalProvide({
        documentStore: createMockDocumentStore({
          fieldVisibility: {
            [SECTION_PATH]: sectionVisible,
            [CHILD_VALUE]: childValueVisible,
            [CHILD_MAX]: childMaxVisible,
          },
          sourceValues: {
            [SECTION_PATH]: { value: 7, max: 10 },
          },
        }),
        renderModeStore: createMockRenderModeStore({ isGM: true, isEditMode: true }),
      }),
      stubs: {
        FieldControls: { template: '<div class="fc-stub"><slot /></div>' },
      },
    },
  });
};

describe('FormGroupSection', () => {
  it('renders when section and at least one child are visible', () => {
    const wrapper = mountSection({});
    expect(wrapper.find('.form-group-section').exists()).toBe(true);
    expect(wrapper.find('.children-stub').exists()).toBe(true);
  });

  it('auto-hides when all children are invisible', () => {
    const wrapper = mountSection({
      childValueVisible: false,
      childMaxVisible: false,
    });
    expect(wrapper.find('.form-group-section').exists()).toBe(false);
  });

  it('hides when section-level visibility is false', () => {
    const wrapper = mountSection({ sectionVisible: false });
    expect(wrapper.find('.form-group-section').exists()).toBe(false);
  });

  it('stays visible when at least one child is visible', () => {
    const wrapper = mountSection({
      childValueVisible: true,
      childMaxVisible: false,
    });
    expect(wrapper.find('.form-group-section').exists()).toBe(true);
  });
});
