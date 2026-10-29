// @vitest-environment happy-dom

import BottomHudBar from '@documents/token/hud/components/BottomHudBar.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

describe('HUD weapon attacks visibility', () => {
  it.each([true, false])('renders weapon controls only when allowed=%s', (allowed) => {
    const wrapper = mount(BottomHudBar, {
      props: {
        canShowWeaponAttacks: allowed,
        canShowCombatManeuvers: true,
        weaponActions: [{ itemId: 'weapon', actionId: 'attack', label: 'Attack', img: '', enabled: false }],
        combatManeuvers: [],
      },
    });
    expect(wrapper.find('button[data-palette="weaponAttacks"]').exists()).toBe(allowed);
    expect(wrapper.find('[data-action="attackAction"]').exists()).toBe(allowed);
    expect(wrapper.find('button[data-palette="combatManeuvers"]').exists()).toBe(true);
    if (allowed) expect(wrapper.get('[data-action="attackAction"]').classes()).toContain('disabled');
    wrapper.unmount();
  });

  it.each([true, false])('renders maneuver controls only when allowed=%s', (allowed) => {
    const wrapper = mount(BottomHudBar, {
      props: {
        canShowWeaponAttacks: true,
        canShowCombatManeuvers: allowed,
        weaponActions: [],
        combatManeuvers: [{ id: 'totalDefense', label: 'Total Defense', enabled: false }],
      },
    });
    expect(wrapper.find('button[data-palette="combatManeuvers"]').exists()).toBe(allowed);
    expect(wrapper.find('[data-action="combatManeuver"]').exists()).toBe(allowed);
    expect(wrapper.find('button[data-palette="weaponAttacks"]').exists()).toBe(true);
    if (allowed) expect(wrapper.get('[data-action="combatManeuver"]').classes()).toContain('disabled');
    wrapper.unmount();
  });
});
