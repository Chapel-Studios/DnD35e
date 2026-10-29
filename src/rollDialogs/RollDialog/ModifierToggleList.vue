<template>
  <div v-if="modifiers.length" class="modifier-group">
    <h4>{{ localize(props.label) }}</h4>
    <label v-for="mod in modifiers" :key="mod.id" class="modifier-toggle" :data-modifier-id="mod.id">
      <input v-model="mod.checked" type="checkbox" @change="(event) => onUpdate(mod, event)" />
      {{ mod.label }}
      <i class="fas fa-circle-question" :title="mod.tooltip" />
    </label>
  </div>
</template>

<script setup lang="ts" generic="T extends { id: string; label: string; tooltip: string; checked: boolean }">
  const props = defineProps<{
    modifiers: T[];
    label: string;
    updateHandler: (mod: T, newValue: boolean) => void
  }>();

  const onUpdate = (mod: T, event: Event) => {
    if (event.currentTarget instanceof HTMLInputElement) {
      props.updateHandler(mod, event.currentTarget.checked);
    }
  };
</script>

<style lang="scss" scoped>
  .modifier-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: min-content;
    gap: 0.25rem 0.5rem;
    flex: 1 1 20rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.5rem;

    h4 {
      grid-column: 1 / -1;
      margin: 0;
      font-size: 1.15rem;
      letter-spacing: 0.075rem;
      font-weight: 500;
    }
  }

  .modifier-toggle {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;

    .fa-circle-question {
      opacity: 0.6;
    }
  }
</style>
