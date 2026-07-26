<template>
  <tr class="effect-row system-effect-row">
    <td class="effect-cell">
      <button
        v-if="changes.length"
        type="button"
        class="system-effect-expand"
        :title="localize(expanded ? 'dnd35e.EFFECT.CollapseDetails' : 'dnd35e.EFFECT.ExpandDetails')"
        @click="expanded = !expanded"
      >
        <i class="fas" :class="expanded ? 'fa-chevron-down' : 'fa-chevron-right'" />
      </button>
      <img :src="icon" class="system-effect-icon" alt="">
      <span class="effect-name">{{ label }}</span>
      <span class="system-effect-tag">{{ localize('dnd35e.EFFECT.System') }}</span>
    </td>
  </tr>
  <tr
    v-for="(change, index) in (expanded ? changes : [])"
    :key="index"
    class="system-change-row"
    :class="index % 2 === 0 ? 'stripe-even' : 'stripe-odd'"
  >
    <td class="system-change-cell">
      <span class="system-change-key">{{ humanizeChangeKey(change.key) }}</span>
      <span class="system-change-value">{{ formatChangeTypeSymbol(change.type) }} {{ change.value }}</span>
    </td>
  </tr>
</template>

<script setup lang="ts">
  import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/index.mjs';
  import { formatChangeTypeSymbol } from '@effects/baseActiveEffect/logic/index.mjs';
  import { ref } from 'vue';

  const { icon = 'icons/svg/aura.svg', changes = [] } = defineProps<{
    /** Already-localized display label - these rows have no backing document to read a name from. */
    label: string;
    /** Image path, matching the convention used elsewhere for effect/condition icons (not a font-awesome class). */
    icon?: string;
    /** The concrete changes this system effect represents - there is no AE sheet to open
     * for these (no backing document), so they're shown expanded in place instead. */
    changes?: EffectChangeDataDnd35e[];
  }>();

  const localize = (key: string) => game.i18n.localize(key);

  const expanded = ref(false);

  /**
   * Turns a change key path (e.g. `system.encumbrance.maxDexBonus`) into a compact
   * display label (e.g. "Encumbrance Max Dex Bonus") without a per-key label registry -
   * this row type is meant to stay generic as future self-contributed sources are added.
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
</script>

<style scoped lang="scss">
  .system-effect-row {
    opacity: 0.85;
  }

  .effect-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
  }

  .system-effect-expand {
    background: none;
    border: none;
    padding: 0;
    opacity: 0.6;
    cursor: pointer;
    width: 1rem;

    &:hover {
      opacity: 1;
    }
  }

  .system-effect-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    opacity: 0.7;
  }

  .effect-name {
    flex: 1;
  }

  .system-effect-tag {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    opacity: 0.6;
    padding: 0.1rem 0.35rem;
    border: 1px solid currentColor;
    border-radius: 3px;
  }

  .system-effect-details-row {
    opacity: 0.85;
  }

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
