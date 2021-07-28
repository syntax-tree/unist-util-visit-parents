/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('unist').Parent} Parent
 *
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast').Text} Text
 *
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('hast').Text} HastText
 */

import path from 'node:path'
import assert from 'node:assert'
import strip from 'strip-ansi'
import test from 'tape'
import remark from 'remark'
import gfm from 'remark-gfm'
import {visitParents, EXIT, SKIP, CONTINUE} from './index.js'

/** @type {Root} */
// @ts-expect-error: return type is known to be `Root`.
const tree = remark().parse('Some _emphasis_, **importance**, and `code`.')
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

/** @type {Array.<Array.<Parent>>} */
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

/** @type {Array.<Array.<Parent>>} */
const textAncestors = [
  [tree, paragraph],
  [tree, paragraph, emphasis],
  [tree, paragraph],
  [tree, paragraph, strong],
  [tree, paragraph],
  [tree, paragraph]
]

test('unist-util-visit-parents', (t) => {
  t.throws(
    () => {
      // @ts-expect-error runtime
      visitParents()
    },
    /TypeError: visitor is not a function/,
    'should fail without tree'
  )

  t.throws(
    () => {
      // @ts-expect-error runtime
      visitParents(tree)
    },
    /TypeError: visitor is not a function/,
    'should fail without visitor'
  )

  t.test('should iterate over all nodes', (t) => {
    let n = 0

    visitParents(tree, visitor)

    t.equal(n, types.length, 'should visit all nodes')

    t.end()

    /**
     * @param {Node} node
     * @param {Array.<Parent>} parents
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

  t.test('should iterate over all nodes, backwards', (t) => {
    let n = 0

    visitParents(tree, visitor, true)

    t.equal(n, reverseTypes.length, 'should visit all nodes in reverse')

    t.end()

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

  t.test('should only visit a given `type`', (t) => {
    let n = 0

    visitParents(tree, 'text', visitor)

    t.equal(n, textNodes, 'should visit all nodes')

    t.end()

    /**
     * @param {Node} node
     * @param {Array.<Parent>} parents
     */
    function visitor(node, parents) {
      assert.strictEqual(node.type, 'text')
      assert.deepStrictEqual(parents, textAncestors[n])
      n++
    }
  })

  t.test('should only visit given `type`s', (t) => {
    const types = ['text', 'inlineCode']
    let n = 0

    visitParents(tree, types, visitor)

    t.equal(n, 7, 'should visit all matching nodes')

    t.end()

    /**
     * @param {Node} node
     */
    function visitor(node) {
      assert.notStrictEqual(types.indexOf(node.type), -1, 'should match')
      n++
    }
  })

  t.test('should accept any `is`-compatible test function', (t) => {
    let n = 0
    /** @type {Array.<Node>} */
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

    t.equal(n, 3, 'should visit all passing nodes')

    t.end()

    /**
     * @param {Node} node
     * @param {Array.<Parent>} parents
     */
    function visitor(node, parents) {
      const parent = parents[parents.length - 1]
      const index = parent ? parent.children.indexOf(node) : null
      const info = '(' + (parent && parent.type) + ':' + index + ')'
      assert.strictEqual(node, nodes[n], 'should be a requested node ' + info)
      n++
    }
  })

  t.test('should accept an array of `is`-compatible tests', (t) => {
    const expected = new Set(['root', 'paragraph', 'emphasis', 'strong'])
    const tests = [test, 'paragraph', {value: '.'}, 'emphasis', 'strong']
    let n = 0

    visitParents(tree, tests, visitor)

    t.equal(n, 5, 'should visit all passing nodes')

    t.end()

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

  t.test('should stop if `visitor` stops', (t) => {
    let n = -1

    visitParents(tree, visitor)

    t.equal(n, stopIndex, 'should visit nodes until `EXIT` is given')

    t.end()

    /**
     * @param {Node} node
     */
    function visitor(node) {
      assert.strictEqual(node.type, types[++n])
      return n === stopIndex ? EXIT : CONTINUE
    }
  })

  t.test('should stop if `visitor` stops (tuple)', (t) => {
    let n = -1

    visitParents(tree, visitor)

    t.equal(n, stopIndex, 'should visit nodes until `EXIT` is given')

    t.end()

    /**
     * @param {Node} node
     * @returns {[boolean]}
     */
    function visitor(node) {
      assert.strictEqual(node.type, types[++n])
      return [n === stopIndex ? EXIT : CONTINUE]
    }
  })

  t.test('should stop if `visitor` stops, backwards', (t) => {
    let n = 0

    visitParents(tree, visitor, true)

    t.equal(n, stopIndex, 'should visit nodes until `EXIT` is given')

    t.end()

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

  t.test('should skip if `visitor` skips', (t) => {
    let n = 0
    let count = 0

    visitParents(tree, visitor)

    t.equal(
      count,
      types.length - 1,
      'should visit nodes except when `SKIP` is given'
    )

    t.end()

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

  t.test('should skip if `visitor` skips (tuple)', (t) => {
    let n = 0
    let count = 0

    visitParents(tree, visitor)

    t.equal(
      count,
      types.length - 1,
      'should visit nodes except when `SKIP` is given'
    )

    t.end()

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

  t.test('should skip if `visitor` skips, backwards', (t) => {
    let n = 0
    let count = 0

    visitParents(tree, visitor, true)

    t.equal(
      count,
      reverseTypes.length - 1,
      'should visit nodes except when `SKIP` is given'
    )

    t.end()

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

  t.test(
    'should support a given `index` to iterate over next (`0` to reiterate)',
    (t) => {
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

      t.equal(n, expected.length, 'should visit nodes again')

      t.end()

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

  t.test(
    'should support a given `index` to iterate over next (`children.length` to skip further children)',
    (t) => {
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

      t.equal(n, expected.length, 'should skip nodes')

      t.end()

      /**
       * @param {Node} node
       * @param {Array.<Parent>} parents
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

  t.test('should support any other given `index` to iterate over next', (t) => {
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

    t.equal(n, expected.length, 'should skip nodes')

    t.end()

    /**
     * @param {Node} node
     * @param {Array.<Parent>} parents
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
  })

  t.test(
    'should support any other given `index` to iterate over next (tuple)',
    (t) => {
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

      t.equal(n, expected.length, 'should skip nodes')

      t.end()

      /**
       * @param {Node} node
       * @param {Array.<Parent>} parents
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

  t.test('should visit added nodes', (t) => {
    const tree = remark().parse('Some _emphasis_, **importance**, and `code`.')
    // @ts-expect-error: hush.
    const other = remark().use(gfm).parse('Another ~~sentence~~.').children[0]
    const l = types.length + 5 // (p, text, delete, text, text)
    let n = 0

    visitParents(tree, visitor)

    t.equal(n, l, 'should walk over all nodes')

    t.end()

    /**
     * @param {Node} _
     * @param {Array.<Parent>} parents
     */
    function visitor(_, parents) {
      n++

      if (n === 2) {
        parents[parents.length - 1].children.push(other)
      }
    }
  })

  t.test('should recurse into a bazillion nodes', (t) => {
    const expected = 6000
    const tree = remark().parse(
      Array.from({length: expected / 4}).join('* 1. ') + 'asd'
    )
    let n = 1

    visitParents(tree, visitor)

    t.equal(n, expected, 'should walk over all nodes')

    t.end()

    function visitor() {
      n++
    }
  })

  t.test('should add a pretty stack', (t) => {
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
      exception = error
    }

    t.equal(
      strip((exception || {stack: ''}).stack || '')
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

    t.end()

    /**
     * @param {HastText} node
     */
    function fail(node) {
      throw new Error(node.value)
    }
  })

  t.end()
})
