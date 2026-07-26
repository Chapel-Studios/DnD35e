// @vitest-environment happy-dom

import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/index.mjs';
import SystemEffectRow from '@vc/effects/SystemEffectRow.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

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
