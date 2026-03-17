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
        :value="currentHp"
        :disabled="!isEditable"
        @change="updateCurrentHp(($event.target as HTMLInputElement).value)"
      />
      <span class="input-label">Current</span>
    </div>
    <div class="hp-input">
      <input
        type="number"
        :value="maxHp"
        :disabled="!isEditable"
        @change="maxHpUpdater(($event.target as HTMLInputElement).value)"
      />
      <span class="input-label">Max</span>
    </div>

    <template #readonly>
      <span>{{ currentHp }} / {{ maxHp }}</span>
    </template>
  </FormGroup>

  <!-- old implementation 
  <NumberFormGroup
    :editable="isEditable"
    label="HP"
    :value="currentHp"
    :on-update="updateCurrentHp"
    field-path="system.hp.value"
  />
  <NumberFormGroup
    :editable="isEditable"
    label="Max HP"
    :value="maxHp"
    :on-update="maxHpUpdater"
    field-path="system.hp.max"
  />
  -->
</template>
<script setup lang="ts">
  import type { PhysicalDocumentStore } from '@items/components/Physical/index.mjs';
  import FormGroup from '@vc/Fields/FormGroups/FormGroup.vue';
  import { gmOnlyEditability, ownerPlusVisibility } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    isEditable,
    physicalItemGetters: {
      maxHp,
      currentHp,
    },
    documentActions: {
      getDirectFieldUpdater,
      getViewAwareFieldUpdater,
    },
  } = inject('documentSheetStore') as PhysicalDocumentStore;

  // Current HP is state - always write directly
  const updateCurrentHp = getDirectFieldUpdater('system.hp.value');
  const maxHpUpdater = getViewAwareFieldUpdater('system.hp.max');
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
  }
</style>
