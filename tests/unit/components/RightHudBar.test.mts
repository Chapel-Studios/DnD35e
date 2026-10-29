// @vitest-environment happy-dom

import RightHudBar from '@documents/token/hud/components/RightHudBar.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('CONFIG', { controlIcons: { effects: 'effects.svg' } });

describe('HUD movement visibility', () => {
  it.each([true, false])('renders movement controls only when allowed=%s without changing stock controls', (allowed) => {
    const wrapper = mount(RightHudBar, {
      props: {
        hidden: false,
        statusEffects: [{ id: 'prone', title: 'Prone', src: 'prone.svg', cssClass: '' }],
        movementActions: [{ id: 'run', label: 'Run', cssClass: '' }],
        canSelectMovementAction: allowed,
        targeted: false,
        canToggleCombat: true,
        combatActive: false,
      },
    });
    expect(wrapper.find('button[data-palette="movementActions"]').exists()).toBe(allowed);
    expect(wrapper.find('[data-action="movementAction"]').exists()).toBe(allowed);
    expect(wrapper.find('button[data-palette="effects"]').exists()).toBe(true);
    expect(wrapper.find('[data-action="effect"]').exists()).toBe(true);
    expect(wrapper.find('[data-action="target"]').exists()).toBe(true);
    expect(wrapper.find('[data-action="combat"]').exists()).toBe(true);
    wrapper.unmount();
  });
});
