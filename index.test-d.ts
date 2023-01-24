/* eslint-disable @typescript-eslint/no-empty-function */

import {expectAssignable, expectError, expectType, expectNotType} from 'tsd'
import type {Node, Literal, Parent} from 'unist'
import {is} from 'unist-util-is'
import {visitParents, SKIP, EXIT, CONTINUE} from './index.js'

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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface Element extends Parent {
  type: 'element'
  tagName: string
  properties: Record<string, unknown>
  content: Node
  children: Array<Node>
}

type Content = Flow | Phrasing

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface Root extends Parent {
  type: 'root'
  children: Array<Flow>
}

type Flow = Blockquote | Heading | Paragraph

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface Blockquote extends Parent {
  type: 'blockquote'
  children: Array<Flow>
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface Heading extends Parent {
  type: 'heading'
  depth: number
  children: Array<Phrasing>
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface Paragraph extends Parent {
  type: 'paragraph'
  children: Array<Phrasing>
}

type Phrasing = Text | Emphasis

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface Emphasis extends Parent {
  type: 'emphasis'
  children: Array<Phrasing>
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
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
expectError(visitParents())
expectError(visitParents(sampleTree))

/* Visit without test. */
visitParents(sampleTree, (node, parents) => {
  expectType<Root | Content>(node)
  expectType<Array<Root | Blockquote | Heading | Paragraph | Emphasis>>(parents)
})
visitParents(implicitTree, (node) => {
  expectAssignable<Node>(node)
  expectNotType<Node>(node) // Objects are too loose.
})

/* Visit with type test. */
visitParents(sampleTree, 'heading', (node, parents) => {
  expectType<Heading>(node)
  // Note that most of these can’t be a parent of `Heading`, but still.
  expectType<Array<Root | Blockquote | Heading | Paragraph | Emphasis>>(parents)
})
visitParents(sampleTree, 'element', (node) => {
  // Not in tree.
  expectType<never>(node)
})
expectError(visitParents(sampleTree, 'heading', (_: Element) => {}))
visitParents(implicitTree, 'heading', (node) => {
  expectType<never>(node) // Objects are too loose.
  expectAssignable<Heading>(node)
  expectNotType<Heading>(node) // Objects are too loose.
})

/* Visit with object test. */
visitParents(sampleTree, {depth: 1}, (node) => {
  expectType<Heading>(node)
})
visitParents(sampleTree, {random: 'property'} as const, (node) => {
  expectType<never>(node)
})
visitParents(sampleTree, {type: 'heading', depth: '1'} as const, (node) => {
  // Not in tree.
  expectType<never>(node)
})
visitParents(sampleTree, {tagName: 'section'} as const, (node) => {
  // Not in tree.
  expectType<never>(node)
})
expectError(
  visitParents(sampleTree, {type: 'heading'} as const, (_: Element) => {})
)
visitParents(implicitTree, {type: 'heading'} as const, (node) => {
  expectType<never>(node) // Objects are too loose.
  expectAssignable<Heading>(node)
  expectNotType<Heading>(node) // Objects are too loose.
})

/* Visit with function test. */
visitParents(sampleTree, headingTest, (node) => {
  expectType<Heading>(node)
})
expectError(visitParents(sampleTree, headingTest, (_: Element) => {}))
visitParents(sampleTree, elementTest, (node) => {
  // Not in tree.
  expectType<never>(node)
})
visitParents(implicitTree, headingTest, (node) => {
  expectType<never>(node) // Objects are too loose.
  expectAssignable<Heading>(node)
  expectNotType<Heading>(node) // Objects are too loose.
})

/* Visit with array of tests. */
visitParents(sampleTree, ['heading', {depth: 1}, headingTest], (node) => {
  // Unfortunately TS casts things in arrays too vague.
  expectType<Root | Content>(node)
})

/* Visit returns action. */
visitParents(sampleTree, () => CONTINUE)
visitParents(sampleTree, () => EXIT)
visitParents(sampleTree, () => SKIP)
expectError(visitParents(sampleTree, () => 'random'))

/* Visit returns index. */
visitParents(sampleTree, () => 0)
visitParents(sampleTree, () => 1)

/* Visit returns tuple. */
visitParents(sampleTree, () => [CONTINUE, 1])
visitParents(sampleTree, () => [EXIT, 1])
visitParents(sampleTree, () => [SKIP, 1])
visitParents(sampleTree, () => [SKIP])
expectError(visitParents(sampleTree, () => [1]))
expectError(visitParents(sampleTree, () => ['random', 1]))

/* Should infer children from the given tree. */
visitParents(complexTree, (node) => {
  expectType<Root | Content>(node)
})

const blockquote = complexTree.children[0]
if (is<Blockquote>(blockquote, 'blockquote')) {
  visitParents(blockquote, (node) => {
    expectType<Content>(node)
  })
}

const paragraph = complexTree.children[1]
if (is<Paragraph>(paragraph, 'paragraph')) {
  visitParents(paragraph, (node) => {
    expectType<Paragraph | Phrasing>(node)
  })

  const child = paragraph.children[1]

  if (is<Emphasis>(child, 'emphasis')) {
    visitParents(child, 'blockquote', (node) => {
      // `blockquote` does not exist in phrasing.
      expectType<never>(node)
    })
  }
}
