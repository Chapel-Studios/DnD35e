<template>
  <span v-if="showMaskedBadge" class="masked-badge" :title="maskedBadgeTooltip" :aria-label="maskedBadgeTooltip">
    <i class="fa-solid fa-mask" aria-hidden="true" />
  </span>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject } from 'vue';

  const props = defineProps<{
    fieldPath: string;
  }>();

  const {
    documentGetters: {
      getMaskForField,
      hasMaskForField,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const showMaskedBadge = computed(() => game.user?.isGM && hasMaskForField(props.fieldPath).value);
  const maskValue = getMaskForField(props.fieldPath);

  const formatMaskValue = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value);
    if (value && typeof value === 'object') {
      const objectValue = value as { toString?: () => string };
      if (typeof objectValue.toString === 'function' && objectValue.toString !== Object.prototype.toString) {
        return objectValue.toString();
      }
    }
    try {
      return JSON.stringify(value) ?? String(value);
    } catch {
      return String(value);
    }
  };
  

  const maskedBadgeTooltip = computed(() => game.i18n.format('dnd35e.IDENTIFIABLE.MaskedValueHint', {
    value: formatMaskValue(maskValue.value),
  }));

</script>
<style lang="scss" scoped>
  .masked-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 0.35rem;
    width: 1rem;
    height: 1rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-level-warning) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-level-warning) 40%, transparent);
    color: var(--color-level-warning);
    font-size: var(--font-size-10);
    font-weight: 600;
    line-height: 1.2;
    vertical-align: middle;
    
    i {
      font-size: 0.65rem;
    }
  }
</style>