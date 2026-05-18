<template>
  <label class="toggle-switch">
    <!-- Optional main label -->
    <span v-if="label" class="switch-label">{{ localize(label) }}</span>

    <div class="switch-container">
      <!-- False side slot - default content is falseLabel -->
      <span class="false-label">
        <slot name="false">{{ leftLabel }}</slot>
      </span>

      <div class="switch-box">
        <input
          type="checkbox"
          :name="name"
          :checked="usableValue"
          :disabled="isDisabled"
          @change="onToggle"
        />
        <span class="slider"></span>
      </div>

      <!-- True side slot - default content is trueLabel -->
      <span class="true-label">
        <slot name="true">{{ rightLabel }}</slot>
      </span>
    </div>
  </label>
</template>

<script setup lang="ts">
  import { type RenderModeStore,RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject } from 'vue';

  const props = withDefaults(defineProps<{
    name?: string;
    label?: string;
    trueLabel?: string;
    falseLabel?: string;
    checked: boolean;
    disabled?: boolean;
    // Use this to flip the value of disabled for cases where the store value is counterintuitive
    // (e.g. "disabled" field on ActiveEffect)
    flip?: boolean;
  }>(), {
    disabled: false,
    flip: false,
  });

  const emit = defineEmits<{
    (e: 'update', value: boolean): void;
  }>();

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const usableValue = computed(() => props.flip ? !props.checked : props.checked);
  const trueDisplay = computed(() =>  props.trueLabel ? localize(props.trueLabel) : '');
  const falseDisplay = computed(() => props.falseLabel ? localize(props.falseLabel) : '');
  const rightLabel = computed(() => props.flip ? falseDisplay.value : trueDisplay.value);
  const leftLabel = computed(() => props.flip ? trueDisplay.value : falseDisplay.value);

  // Compute whether the field is disabled
  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !isEditMode.value;
  });

  function onToggle (event: Event) {
    const target = event.target as HTMLInputElement;
    emit('update', props.flip ? !target.checked : target.checked);
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
