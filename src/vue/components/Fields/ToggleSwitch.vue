<template>
  <label class="toggle-switch">
    <!-- Optional main label -->
    <span v-if="label" class="switch-label">{{ localize(label) }}</span>

    <div class="switch-container">
      <!-- Optional false label -->
      <span v-if="falseLabel" class="false-label">{{ localize(falseLabel) }}</span>

      <div class="switch-box">
        <input
          type="checkbox"
          :name="name"
          :checked="checked"
          :disabled="isDisabled"
          @change="onToggle"
        />
        <span class="slider"></span>
      </div>

      <!-- Optional true label -->
      <span v-if="trueLabel" class="true-label">{{ localize(trueLabel) }}</span>
    </div>
  </label>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  const props = withDefaults(defineProps<{
    name?: string;
    label?: string;
    trueLabel?: string;
    falseLabel?: string;
    checked: boolean;
    disabled?: boolean;
    /** @deprecated Use canEdit from store instead. Only use for overriding store behavior. */
    editable?: boolean;
  }>(), {
    disabled: false,
  });

  const emit = defineEmits<{
    (e: 'update', value: boolean): void;
  }>();

  // Store is optional - allows use in settings dialogs without DocumentSheetStore
  const store = inject('documentSheetStore', null) as DocumentSheetStore | null;

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  // Compute whether the field is disabled
  const isDisabled = computed(() => {
    const storeCanEdit = store?.isEditable;
    if (props.disabled) return true;
    // If editable prop is explicitly provided, use it
    if (props.editable !== undefined) return !props.editable;
    // Otherwise use store's canEdit (inverted for disabled)
    return storeCanEdit ? !storeCanEdit.value : false;
  });

  function onToggle (event: Event) {
    const target = event.target as HTMLInputElement;
    emit('update', target.checked);
  }
</script>

<style scoped lang="scss">
  .toggle-switch {
    display: flex;

    .switch-container {
      display: grid;
      grid-auto-flow: column;
      justify-content: flex-start;
    }

    .switch-label + .false-label {
      margin-left: 0.5rem;
    }

    .switch-box {
      position: relative;
      display: inline-block;
      width: 30px;
      height: 20px;
      margin: 0 0.5rem;
    }

    input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background-color: var(--color-border-light-tertiary);
      transition: 0.3s;
      border-radius: 20px;

      &::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0.25rem;
        height: 0.5rem;
        width: 100%;
        background-color: var(--color-text-selection-bg);
        border-radius: inherit;
        transition: background-color 0.3s;
      }

      &::after {
        content: "";
        position: absolute;
        height: 1rem;
        width: 1rem;
        left: 0;
        bottom: 0.25rem;
        background-color: var(--color-text-selection);
        border-radius: 50%;
        transition: 0.3s;
      }
    }

    input:checked + .slider {
      background-color: var(--color-primary);

      &::before {
        background-color: var(--color-shadow-highlight);
      }

      &::after {
        transform: translateX(1rem);
        background-color: var(--color-text-emphatic);
      }
    }
  }

  .form-container .toggle-switch {
    display: contents;
  }
</style>
