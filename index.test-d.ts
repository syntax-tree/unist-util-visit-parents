/* eslint-disable @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-empty-function */

import {expectError} from 'tsd'
import {Node, Parent} from 'unist'
import {visitParents, SKIP, EXIT, CONTINUE} from './index.js'

/* Setup */
const sampleTree = {
  type: 'root',
  children: [{type: 'heading', depth: 1, children: []}]
}

interface Heading extends Parent {
  type: 'heading'
  depth: number
  children: Node[]
}

interface Element extends Parent {
  type: 'element'
  tagName: string
  properties: Record<string, unknown>
  content: Node
  children: Node[]
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
visitParents(sampleTree, (_) => {})
visitParents(sampleTree, (_: Node) => {})
expectError(visitParents(sampleTree, (_: Element) => {}))
expectError(visitParents(sampleTree, (_: Heading) => {}))

/* Visit with type test. */
visitParents(sampleTree, 'heading', (_) => {})
visitParents(sampleTree, 'heading', (_: Heading) => {})
expectError(visitParents(sampleTree, 'not-a-heading', (_: Heading) => {}))
expectError(visitParents(sampleTree, 'element', (_: Heading) => {}))

visitParents(sampleTree, 'element', (_) => {})
visitParents(sampleTree, 'element', (_: Element) => {})
expectError(visitParents(sampleTree, 'not-an-element', (_: Element) => {}))
expectError(visitParents(sampleTree, 'heading', (_: Element) => {}))

/* Visit with object test. */
visitParents(sampleTree, {type: 'heading'}, (_) => {})
visitParents(sampleTree, {random: 'property'}, (_) => {})

visitParents(sampleTree, {type: 'heading'}, (_: Heading) => {})
visitParents(sampleTree, {type: 'heading', depth: 2}, (_: Heading) => {})
expectError(visitParents(sampleTree, {type: 'element'}, (_: Heading) => {}))
expectError(
  visitParents(sampleTree, {type: 'heading', depth: '2'}, (_: Heading) => {})
)

visitParents(sampleTree, {type: 'element'}, (_: Element) => {})
visitParents(
  sampleTree,
  {type: 'element', tagName: 'section'},
  (_: Element) => {}
)

expectError(visitParents(sampleTree, {type: 'heading'}, (_: Element) => {}))

expectError(
  visitParents(sampleTree, {type: 'element', tagName: true}, (_: Element) => {})
)

/* Visit with function test. */
visitParents(sampleTree, headingTest, (_) => {})
visitParents(sampleTree, headingTest, (_: Heading) => {})
expectError(visitParents(sampleTree, headingTest, (_: Element) => {}))

visitParents(sampleTree, elementTest, (_) => {})
visitParents(sampleTree, elementTest, (_: Element) => {})
expectError(visitParents(sampleTree, elementTest, (_: Heading) => {}))

/* Visit with array of tests. */
visitParents(
  sampleTree,
  ['ParagraphNode', {type: 'element'}, headingTest],
  (_) => {}
)

/* Visit returns action. */
visitParents(sampleTree, 'heading', (_) => CONTINUE)
visitParents(sampleTree, 'heading', (_) => EXIT)
visitParents(sampleTree, 'heading', (_) => SKIP)
expectError(visitParents(sampleTree, 'heading', (_) => 'random'))

/* Visit returns index. */
visitParents(sampleTree, 'heading', (_) => 0)
visitParents(sampleTree, 'heading', (_) => 1)

/* Visit returns tuple. */
visitParents(sampleTree, 'heading', (_) => [CONTINUE, 1])
visitParents(sampleTree, 'heading', (_) => [EXIT, 1])
visitParents(sampleTree, 'heading', (_) => [SKIP, 1])
visitParents(sampleTree, 'heading', (_) => [SKIP])
expectError(visitParents(sampleTree, 'heading', (_) => [1]))
expectError(visitParents(sampleTree, 'heading', (_) => ['random', 1]))
