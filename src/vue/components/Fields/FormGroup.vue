<template>
  <div class="form-group" :hidden="isHidden">
    <label v-if="hasLabel">
      <i v-if="props.isDmOnly" class="fas fa-low-vision"></i>
      {{ localize(label!) }}
    </label>

    <!-- Text input -->
    <input
      v-if="type === 'text'"
      type="text"
      :value="value"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLInputElement).value)"
    />

    <!-- Number input -->
    <input
      v-else-if="type === 'number'"
      type="number"
      :value="value"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLInputElement).value)"
    />

    <!-- Color input -->
    <input
      v-else-if="type === 'color'"
      type="color"
      :value="value ?? '#ffffff'"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLInputElement).value)"
    />

    <!-- Checkbox -->
    <div v-else-if="type === 'checkbox'">
      <input
        type="checkbox"
        :checked="value"
        :disabled="isDisabled"
        @change="onChange(($event.target as HTMLInputElement).checked)"
      />
    </div>

    <!-- Dropdown -->
    <select
      v-else-if="type === 'select'"
      :value="value"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ localize(opt.label) }}
      </option>
    </select>

    <!-- Multi-select -->
    <select
      v-else-if="type === 'multiselect'"
      multiple
      :value="value"
      :disabled="isDisabled"
      @change="onChange(Array.from(($event.target as HTMLSelectElement).selectedOptions).map(o => o.value))"
    >
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ localize(opt.label) }}
      </option>
    </select>

  </div>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  const props = defineProps<{
    label?: string; // localization key
    value: any; // current value
    type?: 'text' | 'number' | 'checkbox' | 'select' | 'multiselect' | 'color';
    disabled?: boolean;
    /** @deprecated Use canEdit from store instead. Only use for overriding store behavior. */
    editable?: boolean;
    onUpdate:(value: any) => void;
    isDmOnly?: boolean;

    // Used when type === "select" | "multiselect"
    options?: Array<{ label: string; value: any }>;
  }>();

  const store = inject('documentSheetStore') as DocumentSheetStore;
  const storeCanEdit = store.canEdit;
  const localize = store.localize;

  // Compute whether the field is disabled
  const isDisabled = computed(() => {
    if (props.disabled) return true;
    // If editable prop is explicitly provided, use it
    if (props.editable !== undefined) return !props.editable;
    // Otherwise use store's canEdit (inverted for disabled)
    return storeCanEdit ? !storeCanEdit.value : false;
  });

  function onChange (val: any) {
    props.onUpdate(val);
  }

  const hasLabel = !!props.label;
  const isHidden = props.isDmOnly && !game.user.isGM;
</script>

<style scoped>
.form-group {
  display: contents;
}

.form-group select[multiple] {
  min-height: 80px;
}

.form-group input[type="color"] {
  width: 60px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--color-border-light-tertiary);
}
</style>
