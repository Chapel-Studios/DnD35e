<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
  >
    <select
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
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  import FormGroup from './FormGroup.vue';

  interface SelectOption {
    label: string;
    value: any;
  }

  const props = defineProps<{
    label?: string;
    hint?: string;
    value: any;
    options: SelectOption[];
    isDmOnly?: boolean;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    onUpdate: (value: any) => void;
  }>();

  const store = inject('documentSheetStore', null) as DocumentSheetStore | null;
  const isDisabled = computed(() => {
    const storeCanEdit = store?.isEditable;
    if (props.disabled) return true;
    return storeCanEdit ? !storeCanEdit.value : false;
  });

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function onChange(val: any) {
    props.onUpdate(val);
  }
</script>
