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
  <EffectChangeRow
    v-for="(change, index) in (expanded ? changes : [])"
    :key="index"
    :change="change"
    :index="index"
  />
</template>

<script setup lang="ts">
  import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/data/index.mjs';
  import EffectChangeRow from '@vc/effects/EffectChangeRow.vue';
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
</style>

