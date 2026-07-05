<template>
  <ListFormGroup
    field-path="system.bio.languages"
    add-button-title="dnd35e.ACTOR.bio.addLanguage"
    remove-button-title="dnd35e.ACTOR.bio.removeLanguage"
    :add-item="addNewLanguage"
    :on-update="fieldUpdater"
    :value="projectedValue"
    class="languages-list"
  >
    <template #item-edit="{ item, disabled, updateItem }">
      <ComboBox
        :value="resolveLabel(item as string)"
        :options="availableLanguages"
        :allow-custom="allowCustom"
        :placeholder="localize('dnd35e.ACTOR.bio.addLanguage')"
        :disabled="disabled"
        @update="(v: string) => updateItem(resolveKey(v))"
      />
    </template>
    <template #item-readonly="{ item }">
      {{ resolveLabel(item as string) }}
    </template>
  </ListFormGroup>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { GAME_RULES_KEYS } from '@settings/gameRules/constants.mjs';
  import { SYSTEM_ID } from '@settings/shared.mjs';
  import { ComboBox, ListFormGroup } from '@vc/fields/index.mjs';
  import { inject, ref, watch } from 'vue';

  import type { CreatureDocumentStore } from '../CreatureStore.mjs';

  const localize = (key: string) => game.i18n.localize(key);

  const {
    documentGetters: { languages, availableLanguages },
    documentActions: { getViewAwareFieldUpdater },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  const allowCustom = (game.settings.get(SYSTEM_ID, GAME_RULES_KEYS.ALLOW_CUSTOM_LANGUAGES) ?? true) as boolean;

  const projectedValue = ref<string[]>([...languages.value]);
  watch(languages, (newVal) => {
    projectedValue.value = [...newVal];
  });

  const fieldUpdater = (update: string[] | null) => {
    projectedValue.value = [...(update ?? [])];
    getViewAwareFieldUpdater('system.bio.languages')(projectedValue.value);
  };

  function addNewLanguage(): void {
    projectedValue.value = [...projectedValue.value, ''];
  }

  /** Return the display label for a stored ID, or the raw text if no match. */
  function resolveLabel(idOrText: string): string {
    const opt = availableLanguages.value.find(o => o.value === idOrText);
    return opt?.label ?? idOrText;
  }

  /** Given a label (or custom text) from the ComboBox, return the matching key, or the text itself. */
  function resolveKey(labelOrText: string): string {
    const opt = availableLanguages.value.find(o => (o.label ?? o.value) === labelOrText);
    return opt ? opt.value : labelOrText;
  }
</script>

<style scoped lang="scss">
  .languages-list {
    width: 100%;
    min-width: 0;

    :deep(.list-form-group) {
      width: 100%;
      min-width: 0;
    }

    :deep(.list-items) {
      justify-content: flex-start;
      align-items: stretch;
      width: 100%;
      min-width: 0;
    }

    :deep(.list-item) {
      flex: 1 1 16rem;
      min-width: 0;
      max-width: 22rem;
    }

    :deep(.combobox-input),
    :deep(.combobox-select) {
      min-width: 0;
      width: 100%;
    }
  }
</style>
