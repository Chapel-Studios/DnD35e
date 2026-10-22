<template>
  <button
    :aria-label="label ?? l(labelKey)"
    :data-action="dataAction"
    :data-palette="dataPalette"
    :data-tooltip-direction="tooltipDirection"
    type="button"
    class="control-icon"
    data-tooltip
  >
    <i v-if="iconClass" :class="iconClass" inert />
    <slot />
  </button>
</template>

<script lang="ts">
  export type HudButtonProps = {
    dataAction?: string;
    dataPalette?: string;
    labelKey: string;
    /** Literal, pre-formatted tooltip text (e.g. interpolated with a live value) — takes precedence over `labelKey`. */
    label?: string;
    iconClass?: string;
    tooltipDirection?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CENTER';
  };
</script>

<script setup lang="ts">
  const l = (key: string) => game.i18n.localize(key);
  defineProps<HudButtonProps>();
</script>

<style scoped lang="scss">
  .control-icon {
    cursor: pointer;
  }
</style>
