<template>
  <h3 class="item-name">
    {{value}}
  </h3>
</template>

<script lang="ts" setup>
  defineProps<{
    value: string;
  }>();
</script>
