// @vitest-environment happy-dom

vi.mock('@documents/document/index.mjs', () => ({
  DocumentSheetStoreSymbol: Symbol.for('test.DocumentSheetStore'),
}));

import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/index.mjs';
import type { FamiliarContext } from '@helpers/formulae/types.mjs';
import SystemEffectRow from '@vc/effects/SystemEffectRow.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

/**
 * Component tests for `SystemEffectRow.vue` (src/vue/components/effects/SystemEffectRow.vue).
 *
 * Covers the Actor Effects tab's "no backing document" rows: Creature's live encumbrance
 * penalty, and (per Story 4.C's later expansion) status-driven condition effects, both of
 * which reuse this component for a read-only, expandable presentation.
 */

const mkChange = (overrides: Partial<EffectChangeDataDnd35e> & Pick<EffectChangeDataDnd35e, 'key' | 'value'>): EffectChangeDataDnd35e => ({
  type: 'downgrade',
  phase: 'final',
  target: 'actor',
  isSystem: true,
  ...overrides,
});

describe('SystemEffectRow', () => {
  it('renders the label, icon, and System tag', () => {
    const wrapper = mount(SystemEffectRow, {
      props: { label: 'Moderately Loaded', icon: 'icons/svg/downgrade.svg' },
    });

    expect(wrapper.text()).toContain('Moderately Loaded');
    expect(wrapper.find('img.system-effect-icon').attributes('src')).toBe('icons/svg/downgrade.svg');
    expect(wrapper.find('.system-effect-tag').exists()).toBe(true);
  });

  it('renders no expand button and no change rows when there are no changes', () => {
    const wrapper = mount(SystemEffectRow, { props: { label: 'Moderately Loaded' } });

    expect(wrapper.find('.system-effect-expand').exists()).toBe(false);
    expect(wrapper.findAll('.system-change-row')).toHaveLength(0);
  });

  it('toggles expansion of the underlying changes, striped and formatted with the change-type symbol', async () => {
    const wrapper = mount(SystemEffectRow, {
      props: {
        label: 'Moderately Loaded',
        changes: [
          mkChange({ key: 'system.encumbrance.maxDexBonus', value: 3 }),
          mkChange({ key: 'system.abilities.dex.mod', value: 3 }),
        ],
      },
    });

    const expandBtn = wrapper.find('.system-effect-expand');
    expect(expandBtn.exists()).toBe(true);
    expect(wrapper.findAll('.system-change-row')).toHaveLength(0);

    await expandBtn.trigger('click');

    const rows = wrapper.findAll('.system-change-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Encumbrance Max Dex Bonus');
    expect(rows[0].text()).toContain('↓ 3');
    expect(rows[0].classes()).toContain('stripe-even');
    expect(rows[1].classes()).toContain('stripe-odd');

    await expandBtn.trigger('click');
    expect(wrapper.findAll('.system-change-row')).toHaveLength(0);
  });
});

describe('SystemEffectRow — field label & tooltip via DocumentSheetStore', () => {
  const selfContext: FamiliarContext = {
    display: 'Self',
    properties: {
      speed: {
        _display: 'Speed',
        land: { type: 'number', accessPath: 'system.speed.land', display: 'Land' },
      },
    },
  };

  const mkStore = () => ({
    documentGetters: {
      familiarSchema: computed(() => ({ self: selfContext })),
    },
    _storeUtils: {
      getFieldLabel: vi.fn((path: string) => (path === 'system.speed.land' ? 'Land Speed' : '')),
    },
  });

  it('shows the field\'s real schema label instead of the humanized key, with a familiar-path tooltip', () => {
    const wrapper = mount(SystemEffectRow, {
      props: {
        label: 'Prone',
        changes: [mkChange({ key: 'system.speed.land', value: 1, type: 'override' })],
      },
      global: {
        provide: { [DocumentSheetStoreSymbol as symbol]: mkStore() },
      },
    });

    const expandBtn = wrapper.find('.system-effect-expand');
    expect(expandBtn.exists()).toBe(true);
  });

  it('renders label and tooltip after expanding', async () => {
    const wrapper = mount(SystemEffectRow, {
      props: {
        label: 'Prone',
        changes: [mkChange({ key: 'system.speed.land', value: 1, type: 'override' })],
      },
      global: {
        provide: { [DocumentSheetStoreSymbol as symbol]: mkStore() },
      },
    });

    await wrapper.find('.system-effect-expand').trigger('click');

    const key = wrapper.find('.system-change-key');
    expect(key.text()).toBe('Land Speed');
    expect(key.attributes('title')).toBe('#Self.Speed.Land');
  });

  it('falls back to the humanized key when no store is provided', async () => {
    const wrapper = mount(SystemEffectRow, {
      props: {
        label: 'Prone',
        changes: [mkChange({ key: 'system.speed.land', value: 1, type: 'override' })],
      },
    });

    await wrapper.find('.system-effect-expand').trigger('click');

    const key = wrapper.find('.system-change-key');
    expect(key.text()).toBe('Speed Land');
    expect(key.attributes('title')).toBeUndefined();
  });
});

describe('SystemEffectRow — Group Change Target key label (poc §7.7)', () => {
  const originalHas = game.i18n.has.bind(game.i18n);
  const originalLocalize = game.i18n.localize.bind(game.i18n);

  it('resolves a registered group key (e.g. "group:allSaves") to its own official label rather than humanizing the raw key', async () => {
    game.i18n.has = ((key: string) => key === 'dnd35e.CREATURE.FIELDS.saves.all.label') as typeof game.i18n.has;
    game.i18n.localize = ((key: string) => (key === 'dnd35e.CREATURE.FIELDS.saves.all.label' ? 'All Saves' : originalLocalize(key))) as typeof game.i18n.localize;

    try {
      const wrapper = mount(SystemEffectRow, {
        props: {
          label: 'Prone',
          changes: [mkChange({ key: 'group:allSaves', value: -2 })],
        },
      });

      await wrapper.find('.system-effect-expand').trigger('click');

      const key = wrapper.find('.system-change-key');
      expect(key.text()).toBe('All Saves');
    } finally {
      game.i18n.has = originalHas;
      game.i18n.localize = originalLocalize;
    }
  });
});
