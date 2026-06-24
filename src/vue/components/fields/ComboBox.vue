<script lang="ts">
  import type { SelectOption } from './index.mjs';

  export interface ComboBoxProps<TValue> {
    /** Current value. */
    value: TValue;
    /** Available suggestions / options. */
    options: SelectOption<TValue>[];
    /**
     * When true (default), renders a text input with a datalist so the user
     * can type anything.  When false, renders a <select> restricted to the
     * provided options list.
     */
    allowCustom?: boolean;
    /** Placeholder text for the text input (ignored in select mode). */
    placeholder?: string;
    /** Disable the input and dim it visually. */
    disabled?: boolean;
  }
</script>

<template>
  <!-- Combobox mode: free-text input + datalist suggestions -->
  <template v-if="props.allowCustom !== false">
    <input
      type="text"
      class="combobox-input"
      :list="listId"
      :value="props.value"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      @change="onInputChange"
    />
    <datalist :id="listId">
      <option
        v-for="opt in props.options"
        :key="opt.value"
        :value="opt.label ?? opt.value"
      />
    </datalist>
  </template>

  <!-- Select mode: restricted to the options list -->
  <select
    v-else
    class="combobox-select"
    :value="props.value"
    :disabled="props.disabled"
    @change="onSelectChange"
  >
    <option v-if="!isValueInOptions" value="" disabled>
      {{ props.placeholder ?? '—' }}
    </option>
    <option
      v-for="opt in props.options"
      :key="opt.value"
      :value="opt.label ?? opt.value"
    >
      {{ opt.label ?? opt.value }}
    </option>
  </select>
</template>

<script setup lang="ts" generic="TValue extends string">
  import { computed } from 'vue';

  const props = withDefaults(defineProps<ComboBoxProps<TValue>>(), {
    allowCustom: true,
  });

  const emit = defineEmits<{
    update: [value: string];
  }>();

  const listId = `combobox-${Math.random().toString(36).slice(2)}`;

  const isValueInOptions = computed(() =>
    props.options.some(opt => (opt.label ?? opt.value) === props.value)
  );

  function onInputChange(e: Event): void {
    emit('update', (e.target as HTMLInputElement).value);
  }

  function onSelectChange(e: Event): void {
    emit('update', (e.target as HTMLSelectElement).value);
  }
</script>

<style lang="scss" scoped>
  .combobox-input,
  .combobox-select {
    width: 100%;
  }
</style>
