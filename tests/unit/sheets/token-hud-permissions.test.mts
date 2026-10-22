// @vitest-environment happy-dom

import type { FieldOverrides } from '@vc/fields/formGroups/fieldPermissions.mjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { CreatureStub } = vi.hoisted(() => ({
  CreatureStub: class {
    documentName = 'Actor';
    _masks: Record<string, unknown> | undefined;
    effects = [];
    system = { hp: { current: 20 }, defense: { concealment: 0 } };
    flags: FieldOverrides = {};
    updateHP = vi.fn().mockResolvedValue(true);
    update = vi.fn().mockResolvedValue(true);
    useAction = vi.fn();
    getFlag() { return this.flags; }
  },
}));
const maneuverMocks = vi.hoisted(() => ({
  getActiveCombatant: vi.fn(),
  spendAction: vi.fn(),
  applyTotalDefenseAE: vi.fn(),
}));
const movementMocks = vi.hoisted(() => ({ performStandUpOrDropProne: vi.fn() }));
vi.mock('@actors/creature/index.mjs', () => ({ Creature: CreatureStub }));
vi.mock('@vueApps/VueAppBaseMixin.mjs', () => ({
  useVueAppBaseMixin: (base: typeof foundry.applications.api.ApplicationV2) => base,
}));
vi.mock('@actors/creature/Actions/ChangeProneStatus.mjs', () => movementMocks);
vi.mock('@actors/creature/logic/combatConditionAEs.mjs', () => ({ applyTotalDefenseAE: maneuverMocks.applyTotalDefenseAE }));
vi.mock('@documents/combat/combatant/combatantActionEconomy.mjs', () => ({ spendAction: maneuverMocks.spendAction }));
vi.mock('@documents/token/hud/TokenHudApp.vue', () => ({ default: {} }));
vi.mock('@effects/secret/playerEditSecret.mjs', () => ({
  findOrCreatePlayerEditSecret: vi.fn().mockResolvedValue({}),
  addOrUpdatePlayerEditMask: vi.fn(),
}));
vi.mock('@documents/token/hud/tokenHudActions.mjs', async (importOriginal) => ({
  ...await importOriginal<typeof import('@documents/token/hud/tokenHudActions.mjs')>(),
  getActiveCombatant: maneuverMocks.getActiveCombatant,
  getCombatManeuverChoices: () => [],
  getWeaponActionChoices: vi.fn().mockResolvedValue([
    { itemId: 'weapon', actionId: 'attack', label: 'Attack', img: '', enabled: false },
  ]),
}));

const raw = {
  id: 'hud',
  _id: 'token',
  elevation: 0,
  levels: {},
  statusEffects: {},
  movementActions: { run: { id: 'run', label: 'Run', cssClass: '' } },
  displayBar1: true,
  bar1Data: { value: 99, editable: true },
  displayBar2: true,
  bar2Data: { value: 12, editable: false },
};
vi.stubGlobal('foundry', {
  ...foundry,
  applications: {
    ...foundry.applications,
    hud: {
      TokenHUD: class {
        static DEFAULT_OPTIONS = {};
        async _prepareContext() { return raw; }
        togglePalette = vi.fn();
      },
    },
  },
});

const { TokenHudDnd35e } = await import('@documents/token/hud/TokenHudDnd35e.mjs');
const { findOrCreatePlayerEditSecret, addOrUpdatePlayerEditMask } = await import('@effects/secret/playerEditSecret.mjs');

const mountHud = () => {
  const actor = new CreatureStub();
  const flags: FieldOverrides = {};
  const updateHP = vi.spyOn(actor, 'updateHP').mockResolvedValue(true);
  vi.spyOn(actor, 'getFlag').mockImplementation(() => flags);
  const token = { isOwner: true, getFlag: () => false, object: { id: 'hud-token' }, update: vi.fn() };
  class TestHud extends TokenHudDnd35e {
    prepare() {
      return this._prepareContext({
        parts: [],
        force: false,
        position: { top: 0, left: 0, width: 0, height: 0, scale: 1, zIndex: 0 },
        window: { title: '', icon: false, controls: false },
        isFirstRender: false,
      });
    }
  }
  const hud = new TestHud();
  Object.defineProperties(hud, {
    actor: { get: () => actor },
    document: { get: () => token },
  });
  const apply = async (type = 'damage', amount = '4') => {
    const target = document.createElement('button');
    target.dataset.adjustmentType = type;
    target.dataset.amount = amount;
    const action = TokenHudDnd35e.DEFAULT_OPTIONS.actions.adjustHp;
    if (typeof action !== 'function') throw new Error('Missing adjustHp action handler.');
    await action.call(hud, new PointerEvent('click'), target);
  };
  const concealment = async (value = '20') => {
    const target = document.createElement('button');
    target.dataset.concealmentValue = value;
    const action = TokenHudDnd35e.DEFAULT_OPTIONS.actions.concealment;
    if (typeof action !== 'function') throw new Error('Missing concealment action handler.');
    await action.call(hud, new PointerEvent('click'), target);
  };
  const attack = async (enabled = true) => {
    const target = document.createElement('button');
    Object.assign(target.dataset, { itemId: 'weapon', actionId: 'attack', enabled: String(enabled) });
    const action = TokenHudDnd35e.DEFAULT_OPTIONS.actions.attackAction;
    if (typeof action !== 'function') throw new Error('Missing attackAction action handler.');
    await action.call(hud, new PointerEvent('click'), target);
  };
  const maneuver = async (enabled = true) => {
    const target = document.createElement('button');
    Object.assign(target.dataset, { maneuverId: 'totalDefense', enabled: String(enabled) });
    const action = TokenHudDnd35e.DEFAULT_OPTIONS.actions.combatManeuver;
    if (typeof action !== 'function') throw new Error('Missing combatManeuver action handler.');
    await action.call(hud, new PointerEvent('click'), target);
  };
  const movement = async (value: string) => {
    const target = document.createElement('button');
    target.dataset.movementAction = value;
    const action = TokenHudDnd35e.DEFAULT_OPTIONS.actions.movementAction;
    if (typeof action !== 'function') throw new Error('Missing movementAction action handler.');
    await action.call(hud, new PointerEvent('click'), target);
  };
  return { hud, actor, flags, token, updateHP, apply, concealment, attack, maneuver, movement };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  maneuverMocks.getActiveCombatant.mockReset();
  maneuverMocks.spendAction.mockReset();
  (game.user as { isGM: boolean }).isGM = false;
});

describe('Token HUD movement ownership', () => {
  it('hides movement actions from non-owners and rejects stale movement and prone clicks', async () => {
    const { hud, token, movement } = mountHud();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await hud.prepare()).rightHudContext.canSelectMovementAction).toBe(true);
    token.isOwner = false;
    const context = (await hud.prepare()).rightHudContext;
    expect(context.canSelectMovementAction).toBe(false);
    expect(context.movementActions).toEqual([]);
    await movement('run');
    await movement('dropProne');
    expect(token.update).not.toHaveBeenCalled();
    expect(movementMocks.performStandUpOrDropProne).not.toHaveBeenCalled();
  });

  it.each([false, true])('preserves the movement choices and updates for authorized GM=%s', async (isGM) => {
    const { hud, token, movement } = mountHud();
    (game.user as { isGM: boolean }).isGM = isGM;
    token.isOwner = !isGM;
    expect((await hud.prepare()).rightHudContext.movementActions).toEqual(Object.values(raw.movementActions));
    await movement('run');
    expect(token.update).toHaveBeenCalledWith({ movementAction: 'run' });
    await movement('');
    expect(token.update).toHaveBeenCalledWith({ movementAction: null });
  });

  it.each(['dropProne', 'standUp'])('delegates %s to the unchanged action-cost implementation', async (value) => {
    const { actor, token, movement } = mountHud();
    movementMocks.performStandUpOrDropProne.mockResolvedValue(true);
    await movement(value);
    expect(movementMocks.performStandUpOrDropProne).toHaveBeenCalledWith(actor, token, value);
    expect(token.update).not.toHaveBeenCalled();
  });
});

describe('Token HUD combat maneuver ownership', () => {
  it('omits maneuvers for non-owners and rejects stale clicks before spending actions', async () => {
    const { hud, token, maneuver } = mountHud();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await hud.prepare()).bottomHudContext.canShowCombatManeuvers).toBe(true);
    token.isOwner = false;
    const context = (await hud.prepare()).bottomHudContext;
    expect(context.canShowCombatManeuvers).toBe(false);
    expect(context.combatManeuvers).toEqual([]);
    await maneuver();
    expect(maneuverMocks.getActiveCombatant).not.toHaveBeenCalled();
    expect(maneuverMocks.spendAction).not.toHaveBeenCalled();
    expect(maneuverMocks.applyTotalDefenseAE).not.toHaveBeenCalled();
  });

  it.each([false, true])('preserves action spending and Total Defense for authorized GM=%s', async (isGM) => {
    const { actor, token, maneuver } = mountHud();
    (game.user as { isGM: boolean }).isGM = isGM;
    token.isOwner = !isGM;
    const combatant = { id: 'combatant' };
    maneuverMocks.getActiveCombatant.mockReturnValue(combatant);
    maneuverMocks.spendAction.mockResolvedValue(['standard']);
    await maneuver();
    expect(maneuverMocks.getActiveCombatant).toHaveBeenCalledWith(token.object);
    expect(maneuverMocks.spendAction).toHaveBeenCalledWith(combatant, ['standard']);
    expect(maneuverMocks.applyTotalDefenseAE).toHaveBeenCalledWith(actor);
  });

  it('does not apply Total Defense when the existing action budget denies spending', async () => {
    const { maneuver } = mountHud();
    maneuverMocks.getActiveCombatant.mockReturnValue({ id: 'combatant' });
    maneuverMocks.spendAction.mockResolvedValue(null);
    await maneuver();
    expect(maneuverMocks.applyTotalDefenseAE).not.toHaveBeenCalled();
  });

  it('preserves the disabled-entry guard', async () => {
    const { maneuver } = mountHud();
    await maneuver(false);
    expect(maneuverMocks.getActiveCombatant).not.toHaveBeenCalled();
    expect(maneuverMocks.spendAction).not.toHaveBeenCalled();
  });
});

describe('Token HUD weapon ownership', () => {
  it('omits attacks for non-owners and rejects clicks after ownership is revoked', async () => {
    const { hud, actor, token, attack } = mountHud();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await hud.prepare()).bottomHudContext.canShowWeaponAttacks).toBe(true);
    token.isOwner = false;
    const context = (await hud.prepare()).bottomHudContext;
    expect(context.canShowWeaponAttacks).toBe(false);
    expect(context.weaponActions).toEqual([]);
    await attack();
    expect(actor.useAction).not.toHaveBeenCalled();
  });

  it('preserves availability flags and delegates allowed owner attacks with the exact HUD token', async () => {
    const { hud, actor, token, attack } = mountHud();
    expect((await hud.prepare()).bottomHudContext.weaponActions[0].enabled).toBe(false);
    await attack(false);
    expect(actor.useAction).not.toHaveBeenCalled();
    await attack();
    expect(actor.useAction).toHaveBeenCalledWith('weapon', 'attack', [], { actorToken: token.object });
  });

  it('permits GM access independently of token ownership', async () => {
    const { hud, actor, token, attack } = mountHud();
    token.isOwner = false;
    (game.user as { isGM: boolean }).isGM = true;
    expect((await hud.prepare()).bottomHudContext.canShowWeaponAttacks).toBe(true);
    await attack();
    expect(actor.useAction).toHaveBeenCalledOnce();
  });
});

describe('Token HUD concealment permissions and display', () => {
  it('keeps locked concealment visible but removes editing choices', async () => {
    const { hud, flags, actor, concealment } = mountHud();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    actor.system.defense.concealment = 20;
    flags.system__defense__concealment = { editability: 'gmOnly' };
    const context = (await hud.prepare()).leftHudContext;
    expect(context.canSeeConcealment).toBe(true);
    expect(context.canEditConcealment).toBe(false);
    expect(context.concealmentIconClass).toBe('fa-solid fa-cloud-sun');
    expect(context.concealmentOptions).toEqual([]);
    await concealment();
    expect(actor.update).not.toHaveBeenCalled();
  });

  it('hides concealment for non-owners and when an ancestor restricts visibility', async () => {
    const { hud, flags, token, actor, concealment } = mountHud();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    token.isOwner = false;
    expect((await hud.prepare()).leftHudContext.canSeeConcealment).toBe(false);
    await concealment();
    expect(actor.update).not.toHaveBeenCalled();
    token.isOwner = true;
    flags.system__defense = { visibility: 'gmOnly' };
    flags.system__defense__concealment = { visibility: 'everyone' };
    const context = (await hud.prepare()).leftHudContext;
    expect(context.canSeeConcealment).toBe(false);
    expect(context.canEditConcealment).toBe(false);
    expect(context.concealmentOptions).toEqual([]);
  });

  it('shows masked values to players and routes their masked edits through player secrets', async () => {
    const { hud, actor, concealment } = mountHud();
    actor.system.defense.concealment = 50;
    actor._masks = { 'system.defense.concealment': 20 };
    vi.spyOn(game.i18n, 'format');
    const context = (await hud.prepare()).leftHudContext;
    expect(context.concealmentIconClass).toBe('fa-solid fa-cloud-sun');
    expect(context.concealmentOptions.find(option => option.cssClass === 'active')?.value).toBe(20);
    expect(game.i18n.format).toHaveBeenCalledWith('dnd35e.COMBAT.HUD.ConcealmentTooltip', {
      category: 'dnd35e.COMBAT.HUD.ConcealmentCategoryConcealed', percent: 20,
    });
    await concealment('0');
    expect(findOrCreatePlayerEditSecret).toHaveBeenCalledWith(actor);
    expect(addOrUpdatePlayerEditMask).toHaveBeenCalledWith({}, 'system.defense.concealment', 0);
    expect(actor.update).not.toHaveBeenCalled();
  });

  it('does not reveal true concealment when a mask cannot resolve to a number', async () => {
    const { hud, actor } = mountHud();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    actor.system.defense.concealment = 50;
    actor._masks = { 'system.defense.concealment': undefined };
    expect((await hud.prepare()).leftHudContext.canSeeConcealment).toBe(false);
  });

  it('rechecks live restrictions after rendering and updates unlocked owner concealment', async () => {
    const { hud, flags, actor, concealment } = mountHud();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await hud.prepare()).leftHudContext.canEditConcealment).toBe(true);
    flags.system__defense = { editability: 'gmOnly' };
    await concealment();
    expect(actor.update).not.toHaveBeenCalled();
    delete flags.system__defense;
    await concealment();
    expect(actor.update).toHaveBeenCalledWith({ system: { defense: { concealment: 20 } } });
  });

  it('gives GMs true-value access and editing despite field restrictions', async () => {
    const { hud, actor, flags, token, concealment } = mountHud();
    (game.user as { isGM: boolean }).isGM = true;
    token.isOwner = false;
    actor.system.defense.concealment = 50;
    actor._masks = { 'system.defense.concealment': 20 };
    flags.system__defense = { visibility: 'gmOnly', editability: 'gmOnly' };
    const context = (await hud.prepare()).leftHudContext;
    expect(context.canSeeConcealment).toBe(true);
    expect(context.canEditConcealment).toBe(true);
    expect(context.concealmentIconClass).toBe('fa-solid fa-cloud');
    await concealment();
    expect(actor.update).toHaveBeenCalledWith({ system: { defense: { concealment: 20 } } });
    expect(addOrUpdatePlayerEditMask).not.toHaveBeenCalled();
  });

  it.each(['Infinity', 'NaN', '', '30'])('rejects invalid concealment preset %s', async (value) => {
    const { actor, concealment } = mountHud();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await concealment(value);
    expect(actor.update).not.toHaveBeenCalled();
  });
});

describe('Token HUD HP context and live action handler', () => {
  it('hides compact HP for non-owners and keeps native bars unchanged', async () => {
    const { hud, token } = mountHud();
    token.isOwner = false;
    let context = await hud.prepare();
    expect(context.middleHudContext.displayBar1).toBe(false);
    expect(context.middleHudContext.bar1Editable).toBe(false);
    expect(context.middleHudContext.displayBar2).toBe(true);
    expect(context.middleHudContext.bar2Value).toBe(12);
    expect(context.middleHudContext.bar2Editable).toBe(false);
    token.getFlag = () => true;
    context = await hud.prepare();
    expect(context.middleHudContext.displayBar1).toBe(true);
    expect(context.middleHudContext.bar1Value).toBe(99);
    expect(context.middleHudContext.bar1Editable).toBe(true);
  });

  it('rechecks ownership and flags at execution rather than trusting the rendered context', async () => {
    const { hud, flags, token, updateHP, apply } = mountHud();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await hud.prepare()).middleHudContext.bar1Editable).toBe(true);
    flags.system__hp__current = { editability: 'gmOnly' };
    await apply();
    expect(updateHP).not.toHaveBeenCalled();
    delete flags.system__hp__current;
    token.isOwner = false;
    await apply();
    expect(updateHP).not.toHaveBeenCalled();
  });

  it('allows damage and healing despite secondary field locks but denies direct temp/nonlethal changes', async () => {
    const { flags, updateHP, apply } = mountHud();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    flags.system__hp__temp = { editability: 'gmOnly' };
    flags.system__hp__nonlethal = { visibility: 'gmOnly' };
    await apply('damage');
    await apply('healing');
    await apply('temporary');
    await apply('nonlethal');
    expect(updateHP.mock.calls).toEqual([[4, 'damage'], [4, 'healing']]);
  });

  it('allows GMs to use hidden and locked operations', async () => {
    const { hud, flags, token, updateHP, apply } = mountHud();
    (game.user as { isGM: boolean }).isGM = true;
    token.isOwner = false;
    flags.system__hp = { visibility: 'gmOnly', editability: 'gmOnly' };
    expect((await hud.prepare()).middleHudContext.displayBar1).toBe(true);
    await apply('temporary');
    expect(updateHP).toHaveBeenCalledWith(4, 'temporary');
  });

  it.each([['invalid', '4'], ['damage', 'Infinity'], ['damage', 'NaN']])('rejects invalid type/amount %s %s', async (type, amount) => {
    const { updateHP, apply } = mountHud();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await apply(type, amount);
    expect(updateHP).not.toHaveBeenCalled();
  });
});
