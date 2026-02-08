import { DataSchema, DatabaseUpdateOperation } from '@common/abstract/_module.mjs';
import Collection from '@common/utils/collection.mjs';
import type DataModel from './common/abstract/data.mjs';
import type { DeepReadonly, DeepPartial, Maybe, ValueOf } from './common/_shared-types.mjs';

declare global {
    type DeepReadonly<T> = import('./common/_shared-types.mjs').DeepReadonly<T>;
    type DeepPartial<T> = import('./common/_shared-types.mjs').DeepPartial<T>;
    type Maybe<T> = import('./common/_shared-types.mjs').Maybe<T>;

    type CollectionValue<T> = T extends Collection<string, infer U> ? U : never;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type AbstractConstructorOf<T> = abstract new (...args: any[]) => T;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type ConstructorOf<T> = new (...args: any[]) => T;

    type DocumentConstructorOf<T extends foundry.abstract.Document> = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (...args: any[]): T;
        updateDocuments(updates?: object[], operation?: Partial<DatabaseUpdateOperation<T['parent']>>): Promise<T[]>;
    };

    type ParentOf<TDataModel> = TDataModel extends DataModel<infer P extends DataModel | null> ? P : never;

    type SchemaOf<TDataModel> = TDataModel extends DataModel<infer _P, infer S extends DataSchema> ? S : never;

    type SetElement<TSet extends Set<unknown>> = TSet extends Set<infer TElement> ? TElement : never;

    type DropFirst<T extends unknown[]> = T extends [unknown, ...infer U] ? U : never;

    type ValueOf<T extends object> = import('./common/_shared-types.mjs').ValueOf<T>;

    /** A JSON-compatible value, plus `undefined` */
    type JSONValue = string | number | boolean | object | null | undefined;
}

type ExtractObjects<T> = T extends infer U ? (U extends object ? U : never) : never;

declare const $NestedValue: unique symbol;

type NestedValue<TValue extends object = object> = { [$NestedValue]: never } & TValue;

export {};
