import type {Node, Parent} from 'unist'

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
