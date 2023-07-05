export type {Test} from 'unist-util-is'
export type {
  Action,
  ActionTuple,
  BuildVisitor,
  // Used in `unist-util-visit`:
  InclusiveDescendant,
  Index,
  // Used in `unist-util-visit`:
  Matches,
  Visitor,
  VisitorResult
} from './lib/index.js'
export {CONTINUE, EXIT, SKIP, visitParents} from './lib/index.js'
