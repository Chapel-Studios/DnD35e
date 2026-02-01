<template>
  <img 
    class="item-art"
    :class="props.class"
    :src="currentImg"
    :title="props.title"
    @click="editImage"
  />
</template>

<script lang="ts" setup>
  import { ItemSheetStore } from '@items/baseItem/sheet/ItemSheetStore.mjs';
  import { inject } from 'vue';
  
  const props = defineProps<{
    field: string;       // e.g. "system.description"
    title?: string;
    class?: string;
  }>();

  const {
    documentGetters: {
      getProperty,
    },
    documentActions: {
      getFieldUpdater,
    },
    isEditable,
  } = inject('itemSheetStore') as ItemSheetStore;
  const updateField = getFieldUpdater(props.field);
  const currentImg = getProperty<string>(props.field);

  async function editImage(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const current = currentImg.value as string;
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current,
      callback: async (path: string) => {
        await updateField(path);
      },
    });

    fp.render();
  }
</script>

<style lang="scss" scoped>
</style>