import { hbsTemplatePath } from "@constants/paths.mjs";
import { registerPartial } from "@helpers/display.mjs";
import './uniqueId.scss';

const uniqueIdPartialName = '_uniqueId';

const hbsPath = (file: string) => `${hbsTemplatePath}/entities/items/components/uniqueId/${file}`;

const partials = [
  uniqueIdPartialName,
];

partials.forEach(partialName => registerPartial(hbsPath(`${partialName}.hbs`), partialName));

const createUniqueId = (): string => {
  return crypto.randomUUID();
};

export {
  createUniqueId,
  uniqueIdPartialName,
}