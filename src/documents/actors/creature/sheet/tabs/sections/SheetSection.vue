<template>
  <section class="sheet-section">
    <h2 class="section-header">{{ localize(header) }}</h2>
    <div class="section-list">
      <slot name="list" />
      <div class="section-grid">
        <slot name="grid" />
      </div>
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
    position: relative;

    &:first-child {
      padding-top: 0;
    }
  }

  .section-header {
    margin-left: 1.1rem;

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

  .section-list {
    display: grid;
    gap: 0.5rem;
  }

  .section-grid {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  }
</style>