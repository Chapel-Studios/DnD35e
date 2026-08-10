<template>
  <section class="sheet-section">
    <h2 class="section-header">
      <span>{{ localize(header) }}</span>
      <span v-if="$slots['header-controls']" class="section-header-controls">
        <slot name="header-controls" />
      </span>
    </h2>
    <div class="section-list">
      <slot name="list" />
      <div class="section-grid">
        <slot name="grid" />
      </div>
      <slot name="list-append" />
    </div>
  </section>
</template>

<script setup lang="ts">
  const localize = (key: string) => game.i18n.localize(key);

  const { header } = defineProps<{
    header: string;
  }>();
</script>

<style lang="scss" scoped>
  .sheet-section {
    padding: 0.5rem;
    padding-top: 0;
    position: relative;

    & + .sheet-section {
      margin-top: 0.5rem;
    }
  }

  .section-header {
    margin-left: 1.1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &::before {
      content: '';
      position: absolute;
      top:1rem;
      bottom: 0;
      left: 0;
      right: 0;
      border: 1px solid var(--color-border, #ccc);
      z-index: -1;
    }
  }

  .section-header-controls {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;

    :slotted(.field-control-btn) {
      font-size: 0.8rem;
    }
  }

  .section-list {
    display: grid;
    gap: 0.5rem;
  }

  .section-grid {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  }
</style>