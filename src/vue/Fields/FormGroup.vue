<template>
  <div class="form-group">
    <label>{{ t(label) }}</label>

    <!-- Text input -->
    <input
      v-if="type === 'text'"
      type="text"
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
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    label: string;              // localization key
    value: any;                 // current value
    type?: "text" | "checkbox"; // default: text
    disabled?: boolean;
    editable?: boolean;         // from context.isEditable
    onUpdate: (value: any) => void;
  }>();

  function t(key: string) {
    return game.i18n.localize(key);
  }

  function onChange(val: any) {
    props.onUpdate(val);
  }
</script>

<style scoped>
  .form-group {
    display: contents;
  }
</style>
