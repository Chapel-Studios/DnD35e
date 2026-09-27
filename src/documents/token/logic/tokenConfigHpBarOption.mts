/**
 * Injects a "use default resource bar" checkbox into the Resources tab of Foundry's Token
 * Configuration (and Prototype Token Configuration) sheets, next to the Bar 1 attribute picker.
 * Lets users opt out of dnd35e's compact HP adjustment widget (HpUpdater.vue, compact mode) in
 * favor of the vanilla bar1 input. Flag: `flags.dnd35e.useDefaultHpBar` — read via the
 * `getFlag`/`setFlag` "Document Compatibility Methods" shared by both `TokenDocument` and
 * `PrototypeToken`, so the same code path works for both sheets without branching.
 *
 * The Bar 1 attribute selector's form-group, and the read-only "Bar 1 Data" preview form-group
 * beside it, are hidden (not just disabled) while the flag is off, since our widget ignores
 * whatever attribute is selected there.
 *
 * @module
 */
import type PrototypeTokenConfig from '@client/applications/sheets/token/prototype-config.mjs';
import type TokenConfig from '@client/applications/sheets/token/token-config.mjs';

const FLAG_SCOPE = 'dnd35e';
const FLAG_KEY = 'useDefaultHpBar';
const OPTION_CLASS = 'dnd35e-hp-bar-option';

function decorateTokenConfigResourcesTab (app: TokenConfig | PrototypeTokenConfig, element: HTMLElement): void {
  element.querySelector(`.${OPTION_CLASS}`)?.remove();

  const bar1Select = element.querySelector<HTMLSelectElement>('select[name="bar1.attribute"]');
  if (!bar1Select) return;

  const bar1Group = (bar1Select.closest('.form-group') ?? bar1Select.parentElement) as HTMLElement | null;
  if (!bar1Group?.parentElement) return;

  const bar1DataGroup = element.querySelector('input[data-bar1-value]')?.closest('.form-group') as HTMLElement | null;

  const useDefaultBar = Boolean(app.token.getFlag(FLAG_SCOPE, FLAG_KEY));

  const group = document.createElement('div');
  group.className = `form-group ${OPTION_CLASS}`;
  group.innerHTML = `
    <label>${game.i18n.localize('dnd35e.TOKEN.HP_BAR.UseDefaultBar.label')}</label>
    <div class="form-fields">
      <input type="checkbox" ${useDefaultBar ? 'checked' : ''}>
    </div>
    <p class="hint">${game.i18n.localize('dnd35e.TOKEN.HP_BAR.UseDefaultBar.hint')}</p>
  `;
  bar1Group.insertAdjacentElement('beforebegin', group);

  const setBar1GroupsVisible = (visible: boolean) => {
    bar1Group.style.display = visible ? '' : 'none';
    if (bar1DataGroup) bar1DataGroup.style.display = visible ? '' : 'none';
  };

  const checkbox = group.querySelector('input[type="checkbox"]') as HTMLInputElement;
  setBar1GroupsVisible(useDefaultBar);

  checkbox.addEventListener('change', () => {
    setBar1GroupsVisible(checkbox.checked);
    void app.token.setFlag(FLAG_SCOPE, FLAG_KEY, checkbox.checked);
  });
}

function registerTokenConfigHpBarOption (): void {
  Hooks.on('renderTokenConfig', (app: TokenConfig, element: HTMLElement) => {
    decorateTokenConfigResourcesTab(app, element);
  });
  Hooks.on('renderPrototypeTokenConfig', (app: PrototypeTokenConfig, element: HTMLElement) => {
    decorateTokenConfigResourcesTab(app, element);
  });
}

export { registerTokenConfigHpBarOption };
