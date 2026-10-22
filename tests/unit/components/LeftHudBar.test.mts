// @vitest-environment happy-dom

import LeftHudBar from '@documents/token/hud/components/LeftHudBar.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

const mountBar = (visible: boolean, editable: boolean) => mount(LeftHudBar, {
  props: {
    elevation: 0,
    elevationDisabled: false,
    canChangeLevel: false,
    levels: [],
    locked: false,
    canConfigure: false,
    canSeeConcealment: visible,
    canEditConcealment: editable,
    concealmentIconClass: 'fa-solid fa-cloud-sun',
    concealmentTooltip: 'Concealed: 20%',
    concealmentOptions: [{ id: 'concealed', label: 'Concealed', value: 20, cssClass: 'active' }],
  },
});

describe('HUD concealment button', () => {
  it('keeps the icon and tooltip without exposing mutation actions when locked', () => {
    const wrapper = mountBar(true, false);
    const button = wrapper.get('button[aria-label="Concealed: 20%"]');
    expect(button.find('.fa-cloud-sun').exists()).toBe(true);
    expect(button.attributes('aria-disabled')).toBe('true');
    expect(button.attributes('data-action')).toBeUndefined();
    expect(button.attributes('data-palette')).toBeUndefined();
    expect(wrapper.find('[data-action="concealment"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows the palette and choices when editable', () => {
    const wrapper = mountBar(true, true);
    expect(wrapper.get('button[data-palette="concealment"]').attributes('data-action')).toBe('togglePalette');
    expect(wrapper.get('[data-action="concealment"]').attributes('data-concealment-value')).toBe('20');
    wrapper.unmount();
  });

  it('omits hidden concealment while leaving existing controls intact', () => {
    const wrapper = mountBar(false, false);
    expect(wrapper.find('button[aria-label="Concealed: 20%"]').exists()).toBe(false);
    expect(wrapper.find('[data-action="concealment"]').exists()).toBe(false);
    expect(wrapper.find('[data-action="sort"]').exists()).toBe(true);
    wrapper.unmount();
  });
});
