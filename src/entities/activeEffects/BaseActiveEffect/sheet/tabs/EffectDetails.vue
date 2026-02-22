<template>
  <Details
    :name-heading="nameHeading"
    :name-label="nameLabel"
  >
    <!-- TINT -->
    <FormGroup
      label="EFFECT.Tint"
      type="color"
      :value="tint"
      :onUpdate="getFieldUpdater('tint')"
    />

    <!-- DISABLED -->
    <FormGroup
      label="EFFECT.Disabled"
      type="checkbox"
      :value="isDisabled"
      :onUpdate="getFieldUpdater('disabled')"
    />

    <!-- ORIGIN -->
    <FormGroup
      label="EFFECT.Origin"
      type="text"
      :value="origin"
      :disabled="true"
      :onUpdate="() => {}"
    />

    <!-- STATUSES -->
    <FormGroup
      label="EFFECT.Statuses"
      type="multiselect"
      :value="statuses"
      :options="statusOptions"
      :onUpdate="getFieldUpdater('statuses')"
    />

    <!-- SHOW ICON -->
    <FormGroup
      label="EFFECT.ShowIcon"
      type="select"
      :value="showIcon"
      :options="showIconOptions"
      :onUpdate="getFieldUpdater('showIcon')"
    />

    <!-- GM-ONLY SECTION SLOT -->
    <template #gm-section>
      <IdentifiableConfig v-if="hasIdentifiable" />
      <UniqueId v-if="hasIdentifiable" />
    </template>
  </Details>
</template>

<script setup lang="ts">
  import { IdentifiableConfig } from '@ec/Identifiable/index.mjs';
  import type { ActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import Details from '@items/baseItem/sheet/tabs/Details.vue';
  import { FormGroup, UniqueId } from '@vc/Fields/index.mjs';
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
      getFieldUpdater,
    },
    _document,
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

  const nameHeading = game.i18n.localize('EFFECT.Name');
  const nameLabel = game.i18n.localize('EFFECT.Name');
</script>
