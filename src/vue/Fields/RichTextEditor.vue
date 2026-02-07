<template>
  <div class="prosemirror editor-content editor flexcol">
    <label>{{ label }}</label>
    <div ref="editorRoot"></div>
  </div>
</template>

<script setup lang="ts">
  import { ItemSheetStore } from '@items/baseItem/index.mjs';
  import { onMounted, onBeforeUnmount, ref, inject, Ref } from 'vue';

  const { field, label } = defineProps<{
    field: string; // e.g. "system.description"
    label: string;
    // placeholder?: string; // TODO: Need to rethink this as no longer has a default API
  }>();

  const {
    documentGetters: {
      getProperty,
    },
    isEditable,
    isFirstRender,
  } = inject('itemSheetStore') as ItemSheetStore;

  const raw = getProperty(field).value as string;

  const editorRoot = ref<HTMLElement | null>(null);
  let editor: any = null;

  function untilInDOM (elRef: Ref<HTMLElement | null>): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (elRef.value && document.body.contains(elRef.value)) resolve();
        else requestAnimationFrame(check);
      };
      check();
    });
  }

  async function createEditor () {
    if (!editorRoot.value) return;
    if (isFirstRender) {
      await untilInDOM(editorRoot);
    }
    const { TextEditor } = foundry.applications.ux;

    editor = await TextEditor.implementation.create(
      {
        engine: 'prosemirror',
        target: editorRoot.value,
        // drop: true,
        // toolbar: true,
        props: {
          editable: () => isEditable.value,
        },
      },
      raw,
    );
  // .then((ed) => {
  //   editor = ed;
  //   editorRoot.value?.replaceChildren(editor.element);
  //   // hookAutosave(editor);
  //   editor.element.addEventListener("focusout", async () => {
  //     const html = editor.save();
  //     await updateField(html);
  //   });
  // });
  // editorRoot.value.replaceChildren(editor.element);

  // const initial = raw ?? "";
  // debugger;

  // editor = await foundry.applications.ux.ProseMirrorEditor.create(
  //   editorRoot.value,
  //   initial,
  //   {
  //     props: {
  //       editable: () => isEditable.value,
  //     },
  //   },
  // );

  // editor = await foundry.applications.ux.TextEditor.implementation.create(
  //   {
  //     engine: "prosemirror",
  //     target: editorRoot.value,
  //     props: {
  //       editable: () => isEditable.value,
  //     },
  //   },
  //   initial,
  // );

  // editorRoot.value.replaceWith(editor.element);
  // editorRoot.value = editor.element;

  // Listen for changes
  // editor.element.addEventListener("focusout", async () => {
  //   const html = editor.save();
  //   await updateField(html);
  // });
  }

  onMounted(() => {
    // Wait for the sheet to actually be in the DOM
    createEditor();
  });

  onBeforeUnmount(() => {
    editor?.destroy();
  });
</script>

<style scoped>
.rich-text-editor {
  width: 100%;
}
</style>
