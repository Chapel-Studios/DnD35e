// @vitest-environment happy-dom

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
  RenderModeStoreSymbol: Symbol.for('test.RenderModeStore'),
}));

import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
import { CONDITION_CATEGORY_ID } from '@effects/baseActiveEffect/logic/index.mjs';
import type { ActiveEffectDnd35e } from '@effects/index.mjs';
import type { EffectRowData } from '@vc/effects/EffectsListSection.vue';
import EffectsListSection from '@vc/effects/EffectsListSection.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

/**
 * Component tests for `EffectsListSection.vue` (src/vue/components/effects/EffectsListSection.vue).
 *
 * The shared table consumed by both `ActorEffectsTab.vue` and `ItemEffects.vue` - covers
 * the `kind`-based row branching (owned/transferred/system, plus condition-category rows
 * always rendering via `SystemEffectRow` regardless of `kind`) and the create-effect
 * control's edit-mode gating.
 */

const mkEffect = (overrides: Partial<ActiveEffectDnd35e> = {}): ActiveEffectDnd35e => ({
  id: 'effect-1',
  name: 'Test Effect',
  img: 'icons/svg/aura.svg',
  disabled: false,
  system: { isHidden: false },
  ...overrides,
} as unknown as ActiveEffectDnd35e);

const mkOwnedRow = (overrides: Partial<EffectRowData> = {}): EffectRowData => ({
  id: 'effect-1',
  categoryId: 'general',
  categoryLabel: 'General',
  sortKey: 'test effect',
  kind: 'owned',
  effect: mkEffect(),
  ...overrides,
});

const mkStore = () => ({
  documentActions: {
    createEffect: vi.fn(),
    editEffect: vi.fn(),
    toggleEffect: vi.fn(),
    removeEffect: vi.fn(),
    toggleEffectHidden: vi.fn(),
  },
  _storeUtils: {
    createLocalizedComputed: vi.fn((key: string) => computed(() => key)),
  },
});

const mkRenderModeStore = (isEditMode = true) => ({
  isEditMode: ref(isEditMode),
});

const mountSection = (
  props: Record<string, unknown>,
  { store = mkStore(), renderModeStore = mkRenderModeStore() } = {}
) => mount(EffectsListSection, {
  props: { rows: [], emptyLabel: 'dnd35e.EFFECT.None', ...props },
  global: {
    provide: {
      [DocumentSheetStoreSymbol as symbol]: store,
      [RenderModeStoreSymbol as symbol]: renderModeStore,
    },
  },
});

describe('EffectsListSection', () => {
  it('renders a generic EffectRow for an owned, non-condition row', () => {
    const wrapper = mountSection({ rows: [mkOwnedRow()] });
    expect(wrapper.find('.effect-row').exists()).toBe(true);
    expect(wrapper.find('.system-effect-row').exists()).toBe(false);
    expect(wrapper.text()).toContain('Test Effect');
  });

  it('renders SystemEffectRow for a row with kind system', () => {
    const wrapper = mountSection({
      rows: [{
        id: 'system-1',
        categoryId: 'system',
        categoryLabel: 'System',
        sortKey: 'encumbrance',
        kind: 'system',
        label: 'Moderately Loaded',
        icon: 'icons/svg/downgrade.svg',
      }],
    });
    expect(wrapper.find('.system-effect-row').exists()).toBe(true);
    expect(wrapper.text()).toContain('Moderately Loaded');
  });

  it('renders SystemEffectRow for an owned condition-category row, even though kind is owned', () => {
    const wrapper = mountSection({
      rows: [mkOwnedRow({
        categoryId: CONDITION_CATEGORY_ID,
        categoryLabel: 'Condition',
        label: 'Fatigued',
        icon: 'icons/svg/fatigued.svg',
      })],
    });
    expect(wrapper.find('.system-effect-row').exists()).toBe(true);
    expect(wrapper.find('.effect-row:not(.system-effect-row)').exists()).toBe(false);
    expect(wrapper.text()).toContain('Fatigued');
  });

  it('renders a read-only row with the source item badge for a transferred row', () => {
    const wrapper = mountSection({
      rows: [{
        id: 'transferred-effect-1',
        categoryId: 'general',
        categoryLabel: 'General',
        sortKey: 'test effect',
        kind: 'transferred',
        effect: mkEffect(),
        sourceItemName: 'Cloak of Resistance',
      }],
    });
    expect(wrapper.find('.effect-row').exists()).toBe(true);
    expect(wrapper.find('.effect-controls').exists()).toBe(false);
    expect(wrapper.text()).toContain('Cloak of Resistance');
  });

  it('shows the create-effect control in edit mode and calls createEffect with additionalCreatableTypes', async () => {
    const store = mkStore();
    const wrapper = mountSection(
      { additionalCreatableTypes: ['secret'] },
      { store, renderModeStore: mkRenderModeStore(true) }
    );

    const createBtn = wrapper.find('.create-effect-btn');
    expect(createBtn.exists()).toBe(true);
    await createBtn.trigger('click');
    expect(store.documentActions.createEffect).toHaveBeenCalledWith(['secret']);
  });

  it('hides the create-effect control outside of edit mode', () => {
    const wrapper = mountSection({}, { renderModeStore: mkRenderModeStore(false) });
    expect(wrapper.find('.create-effect-btn').exists()).toBe(false);
  });

  it('renders the header-actions slot content', () => {
    const wrapper = mount(EffectsListSection, {
      props: { rows: [], emptyLabel: 'dnd35e.EFFECT.None' },
      slots: { 'header-actions': '<button class="reveal-secrets-btn">Reveal</button>' },
      global: {
        provide: {
          [DocumentSheetStoreSymbol as symbol]: mkStore(),
          [RenderModeStoreSymbol as symbol]: mkRenderModeStore(true),
        },
      },
    });
    expect(wrapper.find('.reveal-secrets-btn').exists()).toBe(true);
  });

  it('shows the empty label when there are no rows', () => {
    const wrapper = mountSection({ rows: [] });
    expect(wrapper.text()).toContain('dnd35e.EFFECT.None');
  });
});
