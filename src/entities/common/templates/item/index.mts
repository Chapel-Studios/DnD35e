import { type HandlebarsTemplatePart } from "@client/applications/api/handlebars-application.mjs";
import { hbsTemplatePath } from "@constants/paths.mjs";
import { registerPartial } from "@helpers/display.mjs";

const hbsPath = (path: string, file: string) => `${hbsTemplatePath}/entities/common/templates/item/${path}/${file}`;

export const defaultNameHeaderPartial = "defaultNameHeader";
export const artHeaderPartial = 'artHeader';
export const _itemNamePartial = '_itemName';
// export const nameAndArtPartialPath = localPath('nameAndArt', `nameAndArt.hbs`);

// Art Header
export const artHeaderPart: HandlebarsTemplatePart = {
  template: artHeaderPartial,
};

export const nameConfigPart: HandlebarsTemplatePart = {
  template: 'nameConfig',
};

// Description
export const descriptionPart: HandlebarsTemplatePart = {
  template: 'description',
};

const partialsToRegister = [
  {
    path: 'artHeader',
    partials: [
      // is registered in the sheet... but maybe we still use this instead later?
      artHeaderPartial,
      defaultNameHeaderPartial,
      nameConfigPart.template,
      _itemNamePartial,
    ],
  },
  {
    path: 'description',
    partials: [
      descriptionPart.template,
    ],
  }
];
export const register = () => {
  partialsToRegister.forEach(({path, partials}) => partials.forEach(partialName => registerPartial(hbsPath(path, `${partialName}.hbs`), partialName)))
}
// export const register = async () => await Promise.all(partials.flatMap(({path, partials}) =>
//   partials.map(partialName => registerPartial(localPath(path, `${partialName}.hbs`), partialName))));
