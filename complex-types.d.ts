import type {Node, Parent} from 'unist'

export type NodeInTree<
  Tree extends Node = never,
  Found = void
> = Tree extends Parent
  ?
      | Tree
      | NodeInTree<
          Exclude<Tree['children'][number], Found | Tree>,
          Found | Tree
        >
  : Tree
