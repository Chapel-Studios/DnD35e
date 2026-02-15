import { DatabaseCreateCallbackOptions } from '@common/abstract/_types.mjs';
import {
  ActiveEffectChangeMode,
  DocumentOwnershipLevel,
  DocumentOwnershipString,
  ImageFilePath,
  UserAction,
} from '@common/constants.mjs';
import { Document, DocumentMetadata } from '../abstract/_module.mjs';
import * as fields from '../data/fields.mjs';
import { ActorUUID, BaseActor, BaseItem, BaseUser, ItemUUID } from './_module.mjs';
import { object } from '@client/applications/handlebars.mjs';

/**
 * The ActiveEffect document model.
 * @param data    Initial data from which to construct the document.
 * @param context Construction context options
 */
export default class BaseActiveEffect<TParent extends BaseActor | BaseItem<BaseActor | null> | null>
  extends Document<TParent, ActiveEffectSchema> {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  static override get metadata(): ActiveEffectMetadata;

  static override defineSchema(): ActiveEffectSchema;

  /* -------------------------------------------- */
  /*  Model Methods                               */
  /* -------------------------------------------- */

  override canUserModify(user: BaseUser, action: UserAction, data?: object): boolean;

  override testUserPermission(
        user: BaseUser,
        permission: DocumentOwnershipString | DocumentOwnershipLevel,
        { exact }?: { exact?: boolean },
    ): boolean;

  /* -------------------------------------------- */
  /*  Database Event Handlers                     */
  /* -------------------------------------------- */

  protected override _preCreate(
        data: this['_source'],
        options: DatabaseCreateCallbackOptions,
        user: BaseUser,
    ): Promise<boolean | void>;
}

export default interface BaseActiveEffect<TParent extends BaseActor | BaseItem<BaseActor | null> | null>
    extends Document<TParent, ActiveEffectSchema>,
        fields.ModelPropsFromSchema<ActiveEffectSchema> {
    get documentName(): ActiveEffectMetadata['name'];
}

export interface ActiveEffectMetadata extends DocumentMetadata {
    name: 'ActiveEffect';
    collection: 'effects';
    label: 'DOCUMENT.ActiveEffect';
    isEmbedded: true;
}

type ActiveEffectSystemSchema = {
  changes: fields.ArrayField<fields.SchemaField<EffectChangeSchema>>;
};

export type ActiveEffectSystemSource = fields.SourceFromSchema<ActiveEffectSystemSchema>;

type ActiveEffectSchema<
  TType extends string = string,
  TSystemSource extends ActiveEffectSystemSource = ActiveEffectSystemSource
> = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    system: fields.TypeDataField<TSystemSource>;
    type: fields.StringField<TType, TType, true, false, false>;
    disabled: fields.BooleanField;
    duration: fields.SchemaField<EffectDurationSchema>;
    description: fields.HTMLField;
    img: fields.FilePathField<ImageFilePath>;
    origin: fields.StringField<ActorUUID | ItemUUID, ActorUUID | ItemUUID, false, true, true>;
    tint: fields.ColorField;
    transfer: fields.BooleanField;
    statuses: fields.SetField<fields.StringField<string, string, true, false, false>>;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

type EffectPhases = 'initial' | 'final';

type EffectChangeSchema = {
    key: fields.StringField<string, string, true, false, false>;
    value: fields.StringField<string, string, true, false, false>;
    mode: fields.NumberField<ActiveEffectChangeMode, ActiveEffectChangeMode, false, false, true>;
    priority: fields.NumberField;
    phase: fields.StringField<EffectPhases, EffectPhases, true, false, false>;
};
export type EffectChangeData<TParent extends BaseActor | BaseItem<BaseActor | null> | null = null> = {
    key: string;
    value: string;
    mode: ActiveEffectChangeMode;
    priority: number;
    phase: 'initial' | 'final';
    effect?: BaseActiveEffect<TParent> | null;
};

type EffectDurationSchema = {
    startTime: fields.NumberField<number, number, false, true, true>;
    seconds: fields.NumberField;
    combat: fields.ForeignDocumentField;
    rounds: fields.NumberField;
    turns: fields.NumberField;
    startRound: fields.NumberField;
    startTurn: fields.NumberField;
};

export type ActiveEffectSource<
  TType extends string = string,
  TSystemSource extends ActiveEffectSystemSource = ActiveEffectSystemSource
> = fields.SourceFromSchema<ActiveEffectSchema<TType, TSystemSource>>;

export type EffectDurationSource = fields.SourceFromSchema<EffectDurationSchema>;
export type EffectDurationData = BaseActiveEffect<null>['duration'];
