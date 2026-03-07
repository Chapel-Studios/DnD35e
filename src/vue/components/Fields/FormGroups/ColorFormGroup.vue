<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
  >
    <input
      type="color"
      :value="value ?? '#ffffff'"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLInputElement).value)"
    />
    <template #readonly>
      <div
        class="color-display"
        :style="{ backgroundColor: value ?? '#ffffff' }"
      ></div>
      {{ value ?? localize('D35E.NoColor') }}
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability,FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value: string | null;
    isDmOnly?: boolean;
    fieldPath?: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    onUpdate: (value: string | null) => void;
  }>();

  const {
    isEditable,
    localize,
  } = inject('documentSheetStore') as DocumentSheetStore;
  const isDisabled = computed(() => {
    const storeCanEdit = isEditable;
    if (props.disabled) return true;
    return storeCanEdit ? !storeCanEdit.value : false;
  });

  function onChange(val: string) {
    props.onUpdate(val);
  }
</script>

<style scoped>
  .color-display {
    width: 60px;
    height: 30px;
    border: 1px solid var(--color-border-light-tertiary);
  }
</style>
