<template>
  <DocumentDetails>
    <!-- DESCRIPTION SECTION -->
    <template #description-section>
      <!-- Effects use default description from Effects tab typically -->
    </template>

    <!-- GM-ONLY SECTION SLOT -->
    <template #gm-section>
      <UniqueId v-if="hasIdentifiable" />
    </template>

    <!-- TINT -->
    <ColorFormGroup
      label="EFFECT.Tint"
      :value="tint"
      :on-update="getDirectFieldUpdater('tint')"
    />

    <!-- DISABLED -->
    <CheckBoxFormGroup
      label="EFFECT.Disabled"
      :value="isDisabled"
      :on-update="getDirectFieldUpdater('disabled')"
    />

    <!-- ORIGIN -->
    <TextFormGroup
      label="EFFECT.Origin"
      :value="origin"
      :disabled="true"
      :on-update="() => {}"
    />

    <!-- STATUSES -->
    <MultiSelectFormGroup
      label="EFFECT.Statuses"
      :value="statuses"
      :options="statusOptions"
      :on-update="getDirectFieldUpdater('statuses')"
    />

    <!-- SHOW ICON -->
    <SelectFormGroup
      label="EFFECT.ShowIcon"
      :value="showIcon"
      :options="showIconOptions"
      :on-update="getDirectFieldUpdater('showIcon')"
    />
  </DocumentDetails>
</template>

<script setup lang="ts">
  import { DocumentDetails } from '@ec/CoreMixin/index.mjs';
  import type { ActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import { CheckBoxFormGroup } from '@vc/Fields/index.mjs';
  import { ColorFormGroup } from '@vc/Fields/index.mjs';
  import { MultiSelectFormGroup } from '@vc/Fields/index.mjs';
  import { SelectFormGroup } from '@vc/Fields/index.mjs';
  import { TextFormGroup } from '@vc/Fields/index.mjs';
  import { UniqueId } from '@vc/Fields/index.mjs';
  import { computed, inject } from 'vue';

  const store = inject('documentSheetStore') as ActiveEffectConfigStore;
  const {
    documentGetters: {
      isDisabled,
      tint,
      statuses,
      showIcon,
      origin,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
    _storeUtils: { document: _document },
  } = store;

  // Check if the effect has identifiable properties
  const hasIdentifiable = computed(() => {
    const doc = _document.value as any;
    return doc?.system?.isIdentifiable !== undefined;
  });

  // Build status options from CONFIG.statusEffects
  const statusOptions = computed(() => {
    return Object.values(CONFIG.statusEffects).map((s: { id: string; name: string }) => ({
      value: s.id,
      label: s.name,
    }));
  });

  // Build show icon options from CONST.ACTIVE_EFFECT_SHOW_ICON
  const showIconOptions = computed(() => {
    const showIconConst = (CONST as any).ACTIVE_EFFECT_SHOW_ICON as Record<string, number>;
    return Object.entries(showIconConst)
      .map(([key, value]) => ({
        value: value,
        label: `EFFECT.SHOW_ICON.${key.toLowerCase()}`,
      }))
      .reverse();
  });
</script>
