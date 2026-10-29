// @vitest-environment happy-dom

import CharacterDescriptionTab from '@actors/character/sheet/tabs/CharacterDescriptionTab.vue';
import GmNotes from '@actors/creature/sheet/components/GmNotes.vue';
import SessionNotes from '@actors/creature/sheet/components/SessionNotes.vue';
import { RichTextEditorFormGroup } from '@vc/fields/index.mjs';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vc/fields/index.mjs', () => ({
  RichTextEditorFormGroup: {
    props: ['fieldPath', 'placeholder'],
    template: '<div class="notes-editor-stub" />',
  },
}));

vi.mock('@actors/baseActor/sheet/tabs/ActorDescriptionTab.vue', () => ({
  default: { template: '<div><slot name="prepend" /><slot name="append" /></div>' },
}));

vi.mock('@actors/creature/sheet/tabs/bio/IdentitySection.vue', () => ({
  default: { template: '<div />' },
}));

vi.mock('@actors/creature/sheet/tabs/bio/PhysicalSection.vue', () => ({
  default: { template: '<div />' },
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const setIsGM = (isGM: boolean) => {
  vi.stubGlobal('game', { ...game, user: { ...game.user, isGM } });
};

describe('Creature notes editors', () => {
  it('binds session notes to the nested bio field', () => {
    const wrapper = mount(SessionNotes);
    expect(wrapper.getComponent(RichTextEditorFormGroup).props()).toMatchObject({
      fieldPath: 'system.bio.notes',
      placeholder: 'dnd35e.CREATURE.FIELDS.bio.notes.placeholder',
    });
    wrapper.unmount();
  });

  it('binds GM notes to the nested bio field for GMs', () => {
    setIsGM(true);
    const wrapper = mount(GmNotes);
    expect(wrapper.getComponent(RichTextEditorFormGroup).props()).toMatchObject({
      fieldPath: 'system.bio.gmNotes',
      placeholder: 'dnd35e.CREATURE.FIELDS.bio.gmNotes.placeholder',
    });
    wrapper.unmount();
  });

  it('does not mount the GM notes editor for non-GMs', () => {
    setIsGM(false);
    const wrapper = mount(GmNotes);
    expect(wrapper.findComponent(RichTextEditorFormGroup).exists()).toBe(false);
    wrapper.unmount();
  });

  it.each([true, false])('wires character Bio editors for isGM=%s', (isGM) => {
    setIsGM(isGM);
    const wrapper = mount(CharacterDescriptionTab);
    const paths = wrapper.findAllComponents(RichTextEditorFormGroup)
      .map(editor => editor.props('fieldPath'));
    expect(paths).toEqual(
      isGM
        ? ['system.bio.notes', 'system.bio.gmNotes']
        : ['system.bio.notes']
    );
    wrapper.unmount();
  });
});
