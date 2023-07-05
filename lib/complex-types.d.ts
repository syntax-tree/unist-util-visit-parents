import type {Node, Parent} from 'unist'

/**
 * Internal utility to collect all descendants of in `Tree`.
 *
 * Performance: this seems to be the fastest way to recurse without actually
 * running into an infinite loop.
 *
 * Practically, `0 | 1 | 2` is enough for mdast, but it doesn’t improve performance.
 * Using up to 10 doesn’t hurt or help either.
 * So `5` seems reasonable.
 *
 */
export type InclusiveDescendant<
  Tree extends Node,
  Depth extends 0 | 1 | 2 | 3 | 4 | 5 = 0
> = Tree extends Parent
  ? Depth extends 5
    ? Tree
    :
        | Tree
        | InclusiveDescendant<
            Tree['children'][number],
            Depth extends 0
              ? 1
              : Depth extends 1
              ? 2
              : Depth extends 2
              ? 3
              : Depth extends 3
              ? 4
              : 5
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
      Check extends null | undefined
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
