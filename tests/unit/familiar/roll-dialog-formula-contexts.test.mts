// @vitest-environment happy-dom

import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import RollDialogFormulaField from '@source/rollDialogs/RollDialog/RollDialogFormulaField.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, expectTypeOf, it } from 'vitest';

describe('roll dialog formula contexts', () => {
  it('requires callers to supply contexts', () => {
    type Props = InstanceType<typeof RollDialogFormulaField>['$props'];
    expectTypeOf<Props['schema']>().toEqualTypeOf<FamiliarSchema>();
    expectTypeOf<'contexts'>().not.toExtend<keyof Props>();
  });

  it('uses the full supplied schema without needing an actor, store, or fallback', async () => {
    const schema: FamiliarSchema = {
      self: { display: 'Attacker', properties: {} },
      item: { display: 'Weapon', properties: {} },
      thisAttack: { display: 'This Attack', properties: {} },
      target: { display: 'Defender', properties: {} },
    };
    const wrapper = mount(RollDialogFormulaField, {
      props: { id: 'situational', label: 'Bonus', modelValue: '', schema },
      global: {
        stubs: { FamiliarOverlayInput: { template: '<input />' } },
      },
    });

    expect(wrapper.find('.hint').text()).toContain('[Attacker, Weapon, This Attack, Defender]');

    await wrapper.setProps({
      schema: { self: { display: 'Saving Actor', properties: {} } },
    });
    expect(wrapper.find('.hint').text()).toContain('[Saving Actor]');
    expect(wrapper.find('.hint').text()).not.toContain('Weapon');
    wrapper.unmount();
  });
});
