<template>
  <DocumentDetails>
    <slot name="outter-prepend"></slot>
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
  import { DocumentDetails } from '@ec/CoreMixin/index.mjs';

  import ShowEffectIcon from '../components/ShowEffectIcon.vue';
  import Statuses from '../components/Statuses.vue';
  import { Tint } from './index.mjs';
</script>

<style lang="scss" scoped>
  .effect-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.33rem;

    :deep(.form-group) {
      border: 1px solid var(--color-border, #7a7971);
      display: grid;
      grid-auto-flow: column;
      align-items: center;
      justify-items: center;
      grid-gap: 0.33rem;
      padding: 0.25rem;
    }
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
