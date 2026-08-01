// @vitest-environment happy-dom

import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import { useFormulaEditor } from '@helpers/formulae/useFormulaEditor.mjs';
import { collapseFormulaLineBreaks } from '@helpers/formulae/utils.mjs';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, nextTick, ref } from 'vue';

/**
 * Regression tests for poc §7.10 Half 2's `multiline` option on `useFormulaEditor`:
 * - Single-line (default) mode collapses real line breaks for at-rest display,
 *   swapping back to the real value while focused (no spurious flatten-commit
 *   on a benign, edit-free blur).
 * - Multiline mode never collapses, and `Enter` inserts a newline instead of
 *   committing/blurring (unless the autocomplete dropdown intercepts it).
 *
 * A tiny harness component wires the composable to a real `<input>`/`<textarea>` +
 * highlight `<div>` (mirroring how `FormulaFormGroup`/`FormulaMultilineModal` do it),
 * so DOM events (input/focus/blur/keydown) exercise the real logic end-to-end.
 */

const schema: FamiliarSchema = {
  self: { properties: { flag: { type: 'boolean', accessPath: 'system.flag', value: 'true' } } },
};

function makeHarness(options: { multiline: boolean; initialValue: string; onCommit: (v: string) => void }) {
  return defineComponent({
    setup() {
      const inputRef = ref<HTMLInputElement | HTMLTextAreaElement>();
      const highlightRef = ref<HTMLDivElement>();
      const currentValue = ref(options.initialValue);

      const editor = useFormulaEditor({
        contexts: computed(() => schema),
        currentValue: computed(() => currentValue.value),
        getInputElement: () => inputRef.value,
        getHighlightElement: () => highlightRef.value,
        getDropdownMenuElement: () => undefined,
        onCommit: (v) => {
          currentValue.value = v;
          options.onCommit(v);
        },
        multiline: options.multiline,
      });

      return () => h('div', [
        options.multiline
          ? h('textarea', {
            ref: inputRef,
            value: editor.localValue.value,
            onInput: editor.onInput,
            onBlur: editor.onBlur,
            onKeydown: editor.onKeyDown,
            onFocus: editor.onFocus,
          })
          : h('input', {
            ref: inputRef,
            value: editor.localValue.value,
            onInput: editor.onInput,
            onBlur: editor.onBlur,
            onKeydown: editor.onKeyDown,
            onFocus: editor.onFocus,
          }),
        h('div', { ref: highlightRef }),
      ]);
    },
  });
}

describe('useFormulaEditor — multiline option (poc §7.10)', () => {
  it('single-line mode collapses real line breaks for at-rest display', async () => {
    const onCommit = vi.fn();
    const wrapper = mount(makeHarness({ multiline: false, initialValue: 'a\nb', onCommit }));
    await nextTick();

    const input = wrapper.find('input');
    expect(input.element.value).toBe('a b');
  });

  it('single-line mode keeps the collapsed display while focused (a native <input> cannot hold a literal newline)', async () => {
    const onCommit = vi.fn();
    const wrapper = mount(makeHarness({ multiline: false, initialValue: 'a\nb', onCommit }));
    await nextTick();

    await wrapper.find('input').trigger('focus');
    await nextTick();

    expect(wrapper.find('input').element.value).toBe('a b');
  });

  it('single-line mode commits the (flattened) value when the user actually types before blurring', async () => {
    vi.useFakeTimers();
    try {
      const onCommit = vi.fn();
      const wrapper = mount(makeHarness({ multiline: false, initialValue: 'a\nb', onCommit }));
      await nextTick();

      const input = wrapper.find('input');
      await input.trigger('focus');
      input.element.value = 'a b edited';
      await input.trigger('input');
      await input.trigger('blur');
      await vi.advanceTimersByTimeAsync(250);
      await nextTick();

      expect(onCommit).toHaveBeenCalledWith('a b edited');
    } finally {
      vi.useRealTimers();
    }
  });

  it('single-line mode does not fire a spurious commit on a benign (edit-free) blur', async () => {
    vi.useFakeTimers();
    try {
      const onCommit = vi.fn();
      const wrapper = mount(makeHarness({ multiline: false, initialValue: 'a\nb', onCommit }));
      await nextTick();

      await wrapper.find('input').trigger('focus');
      await wrapper.find('input').trigger('blur');
      await vi.advanceTimersByTimeAsync(250);
      await nextTick();

      expect(onCommit).not.toHaveBeenCalled();
      // Re-collapsed back to the display form once settled at rest again.
      expect(wrapper.find('input').element.value).toBe('a b');
    } finally {
      vi.useRealTimers();
    }
  });

  it('multiline mode never collapses line breaks', async () => {
    const onCommit = vi.fn();
    const wrapper = mount(makeHarness({ multiline: true, initialValue: 'a\nb', onCommit }));
    await nextTick();

    expect(wrapper.find('textarea').element.value).toBe('a\nb');
  });

  it('multiline mode: Enter inserts a newline instead of committing/blurring', async () => {
    const onCommit = vi.fn();
    const wrapper = mount(makeHarness({ multiline: true, initialValue: 'a\nb', onCommit }));
    await nextTick();

    const textarea = wrapper.find('textarea');
    await textarea.trigger('focus');
    const keyEvent = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true });
    textarea.element.dispatchEvent(keyEvent);
    await nextTick();

    expect(keyEvent.defaultPrevented).toBe(false);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('multiline mode: typed/pasted newlines are preserved in the committed value', async () => {
    const onCommit = vi.fn();
    const wrapper = mount(makeHarness({ multiline: true, initialValue: '', onCommit }));
    await nextTick();

    const textarea = wrapper.find('textarea');
    await textarea.trigger('focus');
    textarea.element.value = 'line1\nline2';
    await textarea.trigger('input');
    await textarea.trigger('blur');
    await new Promise(resolve => setTimeout(resolve, 250));
    await nextTick();

    expect(onCommit).toHaveBeenCalledWith('line1\nline2');
  });

  it('Escape reverts to the current value and does not commit (both modes)', async () => {
    const onCommit = vi.fn();
    const wrapper = mount(makeHarness({ multiline: true, initialValue: 'a\nb', onCommit }));
    await nextTick();

    const textarea = wrapper.find('textarea');
    await textarea.trigger('focus');
    textarea.element.value = 'changed';
    await textarea.trigger('input');
    await textarea.trigger('keydown', { key: 'Escape' });
    await new Promise(resolve => setTimeout(resolve, 250));
    await nextTick();

    expect(onCommit).not.toHaveBeenCalled();
    expect(wrapper.find('textarea').element.value).toBe('a\nb');
  });
});

describe('collapseFormulaLineBreaks — indentation cleanup for the single-line display', () => {
  it('collapses newlines to a single space (pre-existing behavior)', () => {
    expect(collapseFormulaLineBreaks('a\nb')).toBe('a b');
  });

  it('collapses indentation left by an indented multiline formula down to single spaces', () => {
    const indented = '$conditional(\n    when(#self.hp.value <= 0, 0)\n    else(2)\n)';
    expect(collapseFormulaLineBreaks(indented)).toBe('$conditional( when(#self.hp.value <= 0, 0) else(2) )');
  });

  it('trims leading/trailing indentation entirely rather than leaving a stray leading/trailing space', () => {
    expect(collapseFormulaLineBreaks('\n    $conditional(when(a, 1) else(2))\n  ')).toBe('$conditional(when(a, 1) else(2))');
  });

  it('collapses runs of plain spaces/tabs even without a newline involved', () => {
    expect(collapseFormulaLineBreaks('a    b\tc')).toBe('a b c');
  });

  it('preserves whitespace inside quoted string literals verbatim', () => {
    expect(collapseFormulaLineBreaks('$stringContains(#self.name,   "two  spaces")')).toBe('$stringContains(#self.name, "two  spaces")');
  });
});

