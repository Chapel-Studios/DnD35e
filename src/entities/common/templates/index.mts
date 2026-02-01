import { hbsTemplatePath } from "@constants/paths.mjs";
import { register as registerItem } from "./item/index.mjs";
import { registerPartial } from "@helpers/display.mjs";

const hbsPath = (file: string) => `${hbsTemplatePath}/entities/common/templates/${file}`;

const partials = [
  'wrapper',
  'emptyDiv',
];

export const register = () => {
  registerItem();
  partials.forEach(partialName => registerPartial(hbsPath(`${partialName}.hbs`), partialName))
}
