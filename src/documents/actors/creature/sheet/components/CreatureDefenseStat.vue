<template>
  <div class="shield">
    <span v-if="!!sublabel" class="sublabel" :title="resolvedSublabelTooltip">{{ sublabel }}</span>
    <span class="label" :title="resolvedLabelTooltip">{{ label }}</span>
    <span class="value">{{ resolvedValue }}</span>
    <slot />
  </div>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject } from 'vue';

  const props = withDefaults(defineProps<{
    fieldPath: string;
    value?: number | null;
    labelTooltip?: string;
    sublabel?: string;
    /** Optional tooltip for the sublabel. */
    sublabelTooltip?: string;
    noSign?: boolean; // flag to hide the + sign for positive values (default: false)
  }>(), {
    noSign: false,
  });

  const {
    documentGetters: {
      getViewAwareFieldValue,
    },
    _storeUtils: {
      getFieldHint,
      getFieldLabel,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
  const formatBonus = (n: number) => (!props.noSign && n >= 0 ? `+${n}` : `${n}`);

  const label = computed(() => getFieldLabel(props.fieldPath));
  const resolvedLabelTooltip = computed(() => props.labelTooltip
    ?? getFieldHint(props.fieldPath));
  const resolvedSublabelTooltip = computed(() => props.sublabelTooltip ?? resolvedLabelTooltip.value);
  const resolvedValue = computed(() => {
    const value = props.value
      ?? getViewAwareFieldValue<number | null>(props.fieldPath);
    return value !== null
      ? formatBonus(value)
      : null;
  });

</script>

<style lang="scss" scoped>
// Thank you to Izual989 for the shield SVG asset, which can be found in src/assets/shield.svg.
  .shield {
    position: relative;
    width: 8.5em;
    height: 8.5em;
    margin: 0 -0.75em;
    color: var(--color-cool-4);

    // Border layer — same mask scaled up slightly so the border color peeks out around the edges
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background-color: var(--color-tabs-border);
      -webkit-mask-image: url('../dnd35e/assets/shield.svg');
      -webkit-mask-size: contain;
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-position: center;
      mask-image: url('../dnd35e/assets/shield.svg');
      mask-size: contain;
      mask-repeat: no-repeat;
      mask-position: center;
      transform: scale(1.04);
      pointer-events: none;
      z-index: 1;
    }

    // Fill layer — sits on top of the border layer
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background-color: currentColor;
      -webkit-mask-image: url('../dnd35e/assets/shield.svg');
      -webkit-mask-size: contain;
      -webkit-mask-repeat: no-repeat;
      -webkit-mask-position: center;
      mask-image: url('../dnd35e/assets/shield.svg');
      mask-size: contain;
      mask-repeat: no-repeat;
      mask-position: center;
      pointer-events: none;
      z-index: 2;
    }

    .label, .value, .sublabel {
      position: absolute;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--color-form-label, #555);
      pointer-events: none;
      z-index: 3;
    }

    .sublabel {
      top: 25%;
      font-size: 1.1rem;
      font-weight: 500;

      & + .label {
        font-size: 1.15rem;
        top: 42%;
      }
    }

    .label {
      top: 36%;
      font-size: 1.4rem;
      font-weight: 700;
    }

    .value {
      bottom: 0.75rem;
      font-size: 1.3rem;
      font-weight: 600;
    }
  }
</style>