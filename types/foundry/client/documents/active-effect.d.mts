import type { DocumentConstructionContext } from '../../common/_types.mjs';
import {
  DatabaseCreateCallbackOptions,
  DatabaseDeleteCallbackOptions,
  DatabaseUpdateCallbackOptions,
  DataSchema,
} from '@common/abstract/_types.mjs';
import Document from '@common/abstract/document.mjs';
import { DataField } from '@common/data/fields.mjs';
import BaseActiveEffect, {
  ActiveEffectSource,
  EffectChangeData,
  EffectDurationData,
} from '@common/documents/active-effect.mjs';
import { Actor, BaseActor, BaseItem, BaseUser, Item } from './_module.mjs';
import { ClientDocument } from './abstract/client-document.mjs';

/**
 * A function to render a stringified HTMLLIElement in the changes tab of ActiveEffectConfig
 */
type ActiveEffectChangeRenderer = (context: {
  change: EffectChangeData;
  index: number;
  fields: DataSchema;
  defaultPriority: number;
}) => Promise<string>;

/**
 * A function that applies the change to a document
 */
type ActiveEffectChangeHandler = (
  actor: Actor,
  change: EffectChangeData,
  options?: {
    field?: DataField;
    replacementData?: Record<string, unknown>;
  }
) => Promise<Record<string, unknown> | void>;

interface ActiveEffectChangeTypeConfig {
  label: string;
  defaultPriority: number;
  handler?: ActiveEffectChangeHandler | null;
  render?: ActiveEffectChangeRenderer | null;
}

declare const ClientBaseActiveEffect: new <TParent extends BaseActor | BaseItem | null>(
    ...args: any
) => BaseActiveEffect<TParent> & ClientDocument<TParent>;

/**
 * The ActiveEffect embedded document within an Actor or Item document which extends the BaseRollTable abstraction.
 * Each ActiveEffect belongs to the effects collection of its parent Document.
 * Each ActiveEffect contains a ActiveEffectData object which provides its source data.
 */
export default class ActiveEffect<
    TParent extends Actor | Item | null = Actor | Item | null,
> extends ClientBaseActiveEffect<TParent> {
  /**
     * Create an ActiveEffect instance from some status effect ID.
     * Delegates to {@link ActiveEffect._fromStatusEffect} to create the ActiveEffect instance
     * after creating the ActiveEffect data from the status effect data if `CONFIG.statusEffects`.
     * @param statusId The status effect ID.
     * @param options  Additional options to pass to the ActiveEffect constructor.
     * @returns The created ActiveEffect instance.
     *
     * @throws {Error} An error if there is no status effect in `CONFIG.statusEffects` with the given status ID and if
     * the status has implicit statuses but doesn't have a static _id.
     */
  static fromStatusEffect(
        statusId: string,
        options?: DocumentConstructionContext<foundry.abstract.Document | null>,
    ): Promise<ActiveEffect<Actor | Item> | undefined>;

  static _shimChanges<TParent extends BaseActor | BaseItem<BaseActor | null> | null = null>(changes: EffectChangeData<TParent>[]): void;

  /**
   * A cached compilation of core and registered change types, along with their labels and default priorities
   */
  static get CHANGE_TYPES(): Record<string, ActiveEffectChangeTypeConfig>;

  /**
   * A cached compilation of core and registered application phases, along with their labels
   */
  static get CHANGE_PHASES(): Record<string, {label: string; hint: string}>;

  /**
   * A cached compilation of core and registered expiry events
   */
  static get EXPIRY_EVENTS(): Record<string, string>;

  /**
   * A helper class that accepts registration of ActiveEffects and manages their prepared duration and expiry data.
   */
  static registry: any; // ActiveEffectRegistry type

  /**
     * Create an ActiveEffect instance from status effect data.
     * Called by {@link ActiveEffect.fromStatusEffect}.
     * @param statusId   The status effect ID.
     * @param effectData The status effect data.
     * @param options    Additional options to pass to the ActiveEffect constructor.
     * @returns The created ActiveEffect instance.
     */
  protected static _fromStatusEffect(
        statusId: string,
        effectData: Partial<ActiveEffectSource>,
        options?: DocumentConstructionContext<foundry.abstract.Document | null>,
    ): Promise<ActiveEffect<Actor | Item> | undefined>;

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The Actor in which this ActiveEffect is embedded, either directly or as a grandchild Document
   */
  get actor(): Actor | null;

  /**
   * The Item in which this ActiveEffect is embedded
   */
  get item(): Item | null;

  /**
   * Provide a thumbnail image path used to represent this document.
   */
  get thumbnail(): string;

  /**
   * Is there some system logic (or, absent that, an expired status) that makes this Active Effect ineligible for
   * application?
     */
  get isSuppressed(): boolean;

  /**
     * Retrieve the Document that this ActiveEffect targets for modification.
     */
  get target(): foundry.abstract.Document | null;

  /**
     * Whether the Active Effect currently applying its changes to the target.
     */
  get active(): boolean;

  /**
     * Does this Active Effect currently modify an Actor?
     */
  get modifiesActor(): boolean;

  override prepareBaseData(): void;

  override prepareDerivedData(): void;

  /**
     * Update derived Active Effect duration data.
     * Configure the remaining and label properties to be getters which lazily recompute only when necessary.
     */
  updateDuration(): EffectDurationData;

  /**
     * Determine whether the ActiveEffect requires a duration update.
     * True if the worldTime has changed for an effect whose duration is tracked in seconds.
     * True if the combat turn has changed for an effect tracked in turns where the effect target is a combatant.
     */
  protected _requiresDurationUpdate(): boolean;

  /**
   * Compute derived data related to active effect duration.
   * @param duration - The duration data to prepare
   */
  _prepareDuration(duration?: EffectDurationData): PreparedEffectDurationData;

  /**
   * Prepare duration data from time-based (minutes, seconds, etc.) source data.
   * @param duration - The duration data to prepare
   */
  protected _prepareTimeBasedDuration(duration: EffectDurationData): PreparedEffectDurationData;

  /**
   * Prepare duration data from combat-based (rounds or turns) source data.
   * @param duration - The duration data to prepare
   */
  protected _prepareCombatBasedDuration(duration: EffectDurationData): PreparedEffectDurationData;

  /**
     * Format a round+turn combination as a decimal
     * @param round    The round number
     * @param turn     The turn number
     * @param [nTurns] The maximum number of turns in the encounter
     * @returns The decimal representation
     */
  protected _getCombatTime(round: number, turn: number, nTurns?: number): number;

  /**
     * Format a number of rounds and turns into a human-readable duration label
     * @param rounds The number of rounds
     * @param turns   The number of turns
     * @returns The formatted label
     */
  protected _getDurationLabel(rounds: number, turns: number): string;

  /**
   * Describe whether the ActiveEffect has a temporary duration based on combat turns or rounds.
   */
  get isTemporary(): boolean;

  /**
   * Whether this Active Effect is eligible to be registered with the ActiveEffectRegistry
   */
  get isExpiryTrackable(): boolean;

  /**
   * Whether this Active Effect is currently expired
   */
  get isExpired(): boolean;

  /**
   * A cached property for obtaining the source name
     */
  get sourceName(): string;

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
     * Apply EffectChangeData to a field within a DataModel.
     * @param model  The model instance.
     * @param change The change to apply.
     * @param field  The field. If not supplied, it will be retrieved from the supplied model.
     * @returns The updated value.
     */
  static applyField(model: Document, change: EffectChangeData, field?: DataField): unknown;

  /**
     * Apply this ActiveEffect to a provided Actor.
     * TODO: This method is poorly conceived. Its functionality is static, applying a provided change to an Actor
     * TODO: When we revisit this in Active Effects V2 this should become an Actor method, or a static method
     * @param actor  The Actor to whom this effect should be applied
     * @param change The change data being applied
     * @returns An object of property paths and their updated values.
     */
  apply(actor: Actor, change: EffectChangeData): Record<string, unknown>;

  /**
     * Apply this ActiveEffect to a provided Actor using a heuristic to infer the value types based on the current value
     * and/or the default value in the template.json.
     * @param actor    The Actor to whom this effect should be applied.
     * @param change   The change data being applied.
     * @param changes  The aggregate update paths and their updated values.
     */
  protected _applyLegacy(actor: Actor, change: EffectChangeData, changes: Record<string, unknown>): void;

  /**
   * Retrieve the initial duration configuration.
   * @returns Initial duration data with start time, round, and turn
   */
  static getInitialDuration(): { startTime: number; startRound?: number; startTurn?: number; combat?: string; combatant?: string };

  /* -------------------------------------------- */
  /*  Flag Operations                             */
  /* -------------------------------------------- */

  override getFlag(scope: string, key: string): unknown;

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  protected override _preCreate(
        data: this['_source'],
        options: DatabaseCreateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

  protected override _onCreate(data: this['_source'], options: DatabaseCreateCallbackOptions, userId: string): void;

  protected override _preUpdate(
        changed: Record<string, unknown>,
        options: DatabaseUpdateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;

  protected override _onUpdate(
        changed: Record<string, unknown>,
        options: DatabaseUpdateCallbackOptions,
        userId: string,
    ): void;

  protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void;

  /**
   * Display changes to active effects as scrolling Token status text.
   * @param enabled Is the active effect currently enabled?
   */
  protected _displayScrollingStatus(enabled: boolean): void;
}

export default interface ActiveEffect<TParent extends Actor | Item | null = Actor | Item | null> {
    duration: PreparedEffectDurationData;
}

/**
 * Extended duration data with computed properties for display
 */
export interface PreparedEffectDurationData extends EffectDurationData {
    /** The computed remaining duration */
    remaining?: number | string;
    /** Human-readable label for the duration */
    label?: string;
    /** Total seconds for the duration */
    seconds?: number;
    /** Cached world time for duration calculations */
    _worldTime?: number;
    /** Cached combat time for duration calculations */
    _combatTime?: number;
}

export {};
