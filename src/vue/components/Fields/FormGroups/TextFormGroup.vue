<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    :value="value"
  >
    <template v-if="slots.controls" #controls>
      <slot name="controls" />
    </template>
    <template v-if="slots.readonly" #readonly>
      <slot name="readonly" />
    </template>
    <input
      type="text"
      :value="value"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLInputElement).value)"
    />
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject, useSlots } from 'vue';

  import type { FieldEditability,FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';

  const slots = useSlots();
  const props = defineProps<{
    label?: string;
    hint?: string;
    value: string;
    isDmOnly?: boolean;
    fieldPath?: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    onUpdate: (value: string) => void;
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
