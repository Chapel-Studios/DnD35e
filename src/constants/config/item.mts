import { Material } from "@items/material/index.mjs";
import { Weapon } from "@items/weapon/index.mjs";
// import { Dnd35eConfig } from "./types.mjs";

const ItemConfig = {
  documentClasses: {
    "weapon": Weapon,
    "material": Material,
  },
};

export default ItemConfig;
