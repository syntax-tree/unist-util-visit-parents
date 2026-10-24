/**
 * @import {Root as HastRoot} from 'hast'
 * @import {Nodes, Parents, PhrasingContent, Root} from 'mdast'
 * @import {Root as XastRoot} from 'xast'
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import stripAnsi from 'strip-ansi'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {gfmFromMarkdown} from 'mdast-util-gfm'
import {gfm} from 'micromark-extension-gfm'
import {EXIT, SKIP, CONTINUE, visitParents} from 'unist-util-visit-parents'

const mini = fromMarkdown('*a* b')
const tree = fromMarkdown('Some _emphasis_, **importance**, and `code`.')
const paragraph = tree.children[0]
assert.ok(paragraph.type === 'paragraph')
const emphasis = paragraph.children[1]
assert.ok(emphasis.type === 'emphasis')
const strong = paragraph.children[3]
assert.ok(strong.type === 'strong')

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

  await t.test('should fail without arguments', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws an error.
      visitParents()
    }, /Unexpected value `undefined` for `tree`, expected node/)
  })

  await t.test('should fail with tree, without visitor', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws an error.
      visitParents(tree)
    }, /Unexpected value `undefined` for `enter` or `visitors`, expected visitor or object with visitors/)
  })

  await t.test('should fail with a visitor, without tree', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws an error.
      visitParents(undefined, function () {})
    }, /Unexpected value `undefined` for `tree`, expected node/)
  })

  await t.test('should fail with an invalid visitor', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws an error.
      visitParents(tree, 1)
    }, /Unexpected value `1` for `enter` or `visitors`, expected visitor or object with visitors/)
  })

  await t.test('should fail with invalid visitors', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws an error.
      visitParents(tree, {})
    }, /Unexpected value `undefined` for `visitors.exit`, expected visitor/)
  })

  await t.test('should fail without an `exit` visitor', function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws an error.
      visitParents(mini, {enter() {}})
    }, /Unexpected value `undefined` for `visitors.exit`, expected visitor/)
  })

  await t.test(
    'should fail with an invalid `enter` visitor',
    async function () {
      assert.throws(function () {
        // @ts-expect-error: check that the runtime throws an error.
        visitParents(tree, {enter: 1, exit() {}})
      }, /Unexpected value `1` for `visitors\.enter`, expected optional visitor/)
    }
  )

  await t.test('should fail with an invalid `exit` visitor', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws an error.
      visitParents(tree, {enter() {}, exit: 1})
    }, /Unexpected value `1` for `visitors\.exit`, expected visitor \(pass a visitor directly if you only want an enter visitor\)/)
  })

  await t.test(
    'should fail with a test but without visitor',
    async function () {
      assert.throws(function () {
        // @ts-expect-error: check that the runtime throws an error.
        visitParents(tree, 'text')
      }, /Unexpected value `text` for `enter` or `visitors`, expected visitor or object with visitors/)
    }
  )

  await t.test('should fail on an invalid child', async function () {
    assert.throws(function () {
      visitParents({type: 'root', children: [null]}, function () {})
    }, /Cannot use 'in' operator to search for 'children' in null/)
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

  await t.test('should support a test and `reverse`', function () {
    /** @type {Array<string>} */
    const values = []

    visitParents(
      tree,
      'text',
      function (node) {
        values.push(node.value)
      },
      true
    )

    assert.deepEqual(values, [
      '.',
      ', and ',
      'importance',
      ', ',
      'emphasis',
      'Some '
    ])
  })

  await t.test('should pass `index`', function () {
    /** @type {Array<number | undefined>} */
    const expected = []
    /** @type {Array<number | undefined>} */
    const actual = []

    visitParents(tree, function (node, parents, index) {
      /** @type {Array<Nodes> | undefined} */
      const siblings = parents[parents.length - 1]?.children
      expected.push(siblings ? siblings.indexOf(node) : undefined)
      actual.push(index)
    })

    assert.equal(actual[0], undefined)
    assert.deepEqual(actual, expected)
  })

  await t.test('should pass `index`, backwards', function () {
    /** @type {Array<number | undefined>} */
    const expected = []
    /** @type {Array<number | undefined>} */
    const actual = []

    visitParents(
      tree,
      function (node, parents, index) {
        /** @type {Array<Nodes> | undefined} */
        const siblings = parents[parents.length - 1]?.children
        expected.push(siblings ? siblings.indexOf(node) : undefined)
        actual.push(index)
      },
      true
    )

    assert.equal(actual[0], undefined)
    assert.deepEqual(actual, expected)
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
       * Check that a requested node is visited.
       *
       * @param node
       *   Visited node.
       * @param parents
       *   Ancestors of `node`.
       * @returns {undefined}
       *   Nothing.
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
        assert.ok(parent.type === 'root')
        parent.children.push(other)
      }
    })

    assert.equal(n, l, 'should walk over all nodes')
  })

  await t.test('should support `exit`', function () {
    /** @type {Array<string>} */
    const events = []

    visitParents(mini, {
      exit(node) {
        events.push('-' + node.type)
      }
    })

    assert.equal(events.join(' '), '-text -emphasis -text -paragraph -root')
  })

  await t.test('should support `exit`, backwards', function () {
    /** @type {Array<string>} */
    const events = []

    visitParents(
      mini,
      {
        exit(node) {
          events.push('-' + node.type)
        }
      },
      true
    )

    assert.equal(events.join(' '), '-text -text -emphasis -paragraph -root')
  })

  await t.test('should support `enter` and `exit`', function () {
    /** @type {Array<string>} */
    const events = []

    visitParents(mini, {
      enter(node) {
        events.push('+' + node.type)
      },
      exit(node) {
        events.push('-' + node.type)
      }
    })

    assert.equal(
      events.join(' '),
      '+root +paragraph +emphasis +text -text -emphasis +text -text -paragraph -root'
    )
  })

  await t.test(
    'should pass `parents` and `index` to `enter` and `exit`',
    function () {
      /** @type {Array<unknown>} */
      const entered = []
      /** @type {Array<unknown>} */
      const exited = []

      // Text has no children, so `exit` is immediately after `enter`.
      visitParents(mini, 'text', {
        enter(_, parents, index) {
          entered.push([parents, index])
        },
        exit(_, parents, index) {
          exited.push([parents, index])
        }
      })

      assert.equal(exited.length, 2)
      assert.deepEqual(exited, entered)
    }
  )

  await t.test(
    'should pass nodes that match `test` to `enter` and `exit`',
    function () {
      /** @type {Array<string>} */
      const events = []

      visitParents(mini, 'emphasis', {
        enter(node) {
          events.push('+' + node.type)
        },
        exit(node) {
          events.push('-' + node.type)
        }
      })

      assert.equal(events.join(' '), '+emphasis -emphasis')
    }
  )

  await t.test('should `exit` if `enter` skips it', function () {
    /** @type {Array<string>} */
    const events = []

    visitParents(mini, {
      enter(node) {
        events.push('+' + node.type)
        return node.type === 'paragraph' ? SKIP : CONTINUE
      },
      exit(node) {
        events.push('-' + node.type)
      }
    })

    assert.equal(events.join(' '), '+root +paragraph -paragraph -root')
  })

  await t.test('should not `exit` if `enter` exits', function () {
    /** @type {Array<string>} */
    const events = []

    visitParents(mini, {
      enter(node) {
        events.push('+' + node.type)
        return node.type === 'emphasis' ? EXIT : CONTINUE
      },
      exit(node) {
        events.push('-' + node.type)
      }
    })

    assert.equal(events.join(' '), '+root +paragraph +emphasis')
  })

  await t.test('should stop if `exit` exits', function () {
    /** @type {Array<string>} */
    const events = []

    visitParents(mini, {
      exit(node) {
        events.push('-' + node.type)
        return node.type === 'emphasis' ? EXIT : CONTINUE
      }
    })

    assert.equal(events.join(' '), '-text -emphasis')
  })

  await t.test('should fail on `SKIP` from `exit`', function () {
    assert.throws(function () {
      visitParents(mini, {
        // @ts-expect-error: check that the runtime throws an error.
        exit() {
          return SKIP
        }
      })
    }, /Unexpected value `skip` from `exit`, expected `CONTINUE`, `EXIT`, index, or nothing/)
  })

  await t.test('should fail on `[SKIP, index]` from `exit`', function () {
    assert.throws(function () {
      visitParents(mini, {
        // @ts-expect-error: check that the runtime throws an error.
        exit() {
          return [SKIP, 1]
        }
      })
    }, /Unexpected value `skip` from `exit`/)
  })

  await t.test(
    'should support `CONTINUE` and nothing from `exit`',
    function () {
      /** @type {Array<string>} */
      const events = []

      visitParents(mini, {
        exit(node) {
          events.push('-' + node.type)
          return node.type === 'text' ? CONTINUE : null
        }
      })

      assert.equal(events.join(' '), '-text -emphasis -text -paragraph -root')
    }
  )

  await t.test('should support an `index` from `exit`', function () {
    const tree = /** @type {Root} */ (fromMarkdown('*a* b'))
    /** @type {Array<string>} */
    const events = []

    // Unwrap emphasis after its children are walked.
    visitParents(tree, {
      enter(node) {
        events.push('+' + node.type)
      },
      exit(node, parents, index) {
        events.push('-' + node.type)
        const parent = parents[parents.length - 1]

        if (node.type === 'emphasis' && parent && typeof index === 'number') {
          parent.children.splice(index, 1, ...node.children)
          return index + node.children.length
        }
      }
    })

    const paragraph = tree.children[0]
    assert.ok(paragraph.type === 'paragraph')
    assert.deepEqual(
      paragraph.children.map(function (child) {
        return child.type
      }),
      ['text', 'text']
    )
    // The unwrapped text is not walked again.
    assert.equal(
      events.join(' '),
      '+root +paragraph +emphasis +text -text -emphasis +text -text -paragraph -root'
    )
  })

  await t.test('should recurse into a bazillion nodes', function () {
    // Deep enough to be useful but low enough to work on my new apple silicon
    // macbook (old mac was 6k)?
    const expected = 4000
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
      .replace(/[\w\-/:\\]+[/\\](\w+.js):\d+:\d+/g, '$1:1:1')
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
      .replace(/[\w\-/:\\]+[/\\](\w+.js):\d+:\d+/g, '$1:1:1')
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
