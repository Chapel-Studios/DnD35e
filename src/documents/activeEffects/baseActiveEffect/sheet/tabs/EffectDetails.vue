<template>
  <DocumentDetails>
    <slot name="outer-prepend"></slot>
    <div class="effect-details grid-full-row">
      <slot name="prepend"></slot>

      <Statuses />
      <Tint />
      <ShowEffectIcon />

      <slot name="append"></slot>
    </div>
    <slot name="outer-append"></slot>
  </DocumentDetails>
</template>

<script setup lang="ts">
  import { DocumentDetails } from '@documents/document/index.mjs';

  import ShowEffectIcon from '../components/ShowEffectIcon.vue';
  import Statuses from '../components/Statuses.vue';
  import { Tint } from './index.mjs';
</script>

<style lang="scss" scoped>
  .effect-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(125px, 1fr));
    gap: 0.33rem;

    :deep(.form-group-label) {
      flex-direction: column;
    }

    :deep(.form-group input) {
      max-width: 50px;
      text-align: right;
    }

    :deep(.multi-select-form-group.form-group) {
      grid-auto-flow: row;

      .form-group-label {
        flex-direction: row;
      }
    }
  }
</style>
