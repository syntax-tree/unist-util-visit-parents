import {expectAssignable, expectNotType, expectType} from 'tsd'
import type {Literal, Node, Parent} from 'unist'
import {is} from 'unist-util-is'
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

const complexTree: Root = {
  type: 'root',
  children: [
    {
      type: 'blockquote',
      children: [{type: 'paragraph', children: [{type: 'text', value: 'a'}]}]
    },
    {
      type: 'paragraph',
      children: [
        {
          type: 'emphasis',
          children: [{type: 'emphasis', children: [{type: 'text', value: 'b'}]}]
        },
        {type: 'text', value: 'c'}
      ]
    }
  ]
}

interface Element extends Parent {
  type: 'element'
  tagName: string
  properties: Record<string, unknown>
  content: Node
  children: Array<Node>
}

type Content = Flow | Phrasing

interface Root extends Parent {
  type: 'root'
  children: Array<Flow>
}

type Flow = Blockquote | Heading | Paragraph

interface Blockquote extends Parent {
  type: 'blockquote'
  children: Array<Flow>
}

interface Heading extends Parent {
  type: 'heading'
  depth: number
  children: Array<Phrasing>
}

interface Paragraph extends Parent {
  type: 'paragraph'
  children: Array<Phrasing>
}

type Phrasing = Text | Emphasis

interface Emphasis extends Parent {
  type: 'emphasis'
  children: Array<Phrasing>
}

interface Text extends Literal {
  type: 'text'
  value: string
}

const isNode = (node: unknown): node is Node =>
  typeof node === 'object' && node !== null && 'type' in node
const headingTest = (node: unknown): node is Heading =>
  isNode(node) && node.type === 'heading'
const elementTest = (node: unknown): node is Element =>
  isNode(node) && node.type === 'element'

/* Missing params. */
// @ts-expect-error check.
visitParents()
// @ts-expect-error check.
visitParents(sampleTree)

/* Visit without test. */
visitParents(sampleTree, function (node, parents) {
  expectType<Root | Content>(node)
  expectType<Array<Root | Blockquote | Heading | Paragraph | Emphasis>>(parents)
})
visitParents(implicitTree, function (node) {
  expectAssignable<Node>(node)
  expectNotType<Node>(node) // Objects are too loose.
})

/* Visit with type test. */
visitParents(sampleTree, 'heading', function (node, parents) {
  expectType<Heading>(node)
  // Note that most of these can’t be a parent of `Heading`, but still.
  expectType<Array<Root | Blockquote | Heading | Paragraph | Emphasis>>(parents)
})
visitParents(sampleTree, 'element', function (node) {
  // Not in tree.
  expectType<never>(node)
})
// @ts-expect-error check.
visitParents(sampleTree, 'heading', function (_: Element) {})
visitParents(implicitTree, 'heading', function (node) {
  expectType<never>(node) // Objects are too loose.
  expectAssignable<Heading>(node)
  expectNotType<Heading>(node) // Objects are too loose.
})

/* Visit with object test. */
visitParents(sampleTree, {depth: 1}, function (node) {
  expectType<Heading>(node)
})
visitParents(sampleTree, {random: 'property'} as const, function (node) {
  expectType<never>(node)
})
visitParents(
  sampleTree,
  {type: 'heading', depth: '1'} as const,
  function (node) {
    // Not in tree.
    expectType<never>(node)
  }
)
visitParents(sampleTree, {tagName: 'section'} as const, function (node) {
  // Not in tree.
  expectType<never>(node)
})

// @ts-expect-error check.
visitParents(sampleTree, {type: 'heading'} as const, function (_: Element) {})
visitParents(implicitTree, {type: 'heading'} as const, function (node) {
  expectType<never>(node) // Objects are too loose.
  expectAssignable<Heading>(node)
  expectNotType<Heading>(node) // Objects are too loose.
})

/* Visit with function test. */
visitParents(sampleTree, headingTest, function (node) {
  expectType<Heading>(node)
})
// @ts-expect-error check.
visitParents(sampleTree, headingTest, function (_: Element) {})
visitParents(sampleTree, elementTest, function (node) {
  // Not in tree.
  expectType<never>(node)
})
visitParents(implicitTree, headingTest, function (node) {
  expectType<never>(node) // Objects are too loose.
  expectAssignable<Heading>(node)
  expectNotType<Heading>(node) // Objects are too loose.
})

/* Visit with array of tests. */
visitParents(sampleTree, ['heading', {depth: 1}, headingTest], function (node) {
  // Unfortunately TS casts things in arrays too vague.
  expectType<Root | Content>(node)
})

/* Visit returns action. */
visitParents(sampleTree, function () {
  return CONTINUE
})
visitParents(sampleTree, function () {
  return EXIT
})
visitParents(sampleTree, function () {
  return SKIP
})

// @ts-expect-error check.
visitParents(sampleTree, function () {
  return 'random'
})

/* Visit returns index. */
visitParents(sampleTree, function () {
  return 0
})
visitParents(sampleTree, function () {
  return 1
})

/* Visit returns tuple. */
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

// @ts-expect-error check.
visitParents(sampleTree, function () {
  return [1]
})

// @ts-expect-error check.
visitParents(sampleTree, function () {
  return ['random', 1]
})

/* Should infer children from the given tree. */
visitParents(complexTree, function (node) {
  expectType<Root | Content>(node)
})

const blockquote = complexTree.children[0]
if (is<Blockquote>(blockquote, 'blockquote')) {
  visitParents(blockquote, function (node) {
    expectType<Content>(node)
  })
}

const paragraph = complexTree.children[1]
if (is<Paragraph>(paragraph, 'paragraph')) {
  visitParents(paragraph, function (node) {
    expectType<Paragraph | Phrasing>(node)
  })

  const child = paragraph.children[1]

  if (is<Emphasis>(child, 'emphasis')) {
    visitParents(child, 'blockquote', function (node) {
      // `blockquote` does not exist in phrasing.
      expectType<never>(node)
    })
  }
}
