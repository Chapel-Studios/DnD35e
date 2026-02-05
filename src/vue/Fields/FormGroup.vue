<template>
  <div class="form-group" :hidden="isHidden">
    <label v-if="hasLabel">
      <i v-if="props.isDmOnly" class="fas fa-low-vision"></i>
      {{ t(label!) }}
    </label>

    <!-- Text input -->
    <input
      v-if="type === 'text'"
      type="text"
      :value="value"
      :disabled="disabled || !editable"
      @change="onChange(($event.target as HTMLInputElement).value)"
    />
    
    <!-- Number input -->
    <input
      v-else-if="type === 'number'"
      type="number"
      :value="value"
      :disabled="disabled || !editable"
      @change="onChange(($event.target as HTMLInputElement).value)"
    />

    <!-- Checkbox -->
    <div v-else-if="type === 'checkbox'">
      <input
        type="checkbox"
        :checked="value"
        :disabled="disabled || !editable"
        @change="onChange(($event.target as HTMLInputElement).checked)"
      />
    </div>

    <!-- Dropdown -->
    <select
      v-else-if="type === 'select'"
      :value="value"
      :disabled="disabled || !editable"
      @change="onChange(($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ t(opt.label) }}
      </option>
    </select>
    
    <!-- Multi-select -->
    <select
      v-else-if="type === 'multiselect'"
      multiple
      :value="value"
      :disabled="disabled || !editable"
      @change="onChange(Array.from(($event.target as HTMLSelectElement).selectedOptions).map(o => o.value))"
    >
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ t(opt.label) }}
      </option>
    </select>

  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label?: string;              // localization key
  value: any;                  // current value
  type?: "text" | "number" | "checkbox" | "select" | "multiselect";
  disabled?: boolean;
  editable?: boolean;
  onUpdate: (value: any) => void;
  isDmOnly?: boolean;

  // Used when type === "select" | "multiselect"
  options?: Array<{ label: string; value: any }>;
}>();

function t(key: string) {
  return game.i18n.localize(key);
}

function onChange(val: any) {
  props.onUpdate(val);
}

const hasLabel = !!props.label;
const isHidden = props.isDmOnly && !game.user.isGM;
</script>

<style scoped>
.form-group {
  display: contents;
}
</style>
