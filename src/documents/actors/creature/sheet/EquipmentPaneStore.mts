import { ref } from 'vue';

type EquipmentPaneStore = {
  isOpen: ReturnType<typeof ref<boolean>>;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const useEquipmentPaneStore = (): EquipmentPaneStore => {
  const isOpen = ref(false);

  return {
    isOpen,
    open: () => {
      isOpen.value = true;
    },
    close: () => {
      isOpen.value = false;
    },
    toggle: () => {
      isOpen.value = !isOpen.value;
    },
  };
};

const EquipmentPaneStoreSymbol = Symbol('EquipmentPaneStore');

export {
  EquipmentPaneStoreSymbol,
  useEquipmentPaneStore,
};

export type {
  EquipmentPaneStore,
};
