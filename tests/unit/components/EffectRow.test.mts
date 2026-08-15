// @vitest-environment happy-dom

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
}));

import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
import type { ActiveEffectDnd35e } from '@effects/index.mjs';
import EffectRow from '@vc/effects/EffectRow.vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

/**
 * Component tests for `EffectRow.vue` (src/vue/components/effects/EffectRow.vue).
 *
 * Focuses on the `readOnly` prop added for rows this sheet doesn't own (transferred
 * item effects, and - per Story 4.C's later expansion - status-driven condition
 * effects shown elsewhere via `SystemEffectRow` instead). `readOnly` must hide every
 * mutation control regardless of `canEdit`/`showVisibilityToggle`/GM status.
 */

const mkEffect = (overrides: Partial<ActiveEffectDnd35e> = {}): ActiveEffectDnd35e => ({
  id: 'effect-1',
  name: 'Test Effect',
  img: 'icons/svg/aura.svg',
  disabled: false,
  system: { isHidden: false },
  ...overrides,
} as unknown as ActiveEffectDnd35e);

// `game.user.isGM` is a readonly getter in the ambient Foundry types; tests still need
// to flip it since EffectRow reads `game.user.isGM` directly (not via an injected store).
const setIsGM = (value: boolean): void => {
  (game.user as unknown as { isGM: boolean }).isGM = value;
};

const mkStore = () => ({
  documentActions: {
    editEffect: vi.fn(),
    toggleEffect: vi.fn(),
    removeEffect: vi.fn(),
    toggleEffectHidden: vi.fn(),
  },
  documentGetters: {
    getOrCreateEffectRowStore: vi.fn(() => undefined),
  },
  _storeUtils: {
    createLocalizedComputed: vi.fn((key: string) => computed(() => key)),
  },
});

const mountEffectRow = (props: Record<string, unknown>, store = mkStore()) => mount(EffectRow, {
  props: { effect: mkEffect(), canEdit: true, ...props },
  global: {
    provide: { [DocumentSheetStoreSymbol as symbol]: store },
  },
});

describe('EffectRow', () => {
  beforeEach(() => {
    setIsGM(false);
  });

  it('renders the effect name and icon', () => {
    const wrapper = mountEffectRow({});
    expect(wrapper.text()).toContain('Test Effect');
    expect(wrapper.find('img.effect-icon').attributes('src')).toBe('icons/svg/aura.svg');
  });

  it('shows edit/toggle/delete controls when not read-only and canEdit is true', () => {
    const wrapper = mountEffectRow({ canEdit: true });
    expect(wrapper.find('.effect-controls').exists()).toBe(true);
    expect(wrapper.findAll('.effect-control')).not.toHaveLength(0);
    expect(wrapper.find('.effect-control.delete').exists()).toBe(true);
  });

  it('hides all controls when readOnly is true, even with canEdit true and GM', () => {
    setIsGM(true);
    const wrapper = mountEffectRow({ canEdit: true, readOnly: true });
    expect(wrapper.find('.effect-controls').exists()).toBe(false);
  });

  it('only shows the visibility toggle for GM users with canEdit and showVisibilityToggle', () => {
    setIsGM(false);
    const nonGmWrapper = mountEffectRow({ canEdit: true });
    expect(nonGmWrapper.find('.effect-control[title]').exists()).toBe(true); // edit/toggle still present
    expect(nonGmWrapper.findAll('.effect-control i.fa-eye, .effect-control i.fa-eye-slash')).toHaveLength(0);

    setIsGM(true);
    const gmWrapper = mountEffectRow({ canEdit: true });
    expect(gmWrapper.findAll('.effect-control i.fa-eye, .effect-control i.fa-eye-slash')).toHaveLength(1);
  });

  it('calls editEffect with the effect id when the edit button is clicked', async () => {
    const store = mkStore();
    const wrapper = mountEffectRow({ canEdit: true }, store);
    await wrapper.find('.effect-control i.fa-edit').trigger('click');
    expect(store.documentActions.editEffect).toHaveBeenCalledWith('effect-1');
  });
});

describe('EffectRow — expandable changes', () => {
  beforeEach(() => {
    setIsGM(false);
  });

  it('renders no expand button and no change rows when the effect has no changes', () => {
    const wrapper = mountEffectRow({});
    expect(wrapper.find('.effect-expand').exists()).toBe(false);
    expect(wrapper.findAll('.system-change-row')).toHaveLength(0);
  });

  it('toggles expansion of the effect\'s changes, even when readOnly', async () => {
    const wrapper = mountEffectRow({
      readOnly: true,
      effect: mkEffect({
        system: {
          isHidden: false,
          changes: [
            { key: 'system.encumbrance.maxDexBonus', type: 'downgrade', value: 3 },
            { key: 'system.abilities.dex.mod', type: 'downgrade', value: 3 },
          ],
        },
      } as unknown as Partial<ActiveEffectDnd35e>),
    });

    const expandBtn = wrapper.find('.effect-expand');
    expect(expandBtn.exists()).toBe(true);
    expect(wrapper.findAll('.system-change-row')).toHaveLength(0);

    await expandBtn.trigger('click');
    expect(wrapper.findAll('.system-change-row')).toHaveLength(2);

    await expandBtn.trigger('click');
    expect(wrapper.findAll('.system-change-row')).toHaveLength(0);
  });
});
