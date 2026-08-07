// @vitest-environment happy-dom

import FormulaMultilineModal from '@helpers/formulae/FormulaMultilineModal.vue';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

/**
 * Component-level regression tests for poc §7.10 Half 2's `FormulaMultilineModal.vue`
 * itself — complementary to `use-formula-editor-multiline.test.mts` (which exercises
 * the underlying `useFormulaEditor` composable via a minimal harness) and
 * `formula-form-group-advanced-editor.test.mts` (which stubs this modal out entirely
 * to test `FormulaFormGroup`'s button/open-state wiring). These two are the ones that
 * actually mount the real modal component end-to-end.
 */

const schema: FamiliarSchema = {
  self: {
    properties: {
      flag: { type: 'boolean', accessPath: 'system.flag', value: 'true' },
      senses: {
        type: 'array',
        accessPath: 'system.senses',
        arrayElement: {
          kind: 'object',
          elementFields: {
            type: new foundry.data.fields.StringField(),
            range: new foundry.data.fields.NumberField(),
          },
          elementAccessPath: 'senses.element',
          localizationPrefixes: [],
        },
      },
    },
  },
};

describe('FormulaMultilineModal — real component', () => {
  it('shows the current formula with real (uncollapsed) line breaks when opened', async () => {
    const wrapper = mount(FormulaMultilineModal, {
      props: {
        open: true,
        formula: '$conditional(\n  when(#self.flag, 1)\n  else(2)\n)',
        contexts: schema,
        onCommit: vi.fn(),
      },
      global: { stubs: { teleport: true } },
    });
    await nextTick();

    const textarea = wrapper.find('textarea');
    expect(textarea.exists()).toBe(true);
    expect(textarea.element.value).toBe('$conditional(\n  when(#self.flag, 1)\n  else(2)\n)');
  });

  it('highlights, validates, and autocompletes #context.property identically to the inline field', async () => {
    const wrapper = mount(FormulaMultilineModal, {
      props: {
        open: true,
        formula: '',
        contexts: schema,
        onCommit: vi.fn(),
      },
      global: { stubs: { teleport: true } },
    });
    await nextTick();

    // Note: `wrapper.find('textarea')` is re-queried before every interaction
    // below rather than cached in a local variable — Vue replaces the
    // `<textarea>` DOM node across some of these re-renders (e.g. once the
    // Familiar dropdown mounts/unmounts as a sibling), so a stale `DOMWrapper`
    // reference silently stops receiving dispatched events partway through.
    await wrapper.find('textarea').trigger('focus');

    // Highlighting: a resolvable `#self.flag` token renders inside the highlight layer.
    await wrapper.find('textarea').setValue('#self.flag');
    await nextTick();
    expect(wrapper.find('.highlight-layer-multiline').html()).toContain('self.flag');

    // Autocomplete: typing `#self.` opens the Familiar dropdown with schema-derived options.
    await wrapper.find('textarea').setValue('#self.');
    await nextTick();
    const dropdown = wrapper.find('.familiar-dropdown');
    expect(dropdown.exists()).toBe(true);
    expect(dropdown.findAll('.familiar-item').length).toBeGreaterThan(0);

    // Validation: an unresolvable context surfaces a field-level error once blurred.
    await wrapper.find('textarea').setValue('#self.nonexistent');
    await wrapper.find('textarea').trigger('blur');
    await nextTick();
    expect(wrapper.find('.formula-input-multiline').classes()).toContain('has-error');
  });
});
