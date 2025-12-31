/*--------------------------------------------------------------------------

@sinclair/typebox/type

The MIT License (MIT)

Copyright (c) 2017-2025 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/

import { CreateType } from '../create/type'
import type { TSchema, SchemaOptions } from '../schema/index'
import type { Static } from '../static/index'
import type { Evaluate, UnionToTuple } from '../helpers/index'
import type { TReadonly } from '../readonly/index'
import type { TOptional } from '../optional/index'
import { Kind } from '../symbols/index'

// ------------------------------------------------------------------
// TypeGuard
// ------------------------------------------------------------------
import { IsOptional } from '../guard/kind'

// ------------------------------------------------------------------
// ObjectStatic
// ------------------------------------------------------------------
type ReadonlyOptionalPropertyKeys<T extends TProperties> = { [K in keyof T]: T[K] extends TReadonly<TSchema> ? (T[K] extends TOptional<T[K]> ? K : never) : never }[keyof T]
type ReadonlyPropertyKeys<T extends TProperties> = { [K in keyof T]: T[K] extends TReadonly<TSchema> ? (T[K] extends TOptional<T[K]> ? never : K) : never }[keyof T]
type OptionalPropertyKeys<T extends TProperties> = { [K in keyof T]: T[K] extends TOptional<TSchema> ? (T[K] extends TReadonly<T[K]> ? never : K) : never }[keyof T]
type RequiredPropertyKeys<T extends TProperties> = keyof Omit<T, ReadonlyOptionalPropertyKeys<T> | ReadonlyPropertyKeys<T> | OptionalPropertyKeys<T>>

// prettier-ignore
type ObjectStaticProperties<T extends TProperties, R extends Record<keyof any, unknown>> = Evaluate<(
  Readonly<Partial<Pick<R, ReadonlyOptionalPropertyKeys<T>>>> &
  Readonly<Pick<R, ReadonlyPropertyKeys<T>>> &
  Partial<Pick<R, OptionalPropertyKeys<T>>> &
  Required<Pick<R, RequiredPropertyKeys<T>>>
)>
// prettier-ignore
type ObjectStatic<T extends TProperties, P extends unknown[]> = ObjectStaticProperties<T, {
  [K in keyof T]: Static<T[K], P>
}>
// ------------------------------------------------------------------
// TProperties
// ------------------------------------------------------------------
export type TPropertyKey = string | number // Consider making this PropertyKey
export type TProperties = Record<TPropertyKey, TSchema>
// ------------------------------------------------------------------
//
// TRequiredArray
//
// Version 0.34.x: Computes the array of required property keys. If the
// array is empty `[]` or contains a non-literal string type `[string]`,
// it falls back to `string[] | undefined`. This fallback allows `TObject`
// to be used as a generic constraint.
//
// Note: Generating the RequiredArray from `TProperties` allows TB 1.0
// to infer `TObject` via the XSchema inference path. The `string[] |
// undefined` fallback ensures that `TObject` remains compatible with
// varying `TObject<X>` instances.
//
// ------------------------------------------------------------------
// prettier-ignore
type TIsLiteralString<Type extends string> = (
  [Type] extends [string]
    ? [string] extends [Type]
      ? false
      : true
    : false
)
// prettier-ignore
type IsRequiredArrayLiteralConstant<RequiredTuple extends string[]> = (
  RequiredTuple extends [infer Left extends string, ...infer _ extends string[]]
    ? TIsLiteralString<Left>
    : false
)
// prettier-ignore
type TRequiredArray<Properties extends TProperties,
  RequiredProperties extends TProperties = { [Key in keyof Properties as Properties[Key] extends TOptional<Properties[Key]> ? never : Key]: Properties[Key] },
  RequiredUnion extends string = Extract<keyof RequiredProperties, string>,
  RequiredTuple extends string[] = UnionToTuple<RequiredUnion>,
  Result extends string[] | undefined = (
    IsRequiredArrayLiteralConstant<RequiredTuple> extends true
     ? RequiredTuple
     : string[] | undefined
  )> = Result
/** Creates a RequiredArray derived from the given TProperties value. */
function RequiredArray<Properties extends TProperties>(properties: Properties): TRequiredArray<Properties> {
  return globalThis.Object.keys(properties).filter((key) => !IsOptional(properties[key])) as never
}
// ------------------------------------------------------------------
// TObject
// ------------------------------------------------------------------
export type TAdditionalProperties = undefined | TSchema | boolean
export interface ObjectOptions extends SchemaOptions {
  /** Additional property constraints for this object */
  additionalProperties?: TAdditionalProperties
  /** The minimum number of properties allowed on this object */
  minProperties?: number
  /** The maximum number of properties allowed on this object */
  maxProperties?: number
}
export interface TObject<T extends TProperties = TProperties> extends TSchema, ObjectOptions {
  [Kind]: 'Object'
  static: ObjectStatic<T, this['params']>
  additionalProperties?: TAdditionalProperties
  type: 'object'
  properties: T
  required: TRequiredArray<T>
}
/** `[Json]` Creates an Object type */
function _Object<T extends TProperties>(properties: T, options?: ObjectOptions): TObject<T> {
  const required = RequiredArray(properties) as string[]
  const schema = required.length > 0 ? { [Kind]: 'Object', type: 'object', required, properties } : { [Kind]: 'Object', type: 'object', properties }
  return CreateType(schema, options) as never
}
/** `[Json]` Creates an Object type */
export var Object = _Object
