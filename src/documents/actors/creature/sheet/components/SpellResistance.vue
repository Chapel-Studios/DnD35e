<template>
  <FormulaFormGroup
    field-path="system.defense.spellResistance"
    :on-update="(value) => console.log('New SR value:', value)"
  />
</template>

<script setup lang="ts">
  import FormulaFormGroup from '@helpers/formulae/FormulaFormGroup.vue';
</script>

<style lang="scss" scoped>
</style>
