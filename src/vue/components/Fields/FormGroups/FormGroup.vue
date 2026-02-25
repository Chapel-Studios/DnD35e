<template>
  <div class="form-group" :class="{ 'with-hint': hint }" :hidden="isHidden">
    <label v-if="hasLabel">
      <i v-if="props.isDmOnly" class="fas fa-low-vision"></i>
      {{ localize(label!) }}
    </label>

    <!-- Content slot for input elements -->
    <slot></slot>

    <!-- Hint text -->
    <p v-if="hint" class="hint">{{ localize(hint) }}</p>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    label?: string; // localization key
    hint?: string; // localization key for hint text
    isDmOnly?: boolean;
  }>();
  
  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const hasLabel = !!props.label;
  const isHidden = props.isDmOnly && !game.user.isGM;
</script>

<style scoped>
.form-group {
  display: contents;
}

.form-group.with-hint {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 0.25rem 0.5rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border-light-tertiary);
}

.form-group.with-hint:last-child {
  border-bottom: none;
}

.form-group.with-hint label {
  font-weight: 500;
}

.form-group.with-hint :slotted(input),
.form-group.with-hint :slotted(select),
.form-group.with-hint :slotted(.form-fields) {
  justify-self: end;
}

.form-group.with-hint :slotted(.hint) {
  grid-column: 1 / -1;
  font-size: var(--font-size-11);
  color: var(--color-text-dark-secondary);
  margin: 0;
}

.form-group.with-hint :slotted(select[multiple]) {
  min-height: 80px;
}

.form-group.with-hint :slotted(input[type='text']),
.form-group.with-hint :slotted(input[type='number']) {
  min-width: 10rem;
}

.form-group.with-hint :slotted(input[type='color']) {
  width: 60px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--color-border-light-tertiary);
}
</style>
