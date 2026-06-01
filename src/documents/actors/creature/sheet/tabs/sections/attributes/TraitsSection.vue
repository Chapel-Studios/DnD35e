<template>
  <section class="sheet-section traits-section">
    <h2 class="section-header">{{ localize('dnd35e.ACTOR.section.Traits') }}</h2>
    <div class="traits-grid">
      <SelectFormGroup
        :label="localize('dnd35e.CREATURE.FIELDS.size.label')"
        field-path="system.size"
        :options="sizeOptions"
        direct-update
      />
      <div class="trait-stub">
        <span class="trait-stub-label">{{ localize('dnd35e.ACTOR.trait.creatureType') }}</span>
        <span class="trait-stub-value">—</span>
      </div>
      <div class="trait-stub">
        <span class="trait-stub-label">{{ localize('dnd35e.ACTOR.trait.reach') }}</span>
        <span class="trait-stub-value">—</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { SIZE_SELECT_OPTIONS } from '@constants/sizes.mjs';
  import { SelectFormGroup } from '@vc/fields/index.mjs';

  const localize = (key: string) => game.i18n.localize(key);
  const sizeOptions = SIZE_SELECT_OPTIONS;
</script>

<style lang="scss" scoped>
  .traits-section {
    padding: 0.25rem;
  }

  .traits-grid {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .trait-stub {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    font-size: 0.8rem;
    padding: 0.1rem 0;
    opacity: 0.6;
  }

  .trait-stub-label {
    min-width: 7rem;
    font-weight: bold;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-dark-secondary, #555);
  }

  .trait-stub-value {
    color: var(--color-text-dark-secondary, #888);
    font-style: italic;
  }
</style>
