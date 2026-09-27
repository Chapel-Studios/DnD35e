<template>
  <div class="actor-info" :class="orientation">
    <h2 class="actor-header-title">{{ header }}</h2>
    <div class="actor-header">
      <img :src="image" alt="" class="actor-image" />
      <div class="title-text">
        <h3 class="value">{{ name }}</h3>
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  withDefaults(defineProps<{
    image: string;
    name: string;
    header: string;
    orientation?: 'left' | 'right'
  }>(), {
    orientation: 'left',
  });
</script>

<style scoped lang="scss">
  .right {
    margin-right: 1rem;
    text-align: right;

    .actor-header {
      flex-direction: row-reverse;
    }
  }

  .actor-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    .actor-image {
      max-width: 3.5rem;
    }

    .title-text {
      display: flex;
      flex-direction: column;
    }
  }

  h2 {
    font-size: 1.75rem;
  }

  h3 {
    margin: 0;
    display: inline;
    font-size: 1.5rem;
  }
</style>