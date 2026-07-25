<template>
  <div class="actor-tab settings-tab">
    <section class="settings-section">
      <h3 class="settings-section-label">{{ localize('dnd35e.CREATURE.FIELDS.settings.label') }}</h3>
      <ToggleSwitchFormGroup
        field-path="system.settings.isPartyMember"
      />
      <SelectFormGroup
        :value="selectedDeathThresholdMode"
        :options="deathThresholdModeOptions"
        :on-update="onDeathThresholdModeUpdate"
        field-path="flags.dnd35e.useDeathThresholdOverride"
        label="dnd35e.SETTINGS.DeathThreshold.ModeLabel"
        hint="dnd35e.SETTINGS.DeathThreshold.ModeHint"
        hide-field-controls
      />
      <FormulaFormGroup
        v-if="selectedDeathThresholdMode === 'custom'"
        :value="deathThresholdOverrideFormula"
        :on-update="onDeathThresholdFormulaUpdate"
        field-path="flags.dnd35e.deathThresholdOverrideFormula"
        label="dnd35e.SETTINGS.DeathThreshold.Formula.Name"
        hint="dnd35e.SETTINGS.DeathThreshold.Formula.Hint"
        hide-field-controls
      />
      <ToggleSwitchFormGroup
        field-path="flags.dnd35e.disableTokenSync"
        label="dnd35e.SETTINGS.TokenSync.DisableLabel"
        hint="dnd35e.SETTINGS.TokenSync.DisableHint"
        hide-field-controls
      />
    </section>
    <section
      v-if="isGM"
      class="settings-section"
    >
      <h3 class="settings-section-label">{{ localize('dnd35e.SETTINGS.ActorSharedVision.SectionLabel') }}</h3>
      <p class="settings-section-hint">{{ localize('dnd35e.SETTINGS.ActorSharedVision.SectionHint') }}</p>
      <SelectFormGroup
        :value="sharedVisionScope"
        :options="sharedVisionScopeOptions"
        :on-update="onSharedVisionScopeUpdate"
        field-path="flags.dnd35e.sharedVisionScope"
        label="dnd35e.SETTINGS.ActorSharedVision.Label"
        hide-field-controls
      />
    </section>
  </div>
</template>

<script lang="ts" setup>
  import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
  import type { ActorSharedVisionScope } from '@canvas/vision/logic/sharedVisionScope.mjs';
  import { broadcastVisionRefresh } from '@canvas/vision/sharedVisionPool.mjs';
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import FormulaFormGroup from '@helpers/formulae/FormulaFormGroup.vue';
  import {
    DEATH_THRESHOLD_OVERRIDE_FORMULA_FLAG,
    getActorDeathThresholdOverride,
    getWorldDeathThresholdSetting,
    resolveDeathThresholdValue,
    USE_DEATH_THRESHOLD_OVERRIDE_FLAG,
  } from '@settings/combat/index.mjs';
  import { SYSTEM_ID } from '@settings/shared.mjs';
  import type { SelectOption } from '@vc/fields/index.mjs';
  import { SelectFormGroup, ToggleSwitchFormGroup } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  const store = inject(DocumentSheetStoreSymbol) as DocumentSheetStore<ActorDnd35e>;
  const { document } = store._storeUtils;
  const { isGM } = inject(RenderModeStoreSymbol) as RenderModeStore;

  const isPartyMember = computed(() => Boolean(foundry.utils.getProperty(document.value, 'system.settings.isPartyMember')));

  const worldThresholdSetting = computed(() => getWorldDeathThresholdSetting(isPartyMember.value));
  const currentDefaultThreshold = computed(() => resolveDeathThresholdValue(worldThresholdSetting.value, document.value));
  const deathThresholdOverride = computed(() => getActorDeathThresholdOverride(document.value));

  const selectedDeathThresholdMode = computed(() => {
    return deathThresholdOverride.value?.useDeathThresholdOverride ? 'custom' : 'default';
  });

  const deathThresholdOverrideFormula = computed(() => {
    return deathThresholdOverride.value?.formula ?? worldThresholdSetting.value;
  });

  const deathThresholdModeOptions = computed<SelectOption<string>[]>(() => {
    return [
      {
        value: 'default',
        label: `${localize('dnd35e.SETTINGS.DeathThreshold.Mode.Default')} (${currentDefaultThreshold.value})`,
        className: 'is-default-option',
      },
      {
        value: 'custom',
        label: 'dnd35e.SETTINGS.DeathThreshold.Mode.Custom',
      },
    ];
  });

  async function clearDeathThresholdOverride(): Promise<boolean> {
    await document.value.unsetFlag(SYSTEM_ID, USE_DEATH_THRESHOLD_OVERRIDE_FLAG);
    await document.value.unsetFlag(SYSTEM_ID, DEATH_THRESHOLD_OVERRIDE_FORMULA_FLAG);
    return true;
  }

  async function onDeathThresholdModeUpdate(value: string | null): Promise<boolean> {
    if (!value || value === 'default') {
      return await clearDeathThresholdOverride();
    }

    if (value === 'custom') {
      await store.documentActions.updateFlag(USE_DEATH_THRESHOLD_OVERRIDE_FLAG, true);
      return await store.documentActions.updateFlag(
        DEATH_THRESHOLD_OVERRIDE_FORMULA_FLAG,
        deathThresholdOverrideFormula.value || worldThresholdSetting.value
      );
    }

    return await clearDeathThresholdOverride();
  }

  async function onDeathThresholdFormulaUpdate(value: string): Promise<boolean> {
    await store.documentActions.updateFlag(USE_DEATH_THRESHOLD_OVERRIDE_FLAG, true);
    return await store.documentActions.updateFlag(DEATH_THRESHOLD_OVERRIDE_FORMULA_FLAG, value);
  }

  const sharedVisionScope = computed<ActorSharedVisionScope>(() => {
    return (foundry.utils.getProperty(document.value, 'flags.dnd35e.sharedVisionScope') as ActorSharedVisionScope | undefined) ?? 'default';
  });

  const sharedVisionScopeOptions: SelectOption<ActorSharedVisionScope>[] = [
    { value: 'default', label: 'dnd35e.SETTINGS.ActorSharedVision.Default' },
    { value: 'none', label: 'dnd35e.SETTINGS.SharedVisionScope.None' },
    { value: 'owned', label: 'dnd35e.SETTINGS.SharedVisionScope.Owned' },
    { value: 'partyMembers', label: 'dnd35e.SETTINGS.SharedVisionScope.PartyMembers' },
  ];

  async function onSharedVisionScopeUpdate(value: string | null): Promise<boolean> {
    const result = await store.documentActions.updateFlag('sharedVisionScope', value ?? 'default');
    broadcastVisionRefresh();
    return result;
  }

  const localize = (key: string) => game.i18n.localize(key);
</script>

<style lang="scss" scoped>
  .settings-tab {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem;
    overflow-y: auto;
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .settings-section-label {
    font-size: 0.65rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-dark-secondary, #555);
    border-bottom: 1px solid var(--color-border-light-2, #ccc);
    padding-bottom: 0.15rem;
    margin: 0 0 0.3rem;
  }

  .settings-section-hint {
    font-size: 0.7rem;
    color: var(--color-text-dark-secondary, #555);
    margin: -0.1rem 0 0.3rem;
  }

  :deep(option.is-default-option) {
    font-style: italic;
  }
</style>
