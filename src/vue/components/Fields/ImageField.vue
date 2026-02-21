<template>
  <img
    class="item-art"
    :class="[props.class, { editable: canEdit }]"
    :src="currentImg"
    :title="props.title"
    @click="editImage"
  />
</template>

<script lang="ts" setup>
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { inject } from 'vue';

  const props = defineProps<{
    field: string;
    title?: string;
    class?: string;
  }>();

  const {
    documentGetters: { getProperty },
    documentActions: { getFieldUpdater },
    canEdit,
  } = inject('documentSheetStore') as DocumentSheetStore;

  const updateField = getFieldUpdater(props.field);
  const currentImg = getProperty<string>(props.field);

  async function editImage (event: MouseEvent) {
    if (!canEdit.value) return;

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
