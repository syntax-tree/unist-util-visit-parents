import {Node, Parent} from 'unist'
import unified = require('unified')
import visit = require('unist-util-visit-parents')

/*=== setup ===*/
const sampleTree = {
  type: 'root',
  children: [
    {
      type: 'heading',
      depth: 1,
      children: []
    }
  ]
}

interface Heading extends Parent {
  type: 'heading'
  depth: number
  children: Node[]
}

interface Element extends Parent {
  type: 'element'
  tagName: string
  properties: {
    [key: string]: unknown
  }
  content: Node
  children: Node[]
}

const isNode = (node: unknown): node is Node =>
  typeof node === 'object' && !!node && 'type' in node
const headingTest = (node: unknown): node is Heading =>
  isNode(node) && node.type === 'heading'
const elementTest = (node: unknown): node is Element =>
  isNode(node) && node.type === 'element'

/*=== constants ===*/
const cont: visit.Continue = visit.CONTINUE
const skip: visit.Skip = visit.SKIP
const exit: visit.Exit = visit.EXIT

/*=== missing params ===*/
// $ExpectError
visit()
// $ExpectError
visit(sampleTree)

/*=== visit without test ===*/
visit(sampleTree, (node) => {})
visit(sampleTree, (node: Node) => {})
// $ExpectError
visit(sampleTree, (node: Element) => {})
// $ExpectError
visit(sampleTree, (node: Heading) => {})

/*=== visit with type test ===*/
visit(sampleTree, 'heading', (node) => {})
visit(sampleTree, 'heading', (node: Heading) => {})
// $ExpectError
visit(sampleTree, 'not-a-heading', (node: Heading) => {})
// $ExpectError
visit(sampleTree, 'element', (node: Heading) => {})

visit(sampleTree, 'element', (node) => {})
visit(sampleTree, 'element', (node: Element) => {})
// $ExpectError
visit(sampleTree, 'not-an-element', (node: Element) => {})
// $ExpectError
visit(sampleTree, 'heading', (node: Element) => {})

/*=== visit with object test ===*/
visit(sampleTree, {type: 'heading'}, (node) => {})
visit(sampleTree, {random: 'property'}, (node) => {})

visit(sampleTree, {type: 'heading'}, (node: Heading) => {})
visit(sampleTree, {type: 'heading', depth: 2}, (node: Heading) => {})
// $ExpectError
visit(sampleTree, {type: 'element'}, (node: Heading) => {})
// $ExpectError
visit(sampleTree, {type: 'heading', depth: '2'}, (node: Heading) => {})

visit(sampleTree, {type: 'element'}, (node: Element) => {})
visit(sampleTree, {type: 'element', tagName: 'section'}, (node: Element) => {})
// $ExpectError
visit(sampleTree, {type: 'heading'}, (node: Element) => {})
// $ExpectError
visit(sampleTree, {type: 'element', tagName: true}, (node: Element) => {})

/*=== visit with function test ===*/
visit(sampleTree, headingTest, (node) => {})
visit(sampleTree, headingTest, (node: Heading) => {})
// $ExpectError
visit(sampleTree, headingTest, (node: Element) => {})

visit(sampleTree, elementTest, (node) => {})
visit(sampleTree, elementTest, (node: Element) => {})
// $ExpectError
visit(sampleTree, elementTest, (node: Heading) => {})

/*=== visit with array of tests ===*/
visit(
  sampleTree,
  ['ParagraphNode', {type: 'element'}, headingTest],
  (node) => {}
)

/*=== visit returns action ===*/
visit(sampleTree, 'heading', (node) => visit.CONTINUE)
visit(sampleTree, 'heading', (node) => visit.EXIT)
visit(sampleTree, 'heading', (node) => visit.SKIP)
visit(sampleTree, 'heading', (node) => true)
visit(sampleTree, 'heading', (node) => false)
visit(sampleTree, 'heading', (node) => 'skip')
// $ExpectError
visit(sampleTree, 'heading', (node) => 'random')

/*=== visit returns index ===*/
visit(sampleTree, 'heading', (node) => 0)
visit(sampleTree, 'heading', (node) => 1)

/*=== visit returns tuple ===*/
visit(sampleTree, 'heading', (node) => [visit.CONTINUE, 1])
visit(sampleTree, 'heading', (node) => [visit.EXIT, 1])
visit(sampleTree, 'heading', (node) => [visit.SKIP, 1])
visit(sampleTree, 'heading', (node) => [true, 1])
visit(sampleTree, 'heading', (node) => [false, 1])
visit(sampleTree, 'heading', (node) => ['skip', 1])
// $ExpectError
visit(sampleTree, 'heading', (node) => ['skip'])
// $ExpectError
visit(sampleTree, 'heading', (node) => [1])
// $ExpectError
visit(sampleTree, 'heading', (node) => ['random', 1])

/*=== usage as unified plugin ===*/
unified().use(() => (sampleTree) => {
  // duplicates the above type tests but passes in the unified transformer input

  /*=== constants ===*/
  const cont: visit.Continue = visit.CONTINUE
  const skip: visit.Skip = visit.SKIP
  const exit: visit.Exit = visit.EXIT

  /*=== missing params ===*/
  // $ExpectError
  visit()
  // $ExpectError
  visit(sampleTree)

  /*=== visit without test ===*/
  visit(sampleTree, (node) => {})
  visit(sampleTree, (node: Node) => {})
  // $ExpectError
  visit(sampleTree, (node: Element) => {})
  // $ExpectError
  visit(sampleTree, (node: Heading) => {})

  /*=== visit with type test ===*/
  visit(sampleTree, 'heading', (node) => {})
  visit(sampleTree, 'heading', (node: Heading) => {})
  // $ExpectError
  visit(sampleTree, 'not-a-heading', (node: Heading) => {})
  // $ExpectError
  visit(sampleTree, 'element', (node: Heading) => {})

  visit(sampleTree, 'element', (node) => {})
  visit(sampleTree, 'element', (node: Element) => {})
  // $ExpectError
  visit(sampleTree, 'not-an-element', (node: Element) => {})
  // $ExpectError
  visit(sampleTree, 'heading', (node: Element) => {})

  /*=== visit with object test ===*/
  visit(sampleTree, {type: 'heading'}, (node) => {})
  visit(sampleTree, {random: 'property'}, (node) => {})

  visit(sampleTree, {type: 'heading'}, (node: Heading) => {})
  visit(sampleTree, {type: 'heading', depth: 2}, (node: Heading) => {})
  // $ExpectError
  visit(sampleTree, {type: 'element'}, (node: Heading) => {})
  // $ExpectError
  visit(sampleTree, {type: 'heading', depth: '2'}, (node: Heading) => {})

  visit(sampleTree, {type: 'element'}, (node: Element) => {})
  visit(
    sampleTree,
    {type: 'element', tagName: 'section'},
    (node: Element) => {}
  )
  // $ExpectError
  visit(sampleTree, {type: 'heading'}, (node: Element) => {})
  // $ExpectError
  visit(sampleTree, {type: 'element', tagName: true}, (node: Element) => {})

  /*=== visit with function test ===*/
  visit(sampleTree, headingTest, (node) => {})
  visit(sampleTree, headingTest, (node: Heading) => {})
  // $ExpectError
  visit(sampleTree, headingTest, (node: Element) => {})

  visit(sampleTree, elementTest, (node) => {})
  visit(sampleTree, elementTest, (node: Element) => {})
  // $ExpectError
  visit(sampleTree, elementTest, (node: Heading) => {})

  /*=== visit with array of tests ===*/
  visit(
    sampleTree,
    ['ParagraphNode', {type: 'element'}, headingTest],
    (node) => {}
  )

  /*=== visit returns action ===*/
  visit(sampleTree, 'heading', (node) => visit.CONTINUE)
  visit(sampleTree, 'heading', (node) => visit.EXIT)
  visit(sampleTree, 'heading', (node) => visit.SKIP)
  visit(sampleTree, 'heading', (node) => true)
  visit(sampleTree, 'heading', (node) => false)
  visit(sampleTree, 'heading', (node) => 'skip')
  // $ExpectError
  visit(sampleTree, 'heading', (node) => 'random')

  /*=== visit returns index ===*/
  visit(sampleTree, 'heading', (node) => 0)
  visit(sampleTree, 'heading', (node) => 1)

  /*=== visit returns tuple ===*/
  visit(sampleTree, 'heading', (node) => [visit.CONTINUE, 1])
  visit(sampleTree, 'heading', (node) => [visit.EXIT, 1])
  visit(sampleTree, 'heading', (node) => [visit.SKIP, 1])
  visit(sampleTree, 'heading', (node) => [true, 1])
  visit(sampleTree, 'heading', (node) => [false, 1])
  visit(sampleTree, 'heading', (node) => ['skip', 1])
  // $ExpectError
  visit(sampleTree, 'heading', (node) => ['skip'])
  // $ExpectError
  visit(sampleTree, 'heading', (node) => [1])
  // $ExpectError
  visit(sampleTree, 'heading', (node) => ['random', 1])

  return sampleTree
})
