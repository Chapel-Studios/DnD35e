<template>
  <img
    class="item-art"
    :class="[props.class, { editable: isEditMode }]"
    :src="currentImg"
    :title="props.title"
    @click="editImage"
  />
</template>

<script lang="ts" setup>
  import type { DocumentSheetStore, RenderModeStore } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  const props = defineProps<{
    field: string;
    title?: string;
    class?: string;
  }>();

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: { getViewAwareFieldValue },
    documentActions: { getViewAwareFieldUpdater },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const currentImg = computed(() => 
    getViewAwareFieldValue<string>(props.field)
  );
  const updateField = getViewAwareFieldUpdater(props.field);

  async function editImage (event: MouseEvent) {
    if (!isEditMode.value) return;

    event.preventDefault();
    event.stopPropagation();
    const current = currentImg.value as string;
    // eslint-disable-next-line new-cap
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: 'image',
      current,
      callback: async (path: string) => {
        await updateField(path);
      },
    } as any);

    fp.render();
  }
</script>

<style lang="scss" scoped>
  .item-art {
    cursor: default;

    &.editable {
      cursor: pointer;
    }
  }
</style>
