/**
 * Shared utility types used across Foundry type definitions.
 * These types are designed to minimize type depth and complexity.
 */

/**
 * Helper to check if a type is a primitive that doesn't need recursive readonly
 */
type IsPrimitive<T> = T extends undefined | null | boolean | number | string | symbol | bigint | Function | Date
    ? true
    : false;

/**
 * Helper to extract the contained type from a container
 */
type GetContainedType<T> = T extends Array<infer V>
    ? V
    : T extends Map<infer K, infer V>
      ? V
      : T extends Set<infer V>
        ? V
        : never;

/**
 * Make all properties in T recursively readonly.
 * Optimized for reduced type depth by separating concerns.
 */
export type DeepReadonly<T> = IsPrimitive<T> extends true
    ? T
    : T extends Array<infer V>
      ? ReadonlyArray<DeepReadonly<V>>
      : T extends Map<infer K, infer V>
        ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
        : T extends Set<infer V>
          ? ReadonlySet<DeepReadonly<V>>
          : {
              readonly [K in keyof T]: DeepReadonly<T[K]>;
            };

/**
 * Helper for deeply partial types
 */
export type DeepPartial<T, TNestedValue extends object = {}> = IsPrimitive<T> extends true
    ? T
    : T extends (infer U)[]
      ? DeepPartial<U, TNestedValue>[]
      : T extends TNestedValue
        ? T
        : {
            [K in keyof T]?: DeepPartial<T[K], TNestedValue>;
          };

/**
 * Extract a value from a union type with type safety
 */
export type ValueOf<T extends object> = T[keyof T];

/**
 * Make a type nullable and undefinable with one type
 */
export type Maybe<T> = T | null | undefined;
