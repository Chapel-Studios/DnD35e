<template>
  <div>
    <span class="item-status">{{equippedStatusLabel}}</span>
  </div>
</template>

<script lang="ts" setup>




const props = defineProps<{
  equippedStatusLabel: string;
}>();
const equippedStatusLabel = game.i18n.localize(props.equippedStatusLabel);
</script>