<template>
  <div class="actor-tab bio-tab">
    <!-- Identity -->
    <section class="bio-section">
      <h3 class="bio-section-label">{{ localize('dnd35e.ACTOR.bio.identity') }}</h3>
      <CreatureGender />
      <CreatureDeity />
      <CreatureAlignment />
    </section>

    <!-- Physical traits -->
    <section class="bio-section">
      <h3 class="bio-section-label">{{ localize('dnd35e.ACTOR.bio.physical') }}</h3>
      <CreatureAge />
      <CreatureHeight />
      <CreatureWeight />
    </section>

    <!-- Languages -->
    <section class="bio-section">
      <h3 class="bio-section-label">{{ localize('dnd35e.CREATURE.FIELDS.bio.languages.label') }}</h3>
      <ul class="language-list">
        <li v-for="(lang, idx) in languages" :key="idx" class="language-item">
          <span class="language-text">{{ lang }}</span>
          <button
            v-if="isEditMode"
            type="button"
            class="field-control-btn"
            :title="localize('dnd35e.ACTOR.bio.removeLanguage')"
            @click="removeLanguage(idx)"
          >
            <i class="fas fa-times" />
          </button>
        </li>
        <li v-if="languages.length === 0" class="language-empty">—</li>
      </ul>
      <div v-if="isEditMode" class="language-add">
        <input
          v-model="newLanguage"
          type="text"
          class="language-input"
          :placeholder="localize('dnd35e.ACTOR.bio.addLanguage')"
          @keydown.enter.prevent="addLanguage"
        />
        <button type="button" class="field-control-btn" @click="addLanguage">
          <i class="fas fa-plus" />
        </button>
      </div>
    </section>

    <!-- Senses (stub) -->
    <section class="bio-section">
      <TextFormGroup
        field-path="system.bio.senses"
      />
    </section>
  </div>
</template>

<script lang="ts" setup>
  import {
    CreatureAge,
    CreatureAlignment,
    CreatureDeity,
    CreatureGender,
    CreatureHeight,
    CreatureWeight,
  } from '@actors/creature/sheet/components/header/index.mjs';
  import type { CreatureDocumentStore } from '@actors/creature/sheet/CreatureStore.mjs';
  import type { RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { TextFormGroup } from '@vc/fields/index.mjs';
  import { inject,ref } from 'vue';

  const localize = (key: string) => game.i18n.localize(key);

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: { languages },
    documentActions: { getViewAwareFieldUpdater },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  const updateLanguages = getViewAwareFieldUpdater('system.bio.languages');

  const newLanguage = ref('');

  const addLanguage = () => {
    const trimmed = newLanguage.value.trim();
    if (!trimmed) return;
    void updateLanguages([...languages.value, trimmed]);
    newLanguage.value = '';
  };

  const removeLanguage = (idx: number) => {
    void updateLanguages(languages.value.filter((_, i) => i !== idx));
  };
</script>

<style lang="scss" scoped>
  .bio-tab {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem;
    overflow-y: auto;

    // ── Compact FormGroup overrides for the bio tab ─────────────────────────
    :deep(.form-group) {
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
      margin: 0 0 0.2rem;

      .form-group-label {
        margin: 0;
        min-width: 5rem;

        label {
          font-weight: bold;
          color: var(--color-text-dark-secondary, #666);
          text-transform: uppercase;
          font-size: 0.65rem;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
      }
    }
  }

  .bio-section {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .bio-section-label {
    font-size: 0.65rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-dark-secondary, #555);
    border-bottom: 1px solid var(--color-border-light-2, #ccc);
    padding-bottom: 0.15rem;
    margin: 0 0 0.3rem;
  }

  // ── Languages ─────────────────────────────────────────────────────────────

  .language-list {
    list-style: none;
    padding: 0;
    margin: 0 0 0.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .language-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.8rem;
    padding: 0.05rem 0;
  }

  .language-text {
    flex: 1 1 auto;
  }

  .language-empty {
    font-size: 0.8rem;
    color: var(--color-text-dark-secondary, #888);
    font-style: italic;
  }

  .language-add {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.15rem;
  }

  .language-input {
    flex: 1 1 auto;
    font-size: 0.8rem;
    height: 1.4em;
    padding: 0 0.2rem;
  }
</style>
