<template>
  <img
    class="item-art"
    :class="[props.class, { editable: isEditable }]"
    :src="currentImg"
    :title="props.title"
    @click="editImage"
  />
</template>

<script lang="ts" setup>
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  const props = defineProps<{
    field: string;
    title?: string;
    class?: string;
  }>();

  const {
    documentGetters: { getProperty, getEffectiveFieldValue },
    documentActions: { getViewAwareFieldUpdater },
    isEditable,
  } = inject('documentSheetStore') as DocumentSheetStore;

  const rawImg = getProperty<string>(props.field);
  const currentImg = computed(() => 
    getEffectiveFieldValue(props.field, rawImg.value)
  );
  const updateField = getViewAwareFieldUpdater(props.field);

  async function editImage (event: MouseEvent) {
    if (!isEditable.value) return;

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
