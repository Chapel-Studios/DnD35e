// @vitest-environment happy-dom

import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import { useFormulaEditor } from '@helpers/formulae/useFormulaEditor.mjs';
import type { DOMWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { computed, defineComponent, h, nextTick, ref } from 'vue';

/**
 * `$`-function name autocomplete dropdown (poc §7.2b follow-up) — a sibling to the
 * existing `#`-context dropdown, but for the fixed `contains`/`find`/`any`/
 * `count`/`stringContains` keyword set. Triggered while typing a bare `$` or
 * partial keyword with no `(` yet; dismissed once `(` (or anything else)
 * follows, since the user has moved on to the call's argument (typically a
 * `#`-context reference, which then triggers the normal `#` dropdown).
 *
 * Uses the same real-DOM harness pattern as `use-formula-editor-multiline.test.mts`,
 * but renders `familiarOptions`/`showFamiliar` into plain DOM markup (rather than the
 * real `FamiliarDropdown.vue`) so assertions can stay DOM-based like the rest of the
 * suite, without reaching into the composable's internal refs via `wrapper.vm`.
 */
const schema: FamiliarSchema = {
  self: { properties: { tags: { type: 'array', accessPath: 'system.tags' } } },
};

function makeHarness() {
  return defineComponent({
    setup() {
      const inputRef = ref<HTMLInputElement>();
      const highlightRef = ref<HTMLDivElement>();
      const currentValue = ref('');

      const editor = useFormulaEditor({
        contexts: computed(() => schema),
        currentValue: computed(() => currentValue.value),
        getInputElement: () => inputRef.value,
        getHighlightElement: () => highlightRef.value,
        getDropdownMenuElement: () => undefined,
        onCommit: (v) => { currentValue.value = v; },
      });

      return () => h('div', [
        h('input', {
          ref: inputRef,
          value: editor.localValue.value,
          onInput: editor.onInput,
          onBlur: editor.onBlur,
          onKeydown: editor.onKeyDown,
          onFocus: editor.onFocus,
        }),
        h('div', { ref: highlightRef }),
        h(
          'div',
          { 'data-testid': 'dropdown', 'data-visible': editor.showFamiliar.value ? 'true' : 'false' },
          editor.familiarOptions.value.map(option => h('div', {
            class: 'option',
            'data-path': option.path,
            'data-full-path': option.fullPath,
            onClick: () => editor.onFamiliarSelect(option),
          }, option.display))
        ),
      ]);
    },
  });
}

/** Type `text` character-by-character, firing a real `input` event each time (mirrors real typing). */
async function typeText(input: DOMWrapper<HTMLInputElement>, text: string) {
  for (const ch of text) {
    input.element.value += ch;
    await input.trigger('input');
  }
  await nextTick();
}

describe('useFormulaEditor — $ function-name autocomplete dropdown', () => {
  it('typing a bare "$" shows all 9 keyword options', async () => {
    const wrapper = mount(makeHarness());
    await nextTick();
    const input = wrapper.find('input');
    await input.trigger('focus');
    await typeText(input, '$');

    expect(wrapper.find('[data-testid="dropdown"]').attributes('data-visible')).toBe('true');
    const paths = wrapper.findAll('.option').map(o => o.attributes('data-path')).sort();
    expect(paths).toEqual(['any', 'conditional', 'contains', 'count', 'find', 'fromFeet', 'fromKg', 'fromMeters', 'stringContains'].sort());
  });

  it('typing "$cont" filters to only "contains"', async () => {
    const wrapper = mount(makeHarness());
    await nextTick();
    const input = wrapper.find('input');
    await input.trigger('focus');
    await typeText(input, '$cont');

    const paths = wrapper.findAll('.option').map(o => o.attributes('data-path'));
    expect(paths).toEqual(['contains']);
  });

  it('typing "$con" matches both "conditional" and "contains" (shared prefix)', async () => {
    const wrapper = mount(makeHarness());
    await nextTick();
    const input = wrapper.find('input');
    await input.trigger('focus');
    await typeText(input, '$con');

    const paths = wrapper.findAll('.option').map(o => o.attributes('data-path')).sort();
    expect(paths).toEqual(['conditional', 'contains'].sort());
  });

  it('selecting "contains" inserts "$contains(" and dismisses the dropdown', async () => {
    const wrapper = mount(makeHarness());
    await nextTick();
    const input = wrapper.find('input');
    await input.trigger('focus');
    await typeText(input, '$con');

    await wrapper.find('.option[data-path="contains"]').trigger('click');
    await nextTick();

    expect(wrapper.find('input').element.value).toBe('$contains(');
    expect(wrapper.find('[data-testid="dropdown"]').attributes('data-visible')).toBe('false');
  });

  it('typing "(" after a complete keyword dismisses the function dropdown', async () => {
    const wrapper = mount(makeHarness());
    await nextTick();
    const input = wrapper.find('input');
    await input.trigger('focus');
    await typeText(input, '$contains(');

    expect(wrapper.find('[data-testid="dropdown"]').attributes('data-visible')).toBe('false');
  });

  it('an escaped "\\$" does not trigger the function dropdown', async () => {
    const wrapper = mount(makeHarness());
    await nextTick();
    const input = wrapper.find('input');
    await input.trigger('focus');
    await typeText(input, '\\$con');

    expect(wrapper.find('[data-testid="dropdown"]').attributes('data-visible')).toBe('false');
  });

  it('a "#" typed after a complete "$contains(" call opens the normal context dropdown, not the function dropdown', async () => {
    const wrapper = mount(makeHarness());
    await nextTick();
    const input = wrapper.find('input');
    await input.trigger('focus');
    await typeText(input, '$contains(#');

    expect(wrapper.find('[data-testid="dropdown"]').attributes('data-visible')).toBe('true');
    // The # dropdown shows schema contexts (e.g. "Self"), not function names.
    const fullPaths = wrapper.findAll('.option').map(o => o.attributes('data-full-path'));
    expect(fullPaths.every(p => p?.startsWith('#'))).toBe(true);
  });
});

