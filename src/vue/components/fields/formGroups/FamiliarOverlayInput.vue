<template>
  <div class="familiar-overlay-wrapper" :class="props.wrapperClass">
    <div class="familiar-overlay-input-wrapper" :class="props.inputWrapperClass">
      <div class="familiar-overlay-edit-container" :class="props.editContainerClass">
        <input
          ref="inputRef"
          type="text"
          class="familiar-overlay-input"
          :class="[props.inputClass, props.inputStateClasses, { 'has-decoration': hasDecoration }]"
          :id="props.id"
          :value="props.modelValue"
          :disabled="props.disabled"
          :placeholder="props.placeholder"
          :name="props.name"
          @input="emit('input', $event)"
          @blur="emit('blur', $event)"
          @keydown="emit('keydown', $event)"
          @focus="emit('focus', $event)"
          @scroll="emit('scroll', $event)"
          spellcheck="false"
          autocomplete="off"
        />

        <div
          ref="highlightLayerRef"
          class="familiar-overlay-highlight"
          :class="[props.highlightClass, props.highlightStateClasses, { 'has-decoration': hasDecoration }]"
          v-html="props.highlightedHtml"
        ></div>

        <!--
          Field decoration slot (e.g. the advanced-editor expand button, poc §7.10):
          rendered as an overlay button INSIDE the text field itself so it stays
          visible regardless of `hideFieldControls`/`hideLabel`/hint visibility —
          those only affect the FormGroup label row and hint text, not this input.
        -->
        <div v-if="hasDecoration" class="familiar-overlay-decoration">
          <slot name="decoration" />
        </div>
      </div>

      <FamiliarDropdown
        ref="familiarDropdownRef"
        :show="props.showFamiliar"
        :options="props.familiarOptions"
        :selected-index="props.familiarIndex"
        :position="props.familiarPosition"
        @select="emit('select', $event)"
      />
    </div>

    <p v-if="props.hint" class="familiar-overlay-hint" :class="props.hintClass">
      {{ props.hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
  import type { AutocompleteOption } from '@helpers/formulae/types.mjs';
  import FamiliarDropdown from '@vc/FamiliarDropdown.vue';
  import type { PropType } from 'vue';
  import { computed, ref, useSlots } from 'vue';

  const props = defineProps({
    modelValue: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    placeholder: { type: String, default: '' },
    id: { type: String, default: undefined },
    name: { type: String as PropType<string | undefined>, default: undefined },

    inputClass: { type: String, default: '' },
    highlightClass: { type: String, default: '' },
    wrapperClass: { type: String, default: '' },
    inputWrapperClass: { type: String, default: '' },
    editContainerClass: { type: String, default: '' },
    hintClass: { type: String, default: '' },

    inputStateClasses: { type: Object as PropType<Record<string, boolean>>, default: () => ({}) },
    highlightStateClasses: { type: Object as PropType<Record<string, boolean>>, default: () => ({}) },

    highlightedHtml: { type: String, default: '' },
    hint: { type: String, default: '' },

    familiarOptions: { type: Array as PropType<AutocompleteOption[]>, default: () => [] },
    showFamiliar: { type: Boolean, default: false },
    familiarIndex: { type: Number, default: 0 },
    familiarPosition: {
      type: Object as PropType<{ top: number; left: number }>,
      default: () => ({ top: 0, left: 0 }),
    },
  });

  const emit = defineEmits<{
    input: [event: Event];
    blur: [event: FocusEvent];
    keydown: [event: KeyboardEvent];
    focus: [event: FocusEvent];
    scroll: [event: Event];
    select: [option: AutocompleteOption];
  }>();

  const slots = useSlots();
  /** Whether a `#decoration` button (e.g. the advanced-editor expand button) was provided. */
  const hasDecoration = computed(() => !!slots.decoration);

  const inputRef = ref<HTMLInputElement>();
  const highlightLayerRef = ref<HTMLDivElement>();
  const familiarDropdownRef = ref<InstanceType<typeof FamiliarDropdown>>();

  const getInputElement = (): HTMLInputElement | undefined => inputRef.value;
  const getHighlightElement = (): HTMLDivElement | undefined => highlightLayerRef.value;
  const getDropdownMenuElement = (): HTMLElement | undefined => familiarDropdownRef.value?.menuRef;

  defineExpose({
    getInputElement,
    getHighlightElement,
    getDropdownMenuElement,
  });
</script>
