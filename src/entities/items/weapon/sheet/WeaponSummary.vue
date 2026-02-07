<template>
  <ul class="weapon-summary">
    <li>{{ localizedType }}</li>
    <li>{{ weaponType }}</li>
    <li>{{ weaponSubtype }}</li>
  </ul>
</template>

<script setup lang="ts">
  import { inject } from 'vue';
  import type { WeaponStore } from './WeaponStore.mjs';

  const {
    documentGetters: {
      localizedType,
    },
    weaponGetters: {
      weaponType,
      weaponSubtype,
    },
  } = inject('itemSheetStore') as WeaponStore;
</script>

<style scoped lang="scss">
  .weapon-summary {
    grid-column: span 2;
    display: grid;
    grid-template: auto / 1fr 1fr 1fr;
    justify-items: center;
    font-size: 1.25rem;
    height: 60px;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      color: #4b4a44;
    }
  }
</style>
