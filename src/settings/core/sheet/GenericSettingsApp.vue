<template>
  <form class="generic-settings-form" @submit.prevent="onSubmit">
    <!-- Sections -->
    <fieldset v-for="section in sections" :key="section.key" class="settings-section">
      <legend>{{ localize(section.label) }}</legend>

      <component
        v-for="field in section.fields"
        :key="field.key"
        :is="getFormGroupComponent(field)"
        :label="field.label"
        :hint="field.hint"
        :value="getFieldValue(field.key)"
        :options="field.choices?.map(c => ({ label: c.label, value: c.value })) ?? []"
        :on-update="(value: unknown) => onUpdate(field.key, value)"
      />
    </fieldset>

    <!-- Footer -->
    <footer class="form-footer">
      <button type="submit" class="save-btn">
        <i class="fas fa-save" />
        {{ localize('DND35E.Settings.Save') }}
      </button>
    </footer>
  </form>
</template>

<script setup lang="ts">
  import CheckBoxFormGroup from '@vc/Fields/FormGroups/CheckBoxFormGroup.vue';
  import NumberFormGroup from '@vc/Fields/FormGroups/NumberFormGroup.vue';
  import SelectFormGroup from '@vc/Fields/FormGroups/SelectFormGroup.vue';
  import TextFormGroup from '@vc/Fields/FormGroups/TextFormGroup.vue';
  import type { VueSettingsContext } from '@vueApps/VueSettingsMixin.mjs';

  import type { SettingField, SettingsSection } from '../_types.mjs';

  const props = defineProps<{
    context: VueSettingsContext<Record<string, unknown>>;
    sections: SettingsSection[];
    onUpdateData: (path: string, value: unknown) => void;
  }>();

  const emit = defineEmits<{
    (e: 'submit'): void;
  }>();

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function getFieldValue(key: string): unknown {
    return props.context.data[key];
  }

  /** Map our field types to form group components */
  function getFormGroupComponent(field: SettingField): typeof CheckBoxFormGroup | typeof SelectFormGroup | typeof NumberFormGroup | typeof TextFormGroup {
    if (field.choices) return SelectFormGroup;
    if (field.type === 'boolean') return CheckBoxFormGroup;
    if (field.type === 'number') return NumberFormGroup;
    return TextFormGroup;
  }

  function onUpdate(key: string, value: unknown): void {
    props.onUpdateData(key, value);
  }

  function onSubmit(): void {
    emit('submit');
  }
</script>

<style scoped lang="scss">
  .generic-settings-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
  }

  .settings-section {
    border: 1px solid var(--color-border-light-primary);
    border-radius: 4px;
    padding: 0.75rem;
    margin: 0;

    legend {
      font-weight: bold;
      padding: 0 0.5rem;
    }
  }

  .form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border-light-primary);
    margin-top: auto;

    button {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 1rem;
      border-radius: 3px;
      cursor: pointer;

      &.save-btn {
        background: var(--color-bg-btn-positive);
        border: 1px solid var(--color-border-positive);
        color: var(--color-text-light-highlight);
      }
    }
  }
</style>
