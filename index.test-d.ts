import {expectAssignable, expectNotType, expectType} from 'tsd'
import type {
  Blockquote,
  Definition,
  Delete,
  Emphasis,
  FootnoteDefinition,
  Heading,
  Link,
  LinkReference,
  List,
  ListItem,
  Nodes,
  Paragraph,
  Parents,
  PhrasingContent,
  Root,
  RootContent,
  Strong,
  TableCell
} from 'mdast'
import type {Node} from 'unist'
import {CONTINUE, EXIT, SKIP, visitParents} from './index.js'

/* Setup */
const implicitTree = {
  type: 'root',
  children: [{type: 'heading', depth: 1, children: []}]
}

const sampleTree: Root = {
  type: 'root',
  children: [{type: 'heading', depth: 1, children: []}]
}

const isNode = (node: unknown): node is Nodes =>
  typeof node === 'object' && node !== null && 'type' in node
const headingTest = (node: unknown): node is Heading =>
  isNode(node) && node.type === 'heading'
const paragraphTest = (node: unknown): node is Paragraph =>
  isNode(node) && node.type === 'paragraph'

// ## Missing parameters
// @ts-expect-error: check that `node` is passed.
visitParents()
// @ts-expect-error: check that `visitor` is passed.
visitParents(sampleTree)

// ## No test
visitParents(sampleTree, function (node, parents) {
  expectType<Nodes>(node)
  expectType<Parents[]>(parents)
})

visitParents(implicitTree, function (node, parents) {
  // Objects are too loose.
  expectAssignable<Node>(node)
  expectNotType<Node>(node)
  expectAssignable<Node[]>(parents)
})

// ## String test

// Knows it’s a heading and its parents.
visitParents(sampleTree, 'heading', function (node, parents) {
  expectType<Heading>(node)
  expectType<Array<Blockquote | FootnoteDefinition | List | ListItem | Root>>(
    parents
  )
})

// Not in tree.
visitParents(sampleTree, 'element', function (node, parents) {
  expectType<never>(node)
  expectType<never[]>(parents)
})

// Implicit nodes are too loose.
visitParents(implicitTree, 'heading', function (node, parents) {
  expectType<never>(node)
  expectType<never[]>(parents)
})

// ## Props test

// Knows that headings have depth, but TS doesn’t infer the depth normally.
visitParents(sampleTree, {depth: 1}, function (node) {
  expectType<Heading>(node)
  expectType<1 | 2 | 3 | 4 | 5 | 6>(node.depth)
})

// This goes fine.
visitParents(sampleTree, {type: 'heading'} as const, function (node) {
  expectType<Heading>(node)
  expectType<1 | 2 | 3 | 4 | 5 | 6>(node.depth)
})

// For some reason the const goes wrong.
visitParents(sampleTree, {depth: 1} as const, function (node) {
  // Note: something going wrong here, to do: investigate.
  expectType<never>(node)
})

// For some reason the const goes wrong.
visitParents(sampleTree, {type: 'heading', depth: 1} as const, function (node) {
  // Note: something going wrong here, to do: investigate.
  expectType<never>(node)
})

// Function test (implicit assertion).
visitParents(sampleTree, isHeadingLoose, function (node) {
  expectType<Nodes>(node)
})
// Function test (explicit assertion).
visitParents(sampleTree, isHeading, function (node) {
  expectType<Heading>(node)
  expectType<1 | 2 | 3 | 4 | 5 | 6>(node.depth)
})
// Function test (explicit assertion).
visitParents(sampleTree, isHeading2, function (node) {
  expectType<Heading & {depth: 2}>(node)
})

// ## Combined tests
// No `as const` fails.
visitParents(sampleTree, ['heading', {depth: 1}, isHeading], function (node) {
  // Unfortunately TS casts things in arrays too vague.
  expectType<Root | RootContent>(node)
})

// As const works.
visitParents(
  sampleTree,
  ['heading', {depth: 1}, isHeading] as const,
  function (node) {
    // Unfortunately TS casts things in arrays too vague.
    expectType<Heading>(node)
  }
)

// ## Return type: incorrect.
// @ts-expect-error: not an action.
visitParents(sampleTree, function () {
  return 'random'
})
// @ts-expect-error: not a tuple: missing action.
visitParents(sampleTree, function () {
  return [1]
})
// @ts-expect-error: not a tuple: incorrect action.
visitParents(sampleTree, function () {
  return ['random', 1]
})

// ## Return type: action.
visitParents(sampleTree, function () {
  return CONTINUE
})
visitParents(sampleTree, function () {
  return EXIT
})
visitParents(sampleTree, function () {
  return SKIP
})

// ## Return type: index.
visitParents(sampleTree, function () {
  return 0
})
visitParents(sampleTree, function () {
  return 1
})

// ## Return type: tuple.
visitParents(sampleTree, function () {
  return [CONTINUE, 1]
})
visitParents(sampleTree, function () {
  return [EXIT, 1]
})
visitParents(sampleTree, function () {
  return [SKIP, 1]
})
visitParents(sampleTree, function () {
  return [SKIP]
})

// ## Infer on tree
visitParents(sampleTree, 'tableCell', function (node) {
  visitParents(node, function (node, parents) {
    expectType<TableCell | PhrasingContent>(node)
    expectType<
      Array<Delete | Emphasis | Link | LinkReference | Strong | TableCell>
    >(parents)
  })
})

visitParents(sampleTree, 'definition', function (node) {
  visitParents(node, function (node, parents) {
    expectType<Definition>(node)
    expectType<never[]>(parents)
  })
})

function isHeading(node: Node): node is Heading {
  return node ? node.type === 'heading' : false
}

function isHeading2(node: Node): node is Heading & {depth: 2} {
  return isHeading(node) && node.depth === 2
}

function isHeadingLoose(node: Node) {
  return node ? node.type === 'heading' : false
}
