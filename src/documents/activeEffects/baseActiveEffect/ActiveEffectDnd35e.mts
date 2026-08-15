import type { ACTORS_DND35E } from '@actors/actorTypes.mjs';
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import type { DatabaseCreateCallbackOptions, DatabaseDeleteCallbackOptions } from '@common/abstract/_types.mjs';
import type { DocumentUpdateCallbackOptions } from '@documents/document/DocumentDnd35e.mjs';
import { DocumentMixin } from '@documents/document/DocumentDnd35e.mjs';
import { DocumentLifeCycle } from '@documents/document/events/DocumentLifeCycle.mjs';
import type { NameFormulaDocument } from '@documents/document/logic/index.mjs';
import { ensureNameFormulaOnCreate, getDisplayName } from '@documents/document/logic/index.mjs';
import type { PreparationWarning } from '@documents/document/preparationWarnings.mjs';
import type { ActiveEffectSystemData, ActiveEffectSystemSourceDnd35e } from '@effects/baseActiveEffect/data/ActiveEffectSystemData.mjs';
import { EFFECT_CHANGE_TARGET } from '@effects/baseActiveEffect/data/constants.mjs';
import type { EffectType } from '@effects/effectTypes.mjs';
import { GENERAL_EFFECT_TYPE } from '@effects/effectTypes.mjs';
import type { DocumentEventEmitter } from '@helpers/documentEvents/DocumentEventEmitter.mjs';
import { LogHelper } from '@helpers/LogHelper.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ITEMS_DND35E, ItemType } from '@items/itemTypes.mjs';

import { refreshOwningDocument } from './logic/refreshOwningDocument.mjs';

type ActiveEffectFlags<T extends object = Record<string, unknown>> = Record<string, Record<string, unknown>> & {
  dnd35e: T;
};

type ActiveEffectSourceDnd35e<
  TEffectType extends EffectType = EffectType,
  TSystemSource extends ActiveEffectSystemSourceDnd35e = ActiveEffectSystemSourceDnd35e
> = foundry.documents.ActiveEffectSource<TEffectType, TSystemSource>;

// Apply mixin at runtime but cast to preserve generic parameter compatibility.
// TypeScript mixins erase generics; this cast is safe because the mixin only adds
// methods/properties and doesn't alter the constructor signature's generic behavior.
const ActiveEffectBase = DocumentMixin(foundry.documents.ActiveEffect) as unknown as typeof foundry.documents.ActiveEffect;

class ActiveEffectDnd35e<
  TParent extends ACTORS_DND35E | ITEMS_DND35E | null = ACTORS_DND35E | ITEMS_DND35E | null,
  TEffectType extends EffectType = EffectType,
  TSystemData extends ActiveEffectSystemData = ActiveEffectSystemData
>
  // NOTE: `ActiveEffectBase` is deliberately parameterized with a FIXED, non-null
  // `foundry.documents.Actor | foundry.documents.Item` here — NOT our own narrow `TParent`.
  // Core Foundry's `ActiveEffect<TParent extends Actor | Item | null>` (and Actor/Item's
  // own `this`-referential `effects`/`items`/construction-context typings) form a
  // mutually-recursive generic graph across Actor/Item/ActiveEffect. Threading our own
  // narrowed `TParent` (`ACTORS_DND35E | ITEMS_DND35E | null`) through the base class's
  // generic argument forces TypeScript to structurally re-prove every dnd35e leaf class
  // satisfies core Actor/Item as part of checking `_initializeSource`'s construction-context
  // parameter, which circles back into this very class's declaration.
  // The fixed core union (rather than dropping the argument, which defaults to core's OWN
  // `Actor | Item | null`) is required because `EmbeddedCollection<T>`'s generic constraint
  // needs embedded elements' `parent` to be non-null (an embedded document always has a
  // parent) — dropping to core's nullable default fails that check.
  // `TParent` remains available as a phantom type parameter for consumers (e.g.
  // `ActiveEffectDnd35e<Character>`) to narrow via explicit casts at call sites — see
  // `resolveChangeValue.mts`'s `effect.parent as SupportedEffectParent` for the pattern.
  // `actor.d.mts`/`item.d.mts`'s own `effects` field conventions were widened to this same
  // fixed union so the assignability chain is non-circular end-to-end.
  extends ActiveEffectBase<foundry.documents.Actor | foundry.documents.Item> {
  declare flags: ActiveEffectFlags;
  declare system: TSystemData;
  declare type: TEffectType;
  declare events: DocumentEventEmitter<this>;

  /**
   * Non-blocking diagnostics collected during this prep cycle (broken formulas, etc.).
   * Reset every `prepareBaseData()` — see `preparationWarnings.mts`.
   */
  _preparationWarnings: PreparationWarning[] = [];

  override prepareBaseData (): void {
    super.prepareBaseData();
    this._preparationWarnings = [];
  }

  // dnd35e type-fix: phantom marker keeping `TParent` "used" for TypeScript's
  // unused-type-parameter check. `TParent` has no structural effect at runtime (the
  // extends clause above is fixed to a non-null core union) — it exists purely so
  // consumers can narrow via `ActiveEffectDnd35e<Character>` at call sites. `declare`
  // with no initializer emits nothing at runtime.
  protected declare readonly _typeParentBrand?: TParent;

  static readonly LifeCycle = {
    ...DocumentLifeCycle,
  } as const;

  protected override async _preCreate(
    _data: this['_source'],
    _options: DatabaseCreateCallbackOptions,
    _user: foundry.documents.BaseUser
  ): Promise<boolean | void> {
    const superResult = await super._preCreate(_data, _options, _user);
    await ensureNameFormulaOnCreate(this as unknown as NameFormulaDocument);
    return superResult;
  }

  protected override _onCreate(
    _data: this['_source'],
    _options: DatabaseCreateCallbackOptions,
    _userId: string
  ): void {
    super._onCreate(_data, _options, _userId);
    refreshOwningDocument(this);
  }

  protected override _onUpdate(
    _data: this['_source'],
    _options: DocumentUpdateCallbackOptions,
    _userId: string
  ): void {
    super._onUpdate(_data, _options, _userId);
    refreshOwningDocument(this);
  }

  protected override _onDelete(
    _options: DatabaseDeleteCallbackOptions,
    _userId: string
  ): void {
    super._onDelete(_options, _userId);
    refreshOwningDocument(this);
  }

  static override get metadata () {
    return Object.freeze(foundry.utils.mergeObject(super.metadata, {
      baseTypeAllowed: false,
    }, { inplace: false }));
  }

  /**
   * Transfer is computed based on whether the effect has any actor-targeted changes.
   * Effects with only item-targeted changes do not transfer to the actor.
   */
  override get transfer (): boolean {
    return this.system.changes.some(change => change.target === EFFECT_CHANGE_TARGET.ACTOR);
  }

  /**
   * Whether this effect has any changes that target the item.
   */
  get hasItemChanges (): boolean {
    return this.system.changes.some(change => change.target === EFFECT_CHANGE_TARGET.ITEM);
  }

  get _displayName (): string {
    return getDisplayName<ActiveEffectSystemData>(this.name, this.system, this);
  }

  get displayName (): string {
    return this._displayName;
  }

  get localizedType (): string {
    return game.i18n.localize('dnd35e.EFFECT.General.Type');
  }
}

const ActiveEffectProxyDnd35e = new Proxy(ActiveEffectDnd35e, {
  construct (
    _target,
    args: [source: PreCreate<ActiveEffectSourceDnd35e>, context?: DocumentConstructionContext<ActorDnd35e | ItemDnd35e<ItemType> | null>]
  ) {
    const [source] = args;
    let type = source?.type;

    // Coerce missing/base type to 'general' — dnd35e does not allow the base AE type
    if (!type || !(type in CONFIG.dnd35e.activeEffect.documentClasses) && type !== GENERAL_EFFECT_TYPE) {
      LogHelper.warn(`ActiveEffect created with unsupported type '${type ?? ''}', coercing to '${GENERAL_EFFECT_TYPE}'`);
      if (source) source.type = GENERAL_EFFECT_TYPE;
      type = GENERAL_EFFECT_TYPE;
    }

    if (type === GENERAL_EFFECT_TYPE) {
      return new ActiveEffectDnd35e(...args);
    }
    const EffectClass = CONFIG.dnd35e.activeEffect.documentClasses[type] as unknown as typeof ActiveEffectDnd35e;
    if (!EffectClass) {
      LogHelper.error(`ActiveEffect type ${type} does not exist or is not properly supported for ActiveEffectProxyDnd35e`);
      return new ActiveEffectDnd35e(...args);
    }
    return new EffectClass(...args);
  },
});

export { ActiveEffectDnd35e, ActiveEffectProxyDnd35e };
export type { ActiveEffectFlags, ActiveEffectSourceDnd35e };
