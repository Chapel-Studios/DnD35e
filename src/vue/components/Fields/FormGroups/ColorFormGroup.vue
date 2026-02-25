<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
  >
    <input
      type="color"
      :value="value ?? '#ffffff'"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLInputElement).value)"
    />
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  import FormGroup from './FormGroup.vue';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value: string | null;
    isDmOnly?: boolean;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    onUpdate: (value: string | null) => void;
  }>();

  const store = inject('documentSheetStore', null) as DocumentSheetStore | null;
  const isDisabled = computed(() => {
    const storeCanEdit = store?.isEditable;
    if (props.disabled) return true;
    return storeCanEdit ? !storeCanEdit.value : false;
  });

  function onChange(val: string) {
    props.onUpdate(val);
  }
</script>
