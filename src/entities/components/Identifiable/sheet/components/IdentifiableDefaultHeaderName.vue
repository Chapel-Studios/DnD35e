<template>
  <div class="identifiable-header-main">
    <!-- <HeaderNameField :value="effectiveDisplayName" /> -->
  </div>
</template>

<script setup lang="ts">
  // const {
  //   documentGetters: {
  //     displayName,
  //     identifiedDisplayName,
  //     unidentifiedDisplayName,
  //     isViewingAsUnidentified,
  //   },
  //   unidentifiedVisibilityMode: {
  //     showBoth,
  //   },
  // } = store;

  // const effectiveDisplayName = computed(() => {
  //   if (isViewingAsUnidentified.value) {
  //     return unidentifiedDisplayName.value || '???';
  //   }
  //   if (showBoth.value) {
  //     return identifiedDisplayName.value || displayName.value;
  //   }
  //   return displayName.value;
  // });
</script>

<style scoped lang="scss">
  .identifiable-header-main {
    display: contents;
  }
</style>
