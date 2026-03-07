<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
  >
    <div class="form-fields">
      <input
        type="checkbox"
        :checked="value"
        :disabled="isDisabled"
        @change="onChange(($event.target as HTMLInputElement).checked)"
      />
    </div>
    <template #readonly>
      <input
        type="checkbox"
        :checked="value"
        disabled
      />
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability,FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value: boolean;
    isDmOnly?: boolean;
    fieldPath?: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    onUpdate: (value: boolean) => void;
  }>();

  const store = inject('documentSheetStore', null) as DocumentSheetStore | null;
  const isDisabled = computed(() => {
    const storeCanEdit = store?.isEditable;
    if (props.disabled) return true;
    return storeCanEdit ? !storeCanEdit.value : false;
  });

  function onChange(val: boolean) {
    props.onUpdate(val);
  }
</script>

<style scoped>
.form-fields {
  justify-self: end;
}
</style>
