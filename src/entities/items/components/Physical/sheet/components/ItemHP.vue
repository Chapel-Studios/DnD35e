<template>
  <FormGroup
    label="HP"
    :is-dm-only="true"
    field-path="system.hp"
    :default-visibility="ownerPlusVisibility"
    :default-editability="gmOnlyEditability"
    class="item-hp-form-group"
  >
    <div class="hp-input">
      <input
        type="number"
        :value="currentHpSource"
        :disabled="!isEditable"
        @change="updateCurrentHp(($event.target as HTMLInputElement).value)"
      />
      <div class="sub-label">
        <span class="input-label">Current</span>
        <HasActiveEffectsNotification :field-path="'system.hp.value'" />
      </div>
    </div>
    <div class="hp-input">
      <input
        type="number"
        :value="maxHpSource"
        :disabled="!isEditable"
        @change="maxHpUpdater(($event.target as HTMLInputElement).value)"
      />
      <div class="sub-label">
        <span class="input-label">Max</span>
        <HasActiveEffectsNotification :field-path="'system.hp.max'" />
      </div>
    </div>

    <template #readonly>
      <span class="hp-display">{{ currentHp }}<HasActiveEffectsNotification :field-path="'system.hp.value'" /> / {{ maxHp }}<HasActiveEffectsNotification :field-path="'system.hp.max'" /></span>
    </template>
  </FormGroup>
</template>
<script setup lang="ts">
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import FormGroup from '@vc/Fields/FormGroups/FormGroup.vue';
  import { gmOnlyEditability, HasActiveEffectsNotification, ownerPlusVisibility } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    isEditable,
    documentGetters: {
      maxHp,
      currentHp,
      getSourceProperty,
    },
    documentActions: {
      getDirectFieldUpdater,
      getViewAwareFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  // Current HP is state - always write directly
  const updateCurrentHp = getDirectFieldUpdater('system.hp.value');
  const currentHpSource = getSourceProperty('system.hp.value');

  const maxHpUpdater = getViewAwareFieldUpdater('system.hp.max');
  const maxHpSource = getSourceProperty('system.hp.max');
</script>

<style lang="scss" scoped>
  .item-hp-form-group {
    // grid-column: span 2;

    .hp-input {
      display: grid;
      grid-auto-flow: row;
      justify-content: center;
    }

    .input-label {
      font-size: 0.75rem;
      text-align: center;
    }

    .sub-label {
      display: grid;
      align-items: center;
      justify-items: center;
      grid-auto-flow: column;

      :deep(.effect-tooltip) {
        font-size: 0.75rem;
      }
    }
  }
  .hp-display {
    display: inline-flex;
    align-items: center;

    :deep(.effect-tooltip) {
      font-size: 0.75rem;
      margin-left: 0.3rem;
    }
  }
</style>
