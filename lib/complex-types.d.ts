/* eslint-disable @typescript-eslint/ban-types */

import type {Node, Parent} from 'unist'
import type {Test} from 'unist-util-is'
import type {Visitor} from './index.js'

type LessThan<
  A extends number,
  B extends number,
  S extends any[] = []
> = S['length'] extends B
  ? false
  : S['length'] extends A
  ? true
  : LessThan<A, B, [...S, any]>

type Subtract<
  A extends number,
  B extends number,
  I extends any[] = [],
  O extends any[] = []
> = LessThan<A, B> extends true
  ? never
  : LessThan<I['length'], A> extends true
  ? Subtract<
      A,
      B,
      [...I, any],
      LessThan<I['length'], B> extends true ? O : [...O, any]
    >
  : O['length']

/**
 * Internal utility to collect all descendants of in `Tree`.
 */
export type InclusiveDescendant<
  Tree extends Node = never,
  Found = void,
  Depth extends number = 5
> = Depth extends 0
  ? Tree
  : Tree extends Parent
  ?
      | Tree
      | InclusiveDescendant<
          Exclude<Tree['children'][number], Found | Tree>,
          Found | Tree,
          Subtract<Depth, 1>
        >
  : Tree

/**
 * Infer the thing that is asserted from a type guard.
 */
type Predicate<Fn, Fallback = never> = Fn extends (
  value: any
) => value is infer Thing
  ? Thing
  : Fallback

/**
 * Check if a node matches a test.
 *
 * Returns either the node if it matches or `never` otherwise.
 */
type MatchesOne<Value, Check> =
  // Is this a node?
  Value extends Node
    ? // No test.
      Check extends null
      ? Value
      : // No test.
      Check extends undefined
      ? Value
      : // Function test.
      Check extends Function
      ? Extract<Value, Predicate<Check, Value>>
      : // String (type) test.
      Value['type'] extends Check
      ? Value
      : // Partial test.
      Value extends Check
      ? Value
      : never
    : never

/**
 * Check if a node matches one or more tests.
 *
 * Returns either the node if it matches or `never` otherwise.
 */
export type Matches<Value, Check> =
  // Is this a list?
  Check extends Array<any>
    ? MatchesOne<Value, Check[keyof Check]>
    : MatchesOne<Value, Check>
/* eslint-enable @typescript-eslint/ban-types */
