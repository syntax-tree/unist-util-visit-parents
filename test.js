/**
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('mdast').Parents} Parents
 * @typedef {import('mdast').PhrasingContent} PhrasingContent
 * @typedef {import('mdast').Root} Root
 * @typedef {import('xast').Root} XastRoot
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import stripAnsi from 'strip-ansi'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {gfmFromMarkdown} from 'mdast-util-gfm'
import {gfm} from 'micromark-extension-gfm'
import {EXIT, SKIP, CONTINUE, visitParents} from 'unist-util-visit-parents'

// To do: remove cast when `mdast-util-from-markdown` is updated.
const tree = /** @type {Root} */ (
  fromMarkdown('Some _emphasis_, **importance**, and `code`.')
)
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

/** @type {Array<Array<Parents>>} */
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

/** @type {Array<Array<Parents>>} */
const textAncestors = [
  [tree, paragraph],
  [tree, paragraph, emphasis],
  [tree, paragraph],
  [tree, paragraph, strong],
  [tree, paragraph],
  [tree, paragraph]
]

test('visitParents', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(
      Object.keys(await import('unist-util-visit-parents')).sort(),
      ['CONTINUE', 'EXIT', 'SKIP', 'visitParents']
    )
  })

  await t.test('should fail without tree', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws an error.
      visitParents()
    }, /TypeError: visitor is not a function/)
  })

  await t.test('should fail without visitor', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws an error.
      visitParents(tree)
    }, /TypeError: visitor is not a function/)
  })

  await t.test('should iterate over all nodes', function () {
    let n = 0

    visitParents(tree, function (node, parents) {
      assert.strictEqual(node.type, types[n], 'should be the expected type')
      assert.deepStrictEqual(
        parents,
        ancestors[n],
        'should have expected parents'
      )
      n++
    })

    assert.equal(n, types.length, 'should visit all nodes')
  })

  await t.test('should iterate over all nodes, backwards', function () {
    let n = 0

    visitParents(
      tree,
      function (node) {
        assert.strictEqual(
          node.type,
          reverseTypes[n],
          'should be the expected type'
        )
        n++
      },
      true
    )

    assert.equal(n, reverseTypes.length, 'should visit all nodes in reverse')
  })

  await t.test('should only visit a given `type`', function () {
    let n = 0

    visitParents(tree, 'text', function (node, parents) {
      assert.strictEqual(node.type, 'text')
      assert.deepStrictEqual(parents, textAncestors[n])
      n++
    })

    assert.equal(n, textNodes, 'should visit all nodes')
  })

  await t.test('should only visit given `type`s', function () {
    const types = ['text', 'inlineCode']
    let n = 0

    visitParents(tree, types, function (node) {
      assert.notStrictEqual(types.indexOf(node.type), -1, 'should match')
      n++
    })

    assert.equal(n, 7, 'should visit all matching nodes')
  })

  await t.test('should accept any `is`-compatible test function', function () {
    let n = 0
    /** @type {Array<PhrasingContent>} */
    const nodes = [
      paragraph.children[4],
      paragraph.children[5],
      paragraph.children[6]
    ]

    visitParents(
      tree,
      function (_, index) {
        return typeof index === 'number' && index > 3
      },
      /**
       * @returns {undefined}
       */
      function (node, parents) {
        const parent = parents[parents.length - 1]
        // @ts-expect-error: `node` can always be inside parent.
        const index = parent ? parent.children.indexOf(node) : undefined
        const info = '(' + (parent && parent.type) + ':' + index + ')'
        assert.strictEqual(node, nodes[n], 'should be a requested node ' + info)
        n++
      }
    )

    assert.equal(n, 3, 'should visit all passing nodes')
  })

  await t.test('should accept an array of `is`-compatible tests', function () {
    const expected = new Set(['root', 'paragraph', 'emphasis', 'strong'])
    let n = 0

    visitParents(
      tree,
      [
        function (node) {
          return node.type === 'root'
        },
        'paragraph',
        {value: '.'},
        'emphasis',
        'strong'
      ],
      function (node) {
        const ok =
          expected.has(node.type) || ('value' in node && node.value === '.')
        assert.ok(ok, 'should be a requested type: ' + node.type)
        n++
      }
    )

    assert.equal(n, 5, 'should visit all passing nodes')
  })

  await t.test('should stop if `visitor` stops', function () {
    let n = -1

    visitParents(tree, function (node) {
      assert.strictEqual(node.type, types[++n])
      return n === stopIndex ? EXIT : CONTINUE
    })

    assert.equal(n, stopIndex, 'should visit nodes until `EXIT` is given')
  })

  await t.test('should stop if `visitor` stops (tuple)', function () {
    let n = -1

    visitParents(tree, function (node) {
      assert.strictEqual(node.type, types[++n])
      return [n === stopIndex ? EXIT : CONTINUE]
    })

    assert.equal(n, stopIndex, 'should visit nodes until `EXIT` is given')
  })

  await t.test('should stop if `visitor` stops, backwards', function () {
    let n = 0

    visitParents(
      tree,
      function (node) {
        assert.strictEqual(
          node.type,
          reverseTypes[n++],
          'should be the expected type'
        )
        return n === stopIndex ? EXIT : CONTINUE
      },
      true
    )

    assert.equal(n, stopIndex, 'should visit nodes until `EXIT` is given')
  })

  await t.test('should skip if `visitor` skips', function () {
    let n = 0
    let count = 0

    visitParents(tree, function (node) {
      assert.strictEqual(node.type, types[n++], 'should be the expected type')
      count++

      if (n === skipIndex) {
        n++ // The one node inside it.
        return SKIP
      }
    })

    assert.equal(
      count,
      types.length - 1,
      'should visit nodes except when `SKIP` is given'
    )
  })

  await t.test('should skip if `visitor` skips (tuple)', function () {
    let n = 0
    let count = 0

    visitParents(tree, function (node) {
      assert.strictEqual(node.type, types[n++], 'should be the expected type')
      count++

      if (n === skipIndex) {
        n++ // The one node inside it.
        return [SKIP]
      }
    })

    assert.equal(
      count,
      types.length - 1,
      'should visit nodes except when `SKIP` is given'
    )
  })

  await t.test('should skip if `visitor` skips, backwards', function () {
    let n = 0
    let count = 0

    visitParents(
      tree,
      function (node) {
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
      },
      true
    )

    assert.equal(
      count,
      reverseTypes.length - 1,
      'should visit nodes except when `SKIP` is given'
    )
  })

  await t.test(
    'should support a given `index` to iterate over next (`0` to reiterate)',
    function () {
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

      visitParents(tree, function (node) {
        assert.strictEqual(
          node.type,
          expected[n++],
          'should be the expected type'
        )

        if (again === false && node.type === 'strong') {
          again = true
          return 0 // Start over.
        }
      })

      assert.equal(n, expected.length, 'should visit nodes again')
    }
  )

  await t.test(
    'should support a given `index` to iterate over next (`children.length` to skip further children)',
    function () {
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

      visitParents(tree, function (node, parents) {
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
      })

      assert.equal(n, expected.length, 'should skip nodes')
    }
  )

  await t.test(
    'should support any other given `index` to iterate over next',
    function () {
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

      visitParents(tree, function (node, parents) {
        const parent = parents[parents.length - 1]
        // @ts-expect-error: `node` can always be inside parent.
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
      })

      assert.equal(n, expected.length, 'should skip nodes')
    }
  )

  await t.test(
    'should support any other given `index` to iterate over next (tuple)',
    function () {
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

      visitParents(tree, function (node, parents) {
        const parent = parents[parents.length - 1]
        // @ts-expect-error: `node` can always be inside parent.
        const index = parent ? parent.children.indexOf(node) : undefined

        assert.strictEqual(
          node.type,
          expected[n++],
          'should be the expected type'
        )

        if (index !== undefined && again === false && node.type === 'strong') {
          again = true
          return [undefined, index + 2] // Skip to `inlineCode`.
        }
      })

      assert.equal(n, expected.length, 'should skip nodes')
    }
  )

  await t.test('should visit added nodes', function () {
    const tree = fromMarkdown('Some _emphasis_, **importance**, and `code`.')
    const other = fromMarkdown('Another ~~sentence~~.', {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()]
    }).children[0]
    const l = types.length + 5 // (p, text, delete, text, text)
    let n = 0

    visitParents(tree, function (_, parents) {
      n++

      if (n === 2) {
        const parent = parents[parents.length - 1]
        assert(parent.type === 'root')
        parent.children.push(other)
      }
    })

    assert.equal(n, l, 'should walk over all nodes')
  })

  await t.test('should recurse into a bazillion nodes', function () {
    const expected = 6000
    const tree = fromMarkdown(
      Array.from({length: expected / 4}).join('* 1. ') + 'asd'
    )
    let n = 1

    visitParents(tree, function () {
      n++
    })

    assert.equal(n, expected, 'should walk over all nodes')
  })

  await t.test('should add a pretty stack (hast)', function () {
    /** @type {HastRoot} */
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {},
          children: [{type: 'text', value: 'Oh no!'}]
        }
      ]
    }
    /** @type {string} */
    let message = ''

    try {
      visitParents(tree, 'text', function (node) {
        throw new Error(node.value)
      })
    } catch (error) {
      message = String(
        error && typeof error === 'object' && 'stack' in error
          ? error.stack
          : error
      )
    }

    const stack = stripAnsi(message)
      .replace(/[-\w:\\/]+[\\/](\w+.js):\d+:\d+/g, '$1:1:1')
      .split('\n')
      .slice(0, 6)
      .join('\n')

    assert.equal(
      stack,
      [
        'Error: Oh no!',
        '    at test.js:1:1',
        '    at node (text) (index.js:1:1)',
        '    at node (element<div>) (index.js:1:1)',
        '    at node (root) (index.js:1:1)',
        '    at visitParents (index.js:1:1)'
      ].join('\n'),
      'should provide a useful stack trace'
    )
  })

  await t.test('should add a pretty stack (xast)', function () {
    /** @type {XastRoot} */
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          name: 'xml',
          attributes: {},
          children: [{type: 'text', value: 'Oh no!'}]
        }
      ]
    }
    /** @type {string} */
    let message = ''

    try {
      visitParents(tree, 'text', function (node) {
        throw new Error(node.value)
      })
    } catch (error) {
      message = String(
        error && typeof error === 'object' && 'stack' in error
          ? error.stack
          : error
      )
    }

    const stack = stripAnsi(message)
      .replace(/[-\w:\\/]+[\\/](\w+.js):\d+:\d+/g, '$1:1:1')
      .split('\n')
      .slice(0, 6)
      .join('\n')

    assert.equal(
      stack,
      [
        'Error: Oh no!',
        '    at test.js:1:1',
        '    at node (text) (index.js:1:1)',
        '    at node (element<xml>) (index.js:1:1)',
        '    at node (root) (index.js:1:1)',
        '    at visitParents (index.js:1:1)'
      ].join('\n')
    )
  })
})
