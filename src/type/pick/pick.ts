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
import { Discard } from '../discard/discard'
import type { TSchema, SchemaOptions } from '../schema/index'
import type { TupleToUnion, Evaluate } from '../helpers/index'
import { type TRecursive } from '../recursive/index'
import { Computed, type TComputed } from '../computed/index'
import { Intersect, type TIntersect } from '../intersect/index'
import { Literal, type TLiteral, type TLiteralValue } from '../literal/index'
import { Object, type TObject, type TProperties, type TPropertyKey } from '../object/index'
import { Union, type TUnion } from '../union/index'
import { type TMappedKey, type TMappedResult } from '../mapped/index'
import { type TRef } from '../ref/index'
import { IndexPropertyKeys, type TIndexPropertyKeys } from '../indexed/index'
import { TransformKind } from '../symbols/symbols'

// ------------------------------------------------------------------
// Guards
// ------------------------------------------------------------------
import { IsMappedKey, IsMappedResult, IsIntersect, IsUnion, IsObject, IsSchema, IsLiteralValue, IsRef } from '../guard/kind'
import { IsArray as IsArrayValue } from '../guard/value'

// ------------------------------------------------------------------
// Infrastructure
// ------------------------------------------------------------------
import { PickFromMappedKey, type TPickFromMappedKey } from './pick-from-mapped-key'
import { PickFromMappedResult, type TPickFromMappedResult } from './pick-from-mapped-result'

// ------------------------------------------------------------------
// FromIntersect
// ------------------------------------------------------------------
// prettier-ignore
type TFromIntersect<Types extends TSchema[], PropertyKeys extends PropertyKey[], Result extends TSchema[] = []> = 
  Types extends [infer L extends TSchema, ...infer R extends TSchema[]]
    ? TFromIntersect<R, PropertyKeys, [...Result, TPick<L, PropertyKeys>]>
    : Result
function FromIntersect<Types extends TSchema[], PropertyKeys extends PropertyKey[]>(types: Types, propertyKeys: PropertyKeys): TFromIntersect<Types, PropertyKeys> {
  return types.map((type) => PickResolve(type, propertyKeys)) as never
}
// ------------------------------------------------------------------
// FromUnion
// ------------------------------------------------------------------
// prettier-ignore
type TFromUnion<Types extends TSchema[], PropertyKeys extends PropertyKey[], Result extends TSchema[] = []> = 
  Types extends [infer L extends TSchema, ...infer R extends TSchema[]]
    ? TFromUnion<R, PropertyKeys, [...Result, TPick<L, PropertyKeys>]>
    : Result
// prettier-ignore
function FromUnion<Types extends TSchema[], PropertyKeys extends PropertyKey[]>(types: Types, propertyKeys: PropertyKeys): TFromUnion<Types, PropertyKeys> {
  return types.map((type) => PickResolve(type, propertyKeys)) as never
}
// ------------------------------------------------------------------
// FromProperties
// ------------------------------------------------------------------
// prettier-ignore
type TFromProperties<Properties extends TProperties, PropertyKeys extends PropertyKey[], UnionKeys extends PropertyKey = TupleToUnion<PropertyKeys>> = (
  Evaluate<Pick<Properties, UnionKeys & keyof Properties>>
)
// prettier-ignore
function FromProperties<Properties extends TProperties, PropertyKeys extends PropertyKey[]>(properties: Properties, propertyKeys: PropertyKeys): TFromProperties <Properties, PropertyKeys> {
  const result = {} as TProperties
  for(const K2 of propertyKeys) if(K2 in properties) result[K2 as TPropertyKey] = properties[K2 as keyof Properties]
  return result as never
}
// ------------------------------------------------------------------
// FromObject
// ------------------------------------------------------------------
// prettier-ignore
type TFromObject<_Type extends TObject, Keys extends PropertyKey[], Properties extends TProperties,
  MappedProperties extends TProperties = TFromProperties<Properties, Keys>,
  Result extends TSchema = TObject<MappedProperties>,
> = Result
// prettier-ignore
function FromObject<Type extends TObject, keys extends PropertyKey[], Properties extends TProperties>
  (Type: Type, keys: keys, properties: Properties): TFromObject<Type, keys, Properties> {
  const options = Discard(Type, [TransformKind, '$id', 'required', 'properties'])
  const mappedProperties = FromProperties(properties, keys)
  return Object(mappedProperties, options) as never
}
// ------------------------------------------------------------------
// UnionFromPropertyKeys
// ------------------------------------------------------------------
// prettier-ignore
type TUnionFromPropertyKeys<PropertyKeys extends PropertyKey[], Result extends TLiteral[] = []> = (
  PropertyKeys extends [infer Key extends PropertyKey, ...infer Rest extends PropertyKey[]]
    ? Key extends TLiteralValue
      ? TUnionFromPropertyKeys<Rest, [...Result, TLiteral<Key>]>
      : TUnionFromPropertyKeys<Rest, [...Result]>
    : TUnion<Result>
)
// prettier-ignore
function UnionFromPropertyKeys<PropertyKeys extends PropertyKey[]>(propertyKeys: PropertyKeys): TUnionFromPropertyKeys<PropertyKeys> {
  const result = propertyKeys.reduce((result, key) => IsLiteralValue(key) ? [...result, Literal(key)]: result, [] as TLiteral[])
  return Union(result) as never
}
// ------------------------------------------------------------------
// TPickResolve
// ------------------------------------------------------------------
// prettier-ignore
export type TPickResolve<Type extends TProperties, PropertyKeys extends PropertyKey[]> = (
  Type extends TRecursive<infer Types extends TSchema> ? TRecursive<TPickResolve<Types, PropertyKeys>> : 
  Type extends TIntersect<infer Types extends TSchema[]> ? TIntersect<TFromIntersect<Types, PropertyKeys>> : 
  Type extends TUnion<infer Types  extends TSchema[]> ? TUnion<TFromUnion<Types, PropertyKeys>> : 
  Type extends TObject<infer Properties extends TProperties> ? TFromObject<TObject, PropertyKeys, Properties> : 
  TObject<{}>
)
// prettier-ignore
function PickResolve<Type extends TSchema, PropertyKeys extends PropertyKey[]>
  (type: Type, propertyKeys: [...PropertyKeys]): TPickResolve<Type, PropertyKeys> {
  return (
    IsIntersect(type) ? Intersect(FromIntersect(type.allOf, propertyKeys)) : 
    IsUnion(type) ? Union(FromUnion(type.anyOf, propertyKeys)) : 
    IsObject(type) ? FromObject(type, propertyKeys, type.properties) :
    Object({})
  ) as never
}
// ------------------------------------------------------------------
// TPick
//
// This mapping logic is to overly complex because of the decision
// to use PropertyKey[] as the default selector. The PropertyKey[]
// did make TMapped types simpler to implement, but a non-TSchema
// selector makes supporting TComputed awkward as it requires
// generalization via TSchema. This type should be reimplemented
// in the next major revision to support TSchema as the primary
// selector.
//
// ------------------------------------------------------------------
// prettier-ignore (do not export this type)
type TResolvePropertyKeys<Key extends TSchema | PropertyKey[]> = Key extends TSchema ? TIndexPropertyKeys<Key> : Key
// prettier-ignore (do not export this type)
type TResolveTypeKey<Key extends TSchema | PropertyKey[]> = Key extends PropertyKey[] ? TUnionFromPropertyKeys<Key> : Key
// prettier-ignore
export type TPick<Type extends TSchema, Key extends TSchema | PropertyKey[],
  IsTypeRef extends boolean = Type extends TRef ? true : false,
  IsKeyRef extends boolean = Key extends TRef ? true : false,
> = (
  Type extends TMappedResult ? TPickFromMappedResult<Type, TResolvePropertyKeys<Key>> :
  Key extends TMappedKey ? TPickFromMappedKey<Type, Key> :
  [IsTypeRef, IsKeyRef] extends [true, true] ? TComputed<'Pick', [Type, TResolveTypeKey<Key>]> :
  [IsTypeRef, IsKeyRef] extends [false, true] ? TComputed<'Pick', [Type, TResolveTypeKey<Key>]> :
  [IsTypeRef, IsKeyRef] extends [true, false] ? TComputed<'Pick', [Type, TResolveTypeKey<Key>]> :
  TPickResolve<Type, TResolvePropertyKeys<Key>>
)
/** `[Json]` Constructs a type whose keys are picked from the given type */
export function Pick<Type extends TSchema, Key extends PropertyKey[]>(type: Type, key: readonly [...Key], options?: SchemaOptions): TPick<Type, Key>
/** `[Json]` Constructs a type whose keys are picked from the given type */
export function Pick<Type extends TSchema, Key extends TSchema>(type: Type, key: Key, options?: SchemaOptions): TPick<Type, Key>
/** `[Json]` Constructs a type whose keys are picked from the given type */
// prettier-ignore
export function Pick(type: any, key: any, options?: SchemaOptions): any {
  const typeKey: TSchema = IsArrayValue(key) ? UnionFromPropertyKeys(key as PropertyKey[]) : key 
  const propertyKeys: PropertyKey[] = IsSchema(key) ? IndexPropertyKeys(key) : key
  const isTypeRef: boolean = IsRef(type)
  const isKeyRef: boolean = IsRef(key)
  return (
    IsMappedResult(type) ? PickFromMappedResult(type, propertyKeys, options) :
    IsMappedKey(key) ? PickFromMappedKey(type, key, options) :
    (isTypeRef && isKeyRef) ? Computed('Pick', [type, typeKey], options) :
    (!isTypeRef && isKeyRef) ? Computed('Pick', [type, typeKey], options) :
    (isTypeRef && !isKeyRef) ? Computed('Pick', [type, typeKey], options) :
    CreateType({ ...PickResolve(type, propertyKeys), ...options })
  ) as never
}
