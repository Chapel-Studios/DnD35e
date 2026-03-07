<template>
  <h3 class="item-name">
    {{value}}
  </h3>
</template>

<script lang="ts" setup>
  import { computed, MaybeRef } from 'vue';

  const props = defineProps<{
    value: MaybeRef<string>;
  }>();
  const value = computed(() => props.value);
</script>
