/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('unist').Parent} Parent
 *
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('hast').Text} HastText
 */

import path from 'node:path'
import assert from 'node:assert/strict'
import test from 'node:test'
import stripAnsi from 'strip-ansi'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {gfm} from 'micromark-extension-gfm'
import {gfmFromMarkdown} from 'mdast-util-gfm'
import {visitParents, EXIT, SKIP, CONTINUE} from './index.js'
import * as mod from './index.js'

const tree = fromMarkdown('Some _emphasis_, **importance**, and `code`.')
const paragraph = tree.children[0]
assert(paragraph.type === 'paragraph')
const emphasis = paragraph.children[1]
assert(emphasis.type === 'emphasis')
const strong = paragraph.children[3]
assert(strong.type === 'strong')

const textNodes = 6

const stopIndex = 5
const skipIndex = 7
const skipReverseIndex = 6

const types = [
  'root', // []
  'paragraph', // [tree]
  'text', // [tree, paragraph]
  'emphasis', // [tree, paragraph]
  'text', // [tree, paragraph, emphasis]
  'text', // [tree, paragraph]
  'strong', // [tree, paragraph]
  'text', // [tree, paragraph, strong]
  'text', // [tree, paragraph]
  'inlineCode', // [tree, paragraph]
  'text' // [tree, paragraph]
]

const reverseTypes = [
  'root',
  'paragraph',
  'text',
  'inlineCode',
  'text',
  'strong',
  'text',
  'text',
  'emphasis',
  'text',
  'text'
]

/** @type {Array<Array<Parent>>} */
const ancestors = [
  [],
  [tree],
  [tree, paragraph],
  [tree, paragraph],
  [tree, paragraph, emphasis],
  [tree, paragraph],
  [tree, paragraph],
  [tree, paragraph, strong],
  [tree, paragraph],
  [tree, paragraph],
  [tree, paragraph]
]

/** @type {Array<Array<Parent>>} */
const textAncestors = [
  [tree, paragraph],
  [tree, paragraph, emphasis],
  [tree, paragraph],
  [tree, paragraph, strong],
  [tree, paragraph],
  [tree, paragraph]
]

test('visitParents', async (t) => {
  assert.deepEqual(
    Object.keys(mod).sort(),
    ['CONTINUE', 'EXIT', 'SKIP', 'visitParents'],
    'should expose the public api'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime
      visitParents()
    },
    /TypeError: visitor is not a function/,
    'should fail without tree'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime
      visitParents(tree)
    },
    /TypeError: visitor is not a function/,
    'should fail without visitor'
  )

  await t.test('should iterate over all nodes', () => {
    let n = 0

    visitParents(tree, visitor)

    assert.equal(n, types.length, 'should visit all nodes')

    /**
     * @param {Node} node
     * @param {Array<Parent>} parents
     */
    function visitor(node, parents) {
      assert.strictEqual(node.type, types[n], 'should be the expected type')
      assert.deepStrictEqual(
        parents,
        ancestors[n],
        'should have expected parents'
      )
      n++
    }
  })

  await t.test('should iterate over all nodes, backwards', () => {
    let n = 0

    visitParents(tree, visitor, true)

    assert.equal(n, reverseTypes.length, 'should visit all nodes in reverse')

    /**
     * @param {Node} node
     */
    function visitor(node) {
      assert.strictEqual(
        node.type,
        reverseTypes[n],
        'should be the expected type'
      )
      n++
    }
  })

  await t.test('should only visit a given `type`', () => {
    let n = 0

    visitParents(tree, 'text', visitor)

    assert.equal(n, textNodes, 'should visit all nodes')

    /**
     * @param {Node} node
     * @param {Array<Parent>} parents
     */
    function visitor(node, parents) {
      assert.strictEqual(node.type, 'text')
      assert.deepStrictEqual(parents, textAncestors[n])
      n++
    }
  })

  await t.test('should only visit given `type`s', () => {
    const types = ['text', 'inlineCode']
    let n = 0

    visitParents(tree, types, visitor)

    assert.equal(n, 7, 'should visit all matching nodes')

    /**
     * @param {Node} node
     */
    function visitor(node) {
      assert.notStrictEqual(types.indexOf(node.type), -1, 'should match')
      n++
    }
  })

  await t.test('should accept any `is`-compatible test function', () => {
    let n = 0
    /** @type {Array<Node>} */
    const nodes = [
      paragraph.children[4],
      paragraph.children[5],
      paragraph.children[6]
    ]

    visitParents(
      tree,
      (_, index) => typeof index === 'number' && index > 3,
      visitor
    )

    assert.equal(n, 3, 'should visit all passing nodes')

    /**
     * @param {Node} node
     * @param {Array<Parent>} parents
     */
    function visitor(node, parents) {
      const parent = parents[parents.length - 1]
      const index = parent ? parent.children.indexOf(node) : null
      const info = '(' + (parent && parent.type) + ':' + index + ')'
      assert.strictEqual(node, nodes[n], 'should be a requested node ' + info)
      n++
    }
  })

  await t.test('should accept an array of `is`-compatible tests', () => {
    const expected = new Set(['root', 'paragraph', 'emphasis', 'strong'])
    const tests = [test, 'paragraph', {value: '.'}, 'emphasis', 'strong']
    let n = 0

    visitParents(tree, tests, visitor)

    assert.equal(n, 5, 'should visit all passing nodes')

    /**
     * @param {Node} node
     */
    function visitor(node) {
      // @ts-expect-error: hush.
      const ok = expected.has(node.type) || node.value === '.'
      assert.ok(ok, 'should be a requested type: ' + node.type)
      n++
    }

    /**
     * @param {Node} node
     */
    function test(node) {
      return node.type === 'root'
    }
  })

  await t.test('should stop if `visitor` stops', () => {
    let n = -1

    visitParents(tree, visitor)

    assert.equal(n, stopIndex, 'should visit nodes until `EXIT` is given')

    /**
     * @param {Node} node
     */
    function visitor(node) {
      assert.strictEqual(node.type, types[++n])
      return n === stopIndex ? EXIT : CONTINUE
    }
  })

  await t.test('should stop if `visitor` stops (tuple)', () => {
    let n = -1

    visitParents(tree, visitor)

    assert.equal(n, stopIndex, 'should visit nodes until `EXIT` is given')

    /**
     * @param {Node} node
     * @returns {[boolean]}
     */
    function visitor(node) {
      assert.strictEqual(node.type, types[++n])
      return [n === stopIndex ? EXIT : CONTINUE]
    }
  })

  await t.test('should stop if `visitor` stops, backwards', () => {
    let n = 0

    visitParents(tree, visitor, true)

    assert.equal(n, stopIndex, 'should visit nodes until `EXIT` is given')

    /**
     * @param {Node} node
     */
    function visitor(node) {
      assert.strictEqual(
        node.type,
        reverseTypes[n++],
        'should be the expected type'
      )
      return n === stopIndex ? EXIT : CONTINUE
    }
  })

  await t.test('should skip if `visitor` skips', () => {
    let n = 0
    let count = 0

    visitParents(tree, visitor)

    assert.equal(
      count,
      types.length - 1,
      'should visit nodes except when `SKIP` is given'
    )

    /**
     * @param {Node} node
     * @returns {'skip'|void}
     */
    function visitor(node) {
      assert.strictEqual(node.type, types[n++], 'should be the expected type')
      count++

      if (n === skipIndex) {
        n++ // The one node inside it.
        return SKIP
      }
    }
  })

  await t.test('should skip if `visitor` skips (tuple)', () => {
    let n = 0
    let count = 0

    visitParents(tree, visitor)

    assert.equal(
      count,
      types.length - 1,
      'should visit nodes except when `SKIP` is given'
    )

    /**
     * @param {Node} node
     * @returns {['skip']|void}
     */
    function visitor(node) {
      assert.strictEqual(node.type, types[n++], 'should be the expected type')
      count++

      if (n === skipIndex) {
        n++ // The one node inside it.
        return [SKIP]
      }
    }
  })

  await t.test('should skip if `visitor` skips, backwards', () => {
    let n = 0
    let count = 0

    visitParents(tree, visitor, true)

    assert.equal(
      count,
      reverseTypes.length - 1,
      'should visit nodes except when `SKIP` is given'
    )

    /**
     * @param {Node} node
     * @returns {'skip'|void}
     */
    function visitor(node) {
      assert.strictEqual(
        node.type,
        reverseTypes[n++],
        'should be the expected type'
      )
      count++

      if (n === skipReverseIndex) {
        n++ // The one node inside it.
        return SKIP
      }
    }
  })

  await t.test(
    'should support a given `index` to iterate over next (`0` to reiterate)',
    () => {
      let n = 0
      let again = false
      const expected = [
        'root',
        'paragraph',
        'text',
        'emphasis',
        'text',
        'text',
        'strong',
        'text',
        'text', // Again.
        'emphasis',
        'text',
        'text',
        'strong',
        'text',
        'text',
        'inlineCode',
        'text'
      ]

      visitParents(tree, visitor)

      assert.equal(n, expected.length, 'should visit nodes again')

      /**
       * @param {Node} node
       */
      function visitor(node) {
        assert.strictEqual(
          node.type,
          expected[n++],
          'should be the expected type'
        )

        if (again === false && node.type === 'strong') {
          again = true
          return 0 // Start over.
        }
      }
    }
  )

  await t.test(
    'should support a given `index` to iterate over next (`children.length` to skip further children)',
    () => {
      let n = 0
      let again = false
      const expected = [
        'root',
        'paragraph',
        'text',
        'emphasis',
        'text',
        'text',
        'strong', // Skip here. */
        'text'
      ]

      visitParents(tree, visitor)

      assert.equal(n, expected.length, 'should skip nodes')

      /**
       * @param {Node} node
       * @param {Array<Parent>} parents
       */
      function visitor(node, parents) {
        const parent = parents[parents.length - 1]

        assert.strictEqual(
          node.type,
          expected[n++],
          'should be the expected type'
        )

        if (again === false && node.type === 'strong') {
          again = true
          return parent.children.length // Skip siblings.
        }
      }
    }
  )

  await t.test(
    'should support any other given `index` to iterate over next',
    () => {
      let n = 0
      let again = false
      const expected = [
        'root',
        'paragraph',
        'text',
        'emphasis',
        'text',
        'text',
        'strong',
        'text',
        'inlineCode', // Skip to here.
        'text'
      ]

      visitParents(tree, visitor)

      assert.equal(n, expected.length, 'should skip nodes')

      /**
       * @param {Node} node
       * @param {Array<Parent>} parents
       */
      function visitor(node, parents) {
        const parent = parents[parents.length - 1]
        const index = parent ? parent.children.indexOf(node) : undefined

        assert.strictEqual(
          node.type,
          expected[n++],
          'should be the expected type'
        )

        if (index !== undefined && again === false && node.type === 'strong') {
          again = true
          return index + 2 // Skip to `inlineCode`.
        }
      }
    }
  )

  await t.test(
    'should support any other given `index` to iterate over next (tuple)',
    () => {
      let n = 0
      let again = false
      const expected = [
        'root',
        'paragraph',
        'text',
        'emphasis',
        'text',
        'text',
        'strong',
        'text',
        'inlineCode', // Skip to here.
        'text'
      ]

      visitParents(tree, visitor)

      assert.equal(n, expected.length, 'should skip nodes')

      /**
       * @param {Node} node
       * @param {Array<Parent>} parents
       * @returns {[null, number]|void}
       */
      function visitor(node, parents) {
        const parent = parents[parents.length - 1]
        const index = parent ? parent.children.indexOf(node) : undefined

        assert.strictEqual(
          node.type,
          expected[n++],
          'should be the expected type'
        )

        if (index !== undefined && again === false && node.type === 'strong') {
          again = true
          return [null, index + 2] // Skip to `inlineCode`.
        }
      }
    }
  )

  await t.test('should visit added nodes', () => {
    const tree = fromMarkdown('Some _emphasis_, **importance**, and `code`.')
    const other = fromMarkdown('Another ~~sentence~~.', {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()]
    }).children[0]
    const l = types.length + 5 // (p, text, delete, text, text)
    let n = 0

    visitParents(tree, visitor)

    assert.equal(n, l, 'should walk over all nodes')

    /**
     * @param {Node} _
     * @param {Array<Parent>} parents
     */
    function visitor(_, parents) {
      n++

      if (n === 2) {
        parents[parents.length - 1].children.push(other)
      }
    }
  })

  await t.test('should recurse into a bazillion nodes', () => {
    const expected = 6000
    const tree = fromMarkdown(
      Array.from({length: expected / 4}).join('* 1. ') + 'asd'
    )
    let n = 1

    visitParents(tree, visitor)

    assert.equal(n, expected, 'should walk over all nodes')

    function visitor() {
      n++
    }
  })

  await t.test('should add a pretty stack', () => {
    const source = new RegExp(
      '\\([^)]+\\' + path.sep + '(\\w+.js):\\d+:\\d+\\)',
      'g'
    )
    /** @type {HastRoot} */
    const tree = {
      type: 'root',
      children: [
        {
          // A hast-like node.
          type: 'element',
          tagName: 'div',
          children: [
            {
              type: 'element',
              // @ts-expect-error: A xast-like node.
              name: 'xml',
              children: [{type: 'text', value: 'Oh no!'}]
            }
          ]
        }
      ]
    }
    /** @type {Error|undefined} */
    let exception

    try {
      visitParents(tree, 'text', fail)
    } catch (error) {
      const _error = /** @type {Error} */ (error)
      exception = _error
    }

    assert.equal(
      stripAnsi((exception || {stack: ''}).stack || '')
        .replace(source, '($1:1:1)')
        .split('\n')
        .slice(0, 7)
        .join('\n'),
      [
        'Error: Oh no!',
        '    at fail (test.js:1:1)',
        '    at node (text) (index.js:1:1)',
        '    at node (element<xml>) (index.js:1:1)',
        '    at node (element<div>) (index.js:1:1)',
        '    at node (root) (index.js:1:1)',
        '    at visitParents (index.js:1:1)'
      ].join('\n'),
      'should provide a useful stack trace'
    )

    /**
     * @param {HastText} node
     */
    function fail(node) {
      throw new Error(node.value)
    }
  })
})
