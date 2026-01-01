import { Expect, IsExtendsMutual } from './assert'
import { Type, type TObject, type Static, type TNumber } from '@sinclair/typebox'
{
  const T = Type.Object({
    A: Type.String(),
    B: Type.String(),
    C: Type.String(),
  })

  Expect(T).ToStatic<{
    A: string
    B: string
    C: string
  }>()
}
{
  const T = Type.Object({
    A: Type.Object({
      A: Type.String(),
      B: Type.String(),
      C: Type.String(),
    }),
    B: Type.Object({
      A: Type.String(),
      B: Type.String(),
      C: Type.String(),
    }),
    C: Type.Object({
      A: Type.String(),
      B: Type.String(),
      C: Type.String(),
    }),
  })
  Expect(T).ToStatic<{
    A: {
      A: string
      B: string
      C: string
    }
    B: {
      A: string
      B: string
      C: string
    }
    C: {
      A: string
      B: string
      C: string
    }
  }>()
}
{
  const T = Type.Object(
    {
      A: Type.Number(),
      B: Type.Number(),
      C: Type.Number(),
    },
    {
      additionalProperties: Type.Boolean(),
    },
  )
  // note: Pending TypeScript support for negated types.
  Expect(T).ToStatic<{
    A: number
    B: number
    C: number
  }>()
}
// ------------------------------------------------------------------
// Required
// ------------------------------------------------------------------
{
  const _A = Type.Object({})
  const _B = Type.Object({ x: Type.Number() })
  const _C = Type.Object({ x: Type.Number(), y: Type.Number() })

  type A = (typeof _A)['required']
  type B = (typeof _B)['required']
  type C = (typeof _C)['required']

  IsExtendsMutual<A, string[] | undefined>(true)
  IsExtendsMutual<B, ['x']>(true)
  IsExtendsMutual<C, ['x', 'y']>(true)
}
// ------------------------------------------------------------------
// https://github.com/sinclairzx81/typebox/issues/1500
// ------------------------------------------------------------------
{
  function test<Type extends TObject>(type: Type): Static<Type> {
    return null as never
  }
  const _A = test(Type.Object({}))
  const _B = test(
    Type.Object({
      x: Type.Number(),
      y: Type.Number(),
    }),
  )
  const _C = test(
    Type.Partial(
      Type.Object({
        x: Type.Number(),
        y: Type.Number(),
      }),
    ),
  )
}
// ------------------------------------------------------------------
// Inference
// ------------------------------------------------------------------
{
  type T = Static<typeof T>
  const T = null as never as TObject<{}>
  Expect(T).ToStatic<{}>()
}
{
  type T = Static<typeof T>
  const T = null as never as TObject
  Expect(T).ToStatic<{
    [x: string]: unknown
    [x: number]: unknown
  }>()
}
{
  type T = Static<typeof T>
  const T = null as never as TObject<{ x: TNumber }>
  Expect(T).ToStatic<{
    x: number
  }>()
}
