import { EFFECT_CHANGE_TARGET, INITIAL_EFFECT_CHANGE_PHASE, SYSTEM_CHANGE_TYPE } from '@effects/baseActiveEffect/data/constants.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@actors/baseActor/ActorDnd35e.mjs', () => ({}));
vi.mock('@effects/secret/data/SecretSystemModel.mjs', () => ({
  PLAYER_EDIT_MASK_PRIORITY: 3001,
}));

const PLAYER_EDIT_MASK_PRIORITY = 3001;

const {
  addOrUpdatePlayerEditMask,
  findOrCreatePlayerEditSecret,
} = await import('@effects/secret/playerEditSecret.mjs');

describe('playerEditSecret helpers', () => {
  it('findOrCreatePlayerEditSecret reuses existing player-edit secret', async () => {
    const existing = {
      type: secretEffectType,
      system: { isPlayerEditSecret: true },
    };

    const host = {
      effects: [existing],
      uuid: 'Item.test',
      createEmbeddedDocuments: vi.fn(),
    } as any;

    const result = await findOrCreatePlayerEditSecret(host);

    expect(result).toBe(existing);
    expect(host.createEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it('findOrCreatePlayerEditSecret creates a new player-edit secret when missing', async () => {
    const createdSecret = { id: 'ae-1', system: { isPlayerEditSecret: true } };
    const host = {
      effects: [],
      uuid: 'Actor.test',
      createEmbeddedDocuments: vi.fn(async () => [createdSecret]),
    } as any;

    const result = await findOrCreatePlayerEditSecret(host);

    expect(result).toBe(createdSecret);
    expect(host.createEmbeddedDocuments).toHaveBeenCalledTimes(1);
    expect(host.createEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
      expect.objectContaining({
        type: secretEffectType,
        origin: 'Actor.test',
        disabled: false,
        system: expect.objectContaining({
          isPlayerEditSecret: true,
        }),
      }),
    ]);
  });

  it('addOrUpdatePlayerEditMask appends actor-targeted MASK change for actor parent', async () => {
    const secret = {
      parent: { documentName: 'Actor' },
      system: { changes: [] },
      update: vi.fn(async () => {}),
    } as any;

    await addOrUpdatePlayerEditMask(secret, 'system.hp.current', 12);

    expect(secret.update).toHaveBeenCalledTimes(1);
    expect(secret.update).toHaveBeenCalledWith({
      'system.changes': [
        expect.objectContaining({
          key: 'system.hp.current',
          type: SYSTEM_CHANGE_TYPE.MASK,
          value: 12,
          priority: PLAYER_EDIT_MASK_PRIORITY,
          phase: INITIAL_EFFECT_CHANGE_PHASE,
          target: EFFECT_CHANGE_TARGET.ACTOR,
          isSystem: false,
        }),
      ],
    });
  });

  it('addOrUpdatePlayerEditMask appends item-targeted MASK change for non-actor parent', async () => {
    const secret = {
      parent: { documentName: 'Item' },
      system: { changes: [] },
      update: vi.fn(async () => {}),
    } as any;

    await addOrUpdatePlayerEditMask(secret, 'system.hp.current', 8);

    const updatePayload = secret.update.mock.calls[0][0];
    expect(updatePayload['system.changes'][0].target).toBe(EFFECT_CHANGE_TARGET.ITEM);
  });
});