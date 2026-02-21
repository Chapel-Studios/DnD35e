<template>
  <section
    class="effects-tab"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="effects"
  >
    <div class="effects-header">
      <h3>{{ localize('D35E.Effects') }}</h3>
      <button
        type="button"
        class="create-effect-btn"
        :disabled="!canEdit"
        @click="createEffect"
      >
        <i class="fas fa-plus" />
        {{ localize('D35E.EffectCreate') }}
      </button>
    </div>

    <div class="effects-list">
      <!-- Temporary Effects -->
      <EffectCategory
        v-if="temporaryEffects.length"
        :label="localize('D35E.EffectTemporary').value"
        :effects="temporaryEffects"
        :can-edit="canEdit"
        @edit="editEffect"
        @toggle="toggleEffect"
        @delete="deleteEffect"
      />

      <!-- Passive Effects -->
      <EffectCategory
        v-if="passiveEffects.length"
        :label="localize('D35E.EffectPassive').value"
        :effects="passiveEffects"
        :can-edit="canEdit"
        @edit="editEffect"
        @toggle="toggleEffect"
        @delete="deleteEffect"
      />

      <!-- Inactive Effects -->
      <EffectCategory
        v-if="inactiveEffects.length"
        :label="localize('D35E.EffectInactive').value"
        :effects="inactiveEffects"
        :can-edit="canEdit"
        @edit="editEffect"
        @toggle="toggleEffect"
        @delete="deleteEffect"
      />

      <!-- Empty State -->
      <div v-if="!effects.length" class="effects-empty">
        <p>{{ localize('D35E.EffectsNone') }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { DnD35eActiveEffect } from '@effects/index.mjs';
  import type { ItemSheetStore } from '@items/baseItem/index.mjs';
  import { inject } from 'vue';

  import EffectCategory from '../components/EffectCategory.vue';

  const store = inject('documentSheetStore') as ItemSheetStore;
  const {
    tabs: { tabGetters: { getIsTabOpen } },
    documentGetters: {
      effects,
      temporaryEffects,
      passiveEffects,
      inactiveEffects,
    },
    canEdit,
    localize,
    _document: document,
  } = store;

  const isActiveTab = getIsTabOpen('effects');

  // Actions
  async function createEffect () {
    const effectData = {
      name: localize('D35E.EffectNew'),
      img: 'icons/svg/aura.svg',
      origin: document.value.uuid,
      disabled: false,
    };
    await document.value.createEmbeddedDocuments('ActiveEffect', [effectData]);
  }

  function editEffect (effect: DnD35eActiveEffect) {
    effect.sheet?.render(true);
  }

  async function toggleEffect (effect: DnD35eActiveEffect) {
    await effect.update({ disabled: !effect.disabled });
  }

  async function deleteEffect (effect: DnD35eActiveEffect) {
    await effect.delete();
  }
</script>

<style scoped lang="scss">
  .effects-tab {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.5rem;
  }

  .effects-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-border-light-1);
    padding-bottom: 0.5rem;

    h3 {
      margin: 0;
      font-size: 1.25rem;
    }

    .create-effect-btn {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.875rem;
      cursor: pointer;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .effects-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .effects-empty {
    text-align: center;
    color: var(--color-text-dark-secondary);
    font-style: italic;
    padding: 2rem;
  }
</style>
