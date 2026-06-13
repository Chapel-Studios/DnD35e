<template>
  <div class="actor-tab settings-tab">
    <section class="settings-section">
      <h3 class="settings-section-label">{{ localize('dnd35e.CREATURE.FIELDS.settings.label') }}</h3>
      <ToggleSwitchFormGroup
        :label="localize('dnd35e.CREATURE.FIELDS.settings.isPartyMember.label')"
        field-path="system.settings.isPartyMember"
        :value="isPartyMember"
        direct-update
      />
    </section>
  </div>
</template>

<script lang="ts" setup>
  import type { CreatureStore } from '@actors/creature/sheet/CreatureStore.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { ToggleSwitchFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  const localize = (key: string) => game.i18n.localize(key);

  const {
    documentGetters: { isPartyMember },
  } = inject(DocumentSheetStoreSymbol) as CreatureStore;
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
</style>
