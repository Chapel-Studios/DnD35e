<template>
  <tr
    class="system-change-row"
    :class="index % 2 === 0 ? 'stripe-even' : 'stripe-odd'"
  >
    <td class="system-change-cell">
      <span class="system-change-key" :title="tooltip">{{ label }}</span>
      <span class="system-change-value">{{ formatChangeTypeSymbol(change.type) }} {{ change.value }}</span>
    </td>
  </tr>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/index.mjs';
  import { formatChangeTypeSymbol } from '@effects/baseActiveEffect/logic/index.mjs';
  import { findAspectByAccessPath, localizeFormula } from '@helpers/formulae/index.mjs';
  import { computed, inject } from 'vue';

  const props = defineProps<{
    change: EffectChangeDataDnd35e;
    index: number;
  }>();

  // Shared by SystemEffectRow (no backing document, always actor-targeted) and EffectRow
  // (real owned/transferred AEs) - both assume the '#self' context of whichever document
  // sheet this row is rendered inside, which covers the common actor-targeted case.
  const store = inject(DocumentSheetStoreSymbol, null) as DocumentSheetStore | null;

  /**
   * Turns a change key path (e.g. `system.encumbrance.maxDexBonus`) into a compact
   * display label (e.g. "Encumbrance Max Dex Bonus"). Fallback used only when no
   * document store is available (e.g. isolated component tests) to resolve the field's
   * actual localized label.
   */
  function humanizeChangeKey(key: string): string {
    const segments = key.split('.').filter((segment) => segment !== 'system');
    return segments
      .slice(-2)
      .map((segment) => segment
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, (char) => char.toUpperCase()))
      .join(' ');
  }

  /** The field's real schema label (e.g. "Land Speed"), same label shown on its FormGroup elsewhere on the sheet. */
  const label = computed(() => store?._storeUtils?.getFieldLabel?.(props.change.key) || humanizeChangeKey(props.change.key));

  /** Plain-text familiar path (e.g. "#Self.Speed.Land") for the label's hover tooltip - same reverse-lookup AspectPicker uses. */
  const tooltip = computed<string | undefined>(() => {
    const selfContext = store?.documentGetters?.familiarSchema?.value?.self;
    if (!selfContext) return undefined;
    const result = findAspectByAccessPath(selfContext.properties, props.change.key);
    if (!result) return undefined;
    return localizeFormula(`#self.${result.treePath.join('.')}`, { self: selfContext });
  });
</script>

<style scoped lang="scss">
  // Explicit stripe backgrounds (not nth-child) so colors stay stable regardless of how
  // many change rows are inserted/removed by expanding - matches the convention in
  // InventoryItemRow.vue for nested container contents.
  .system-change-row {
    &.stripe-even > td {
      background: transparent !important;
    }

    &.stripe-odd > td {
      background: color-mix(in srgb, var(--color-cool-4, #9ba5a0) 10%, transparent) !important;
    }
  }

  .system-change-cell {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.85rem;
    padding: 0.3rem 0.75rem 0.3rem 2.75rem !important;
  }

  .system-change-value {
    opacity: 0.8;
  }
</style>
