/* eslint-disable @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-empty-function */

import {expectError, expectType} from 'tsd'
import {Node, Literal, Parent} from 'unist'
import {is} from 'unist-util-is'
import {visitParents, SKIP, EXIT, CONTINUE} from './index.js'

/* Setup */
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
  children: Node[]
}

type Content = Flow | Phrasing

interface Root extends Parent {
  type: 'root'
  children: Flow[]
}

type Flow = Blockquote | Heading | Paragraph

interface Blockquote extends Parent {
  type: 'blockquote'
  children: Flow[]
}

interface Heading extends Parent {
  type: 'heading'
  depth: number
  children: Phrasing[]
}

interface Paragraph extends Parent {
  type: 'paragraph'
  children: Phrasing[]
}

type Phrasing = Text | Emphasis

interface Emphasis extends Parent {
  type: 'emphasis'
  children: Phrasing[]
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
expectError(visitParents())
expectError(visitParents(sampleTree))

/* Visit without test. */
visitParents(sampleTree, (node) => {
  expectType<Root | Content>(node)
})

/* Visit with type test. */
visitParents(sampleTree, 'heading', (node) => {
  expectType<Heading>(node)
})
visitParents(sampleTree, 'element', (node) => {
  // Not in tree.
  expectType<never>(node)
})
expectError(visitParents(sampleTree, 'heading', (_: Element) => {}))

/* Visit with object test. */
visitParents(sampleTree, {depth: 1}, (node) => {
  expectType<Heading>(node)
})
visitParents(sampleTree, {random: 'property'}, (node) => {
  expectType<never>(node)
})
visitParents(sampleTree, {type: 'heading', depth: '2'}, (node) => {
  // Not in tree.
  expectType<never>(node)
})
visitParents(sampleTree, {tagName: 'section'}, (node) => {
  // Not in tree.
  expectType<never>(node)
})
visitParents(sampleTree, {type: 'element', tagName: 'section'}, (node) => {
  // Not in tree.
  expectType<never>(node)
})
expectError(visitParents(sampleTree, {type: 'heading'}, (_: Element) => {}))

/* Visit with function test. */
visitParents(sampleTree, headingTest, (node) => {
  expectType<Heading>(node)
})
expectError(visitParents(sampleTree, headingTest, (_: Element) => {}))
visitParents(sampleTree, elementTest, (node) => {
  // Not in tree.
  expectType<never>(node)
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
