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

type EffectStartSchema = {
    combat: fields.ForeignDocumentField;
    combatant: fields.ForeignDocumentField;
    initiative: fields.NumberField<number, number, true, false, false>;
    round: fields.NumberField<number, number, true, false, false>;
    turn: fields.NumberField<number, number, true, false, false>;
    time: fields.NumberField<number, number, true, false, false>;
};

export type EffectStartData = fields.SourceFromSchema<EffectStartSchema>;

type ActiveEffectSchema<
  TType extends string = string,
  TSystemSource extends ActiveEffectSystemSource = ActiveEffectSystemSource
> = {
    _id: fields.DocumentIdField;
    name: fields.StringField<string, string, true, false, false>;
    system: fields.TypeDataField<TSystemSource>;
    type: fields.StringField<TType, TType, true, false, false>;
    disabled: fields.BooleanField;
    start: fields.SchemaField<EffectStartSchema>;
    duration: fields.SchemaField<EffectDurationSchema>;
    description: fields.HTMLField;
    img: fields.FilePathField<ImageFilePath>;
    origin: fields.DocumentUUIDField;
    tint: fields.ColorField;
    transfer: fields.BooleanField;
    statuses: fields.SetField<fields.StringField<string, string, true, false, false>>;
    showIcon: fields.NumberField<number, number, true, false, false>;
    folder: fields.ForeignDocumentField;
    sort: fields.IntegerSortField;
    flags: fields.DocumentFlagsField;
    _stats: fields.DocumentStatsField;
};

type EffectPhases = 'initial' | 'final';

type EffectChangeSchema = {
    key: fields.StringField<string, string, true, false, false>;
    value: fields.StringField<string, string, true, false, false>;
    type: fields.StringField<string, string, true, false, false>;
    priority?: fields.NumberField<number, number, false, true, true>;
    phase: fields.StringField<EffectPhases, EffectPhases, true, false, false>;
};

export type EffectChangeData<TParent extends BaseActor | BaseItem<BaseActor | null> | null = null> = {
    key: string;
    value: string;
    type: string;
    priority?: number;
    phase: 'initial' | 'final';
    effect?: BaseActiveEffect<TParent> | null;
};

type EffectDurationSchema = {
    value: fields.NumberField<number, number, true, true, false>;
    units: fields.StringField<string, string, true, false, false>;
    expiry: fields.StringField<string, string, true, true, false>;
    expired: fields.BooleanField;
};

export type ActiveEffectSource<
  TType extends string = string,
  TSystemSource extends ActiveEffectSystemSource = ActiveEffectSystemSource
> = fields.SourceFromSchema<ActiveEffectSchema<TType, TSystemSource>>;

export type EffectDurationSource = fields.SourceFromSchema<EffectDurationSchema>;
export type EffectDurationData = BaseActiveEffect<null>['duration'];
