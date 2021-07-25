import type {Node, Parent} from 'unist'

export type NodeInTree<T extends Node, A = void> = T extends Parent
  ? T | NodeInTree<Exclude<T['children'][number], A | T>, A | T>
  : T
