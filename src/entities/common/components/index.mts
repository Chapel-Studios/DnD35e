import { hbsTemplatePath } from "@constants/paths.mjs";
import { registerPartial } from "@helpers/display.mjs";
import './toggleSwitch/toggleSwitch.scss';

const hbsPath = (path:string, file: string) => `${hbsTemplatePath}/entities/common/components/${path}/${file}`;

const toggleSwitchPartial = 'toggleSwitch';
const partialsToRegister = [
  {
    path: 'toggleSwitch',
    partials: [
      toggleSwitchPartial,
    ],
  },
];
export const register = () => {
  partialsToRegister.forEach(({path, partials}) => partials.forEach(partialName => registerPartial(hbsPath(path, `${partialName}.hbs`), partialName)))
}