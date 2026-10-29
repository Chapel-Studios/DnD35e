// @vitest-environment happy-dom

import { getHpAdjustmentPermissions } from '@actors/creature/sheet/components/hpAdjustmentPermissions.mjs';
import HpUpdater from '@actors/creature/sheet/components/HpUpdater.vue';
import type { FieldOverrides } from '@vc/fields/formGroups/fieldPermissions.mjs';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

const permissionsFor = (overrides: FieldOverrides = {}, isOwner = true, isGM = false) =>
  getHpAdjustmentPermissions({ getFlag: () => overrides }, isOwner, isGM);

describe('HpUpdater per-operation permissions', () => {
  it('hides nonlethal, disables temp, and leaves damage/healing available', async () => {
    const wrapper = mount(HpUpdater, {
      props: {
        compact: true,
        permissions: permissionsFor({
          system__hp__temp: { editability: 'gmOnly' },
          system__hp__nonlethal: { visibility: 'gmOnly', editability: 'gmOnly' },
        }),
      },
    });
    const options = wrapper.findAll('.multi-option-toggle__option');
    expect(options).toHaveLength(3);
    const temp = wrapper.get('button[title$="temp.label"]');
    expect(temp.attributes('disabled')).toBeDefined();
    expect(wrapper.get('.apply-btn').attributes('data-adjustment-type')).toBe('damage');
    expect(wrapper.get('.apply-btn').attributes('disabled')).toBeUndefined();
    await wrapper.get('button[title$="healing.label"]').trigger('click');
    expect(wrapper.get('.apply-btn').attributes('data-adjustment-type')).toBe('healing');
    wrapper.unmount();
  });

  it('replaces a stale hidden selection without disabling other selectable options', async () => {
    const wrapper = mount(HpUpdater, { props: { compact: true, permissions: permissionsFor() } });
    await wrapper.get('.hp-updater-amount').setValue(10);
    await wrapper.setProps({ permissions: permissionsFor({ system__hp__current: { visibility: 'gmOnly' } }) });
    expect(wrapper.findAll('.multi-option-toggle__option')).toHaveLength(2);
    expect(wrapper.get('.apply-btn').attributes('data-adjustment-type')).toBe('nonlethal');
    expect(wrapper.get('.apply-btn').attributes('disabled')).toBeUndefined();
    expect(wrapper.get('.apply-btn').attributes('data-amount')).toBe('0');
    wrapper.unmount();
  });

  it('keeps locked options visible but disables both selection and Apply', () => {
    const wrapper = mount(HpUpdater, {
      props: { compact: true, permissions: permissionsFor({ system__hp: { editability: 'gmOnly' } }) },
    });
    expect(wrapper.findAll('.multi-option-toggle__option')).toHaveLength(4);
    for (const option of wrapper.findAll('.multi-option-toggle__option')) {
      expect(option.attributes('disabled')).toBeDefined();
    }
    expect(wrapper.get('.hp-updater-amount').attributes('disabled')).toBeDefined();
    expect(wrapper.get('.apply-btn').attributes('data-action')).toBeUndefined();
    wrapper.unmount();
  });

  it.each([
    permissionsFor({}, false),
    permissionsFor({ system__hp: { visibility: 'gmOnly' } }),
    undefined,
  ])('does not render when no operation is visible or permissions are missing', (permissions) => {
    const wrapper = mount(HpUpdater, { props: { compact: true, permissions } });
    expect(wrapper.find('.hp-updater').exists()).toBe(false);
    wrapper.unmount();
  });
});
