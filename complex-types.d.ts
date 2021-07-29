/* eslint-disable @typescript-eslint/ban-types */

import type {Node, Parent} from 'unist'
import type {Test} from 'unist-util-is'

export type InclusiveDescendant<
  Tree extends Node = never,
  Found = void
> = Tree extends Parent
  ?
      | Tree
      | InclusiveDescendant<
          Exclude<Tree['children'][number], Found | Tree>,
          Found | Tree
        >
  : Tree

type Predicate<Fn, Fallback = never> = Fn extends (
  value: any
) => value is infer Thing
  ? Thing
  : Fallback

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

export type Matches<Value, Check> =
  // Is this a list?
  Check extends any[]
    ? MatchesOne<Value, Check[keyof Check]>
    : MatchesOne<Value, Check>

/* eslint-enable @typescript-eslint/ban-types */
