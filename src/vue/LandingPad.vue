<template>
  <div class="landing-pad">
    <!-- Drop Zone -->
    <div
      class="drop-zone"
      :class="{ 'is-over': isOver }"
      @dragover="handleDragOver"
      @dragenter="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <slot>
        {{ label ?? "Drop materials here" }}
      </slot>
    </div>

    <!-- Attached Items -->
    <ul class="attached-items">
      <li
        v-for="item in items"
        :key="item.uuid"
        class="attached-item"
      >
        <span @click="item.renderSheet">{{ item.name }}</span>
        <button
          v-if="props.isEditable"
          class="remove-btn"
          @click.stop="props.onRemoveItem(item.uuid)"
        >
          ✕
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
  import { ItemDnd35e } from '@items/baseItem/index.mjs';
  import { ref, watch, onMounted } from 'vue';
  import { VueRenderOptions } from './VueApplication.mjs';

  interface Props {
    /** List of UUIDs already attached to the document */
    uuids: string[];
    isEditable: boolean;
    onRemoveItem: (uuid: string) => void;
    onAddItem: (uuid: string) => void;

    /** Optional: restrict to specific item types */
    acceptedTypes?: string[];

    /** Optional label */
    label?: string;
  }

  interface itemData {
    name: string;
    uuid: string;
    renderSheet: () => void;
  }

  const props = defineProps<Props>();

  const isOver = ref(false);
  const items = ref<itemData[]>([]);

  /* -------------------------------------------- */
  /*  Load referenced items                       */
  /* -------------------------------------------- */

  async function loadItems () {
    const resolved: itemData[] = [];

    for (const uuid of props.uuids) {
      const item = (await foundry.utils.fromUuid(uuid)) as ItemDnd35e;
      if (item instanceof Item) {
        resolved.push({
          name: item.displayName,
          uuid,
          renderSheet: () => {
            item.sheet?.render({
              force: true,
              isEditable: false,
            } as VueRenderOptions);
          },
        });
      }
    }

    items.value = resolved;
  }

  onMounted(loadItems);
  watch(() => props.uuids, loadItems);

  /* -------------------------------------------- */
  /*  Drag + Drop                                 */
  /* -------------------------------------------- */

  function handleDragOver (event: DragEvent) {
    event.preventDefault();
    isOver.value = true;
  }

  function handleDragLeave () {
    isOver.value = false;
  }

  async function handleDrop (event: DragEvent) {
    event.preventDefault();
    isOver.value = false;

    const raw = event.dataTransfer?.getData('text/plain');
    if (!raw) return;

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    if (data.type !== 'Item' || !data.uuid) return;

    if (props.acceptedTypes && !props.acceptedTypes.includes(data.itemType)) {
      return;
    }

    props.onAddItem(data.uuid);
  }
</script>

<style scoped>
  .landing-pad {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .drop-zone {
    border: 2px dashed var(--color-border-light);
    padding: 0.75rem;
    border-radius: 4px;
    text-align: center;
    opacity: 0.8;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .drop-zone.is-over {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--color-border-highlight);
    opacity: 1;
  }

  .attached-items {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .attached-item {
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    border-radius: 3px;
    transition: background 0.15s ease;
  }

  .attached-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .remove-btn {
    margin-left: 0.5rem;
    background: transparent;
    border: none;
    color: var(--color-text-light);
    cursor: pointer;
    font-size: 0.9rem;
  }

  .remove-btn:hover {
    color: var(--color-text-bright);
  }
</style>
