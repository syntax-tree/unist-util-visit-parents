import path from 'path'
import assert from 'assert'
import strip from 'strip-ansi'
import test from 'tape'
import remark from 'remark'
import gfm from 'remark-gfm'
import {visitParents, EXIT, SKIP, CONTINUE} from './index.js'

var tree = remark().parse('Some _emphasis_, **importance**, and `code`.')

var paragraph = tree.children[0]

var textNodes = 6

var stopIndex = 5
var skipIndex = 7
var skipReverseIndex = 6

var types = [
  'root', // []
  'paragraph', // [tree]
  'text', // [tree, paragraph]
  'emphasis', // [tree, paragraph]
  'text', // [tree, paragraph, paragraph.children[1]]
  'text', // [tree, paragraph]
  'strong', // [tree, paragraph]
  'text', // [tree, paragraph, paragraph.children[3]]
  'text', // [tree, paragraph]
  'inlineCode', // [tree, paragraph]
  'text' // [tree, paragraph]
]

var reverseTypes = [
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

var ancestors = [
  [],
  [tree],
  [tree, paragraph],
  [tree, paragraph],
  [tree, paragraph, paragraph.children[1]],
  [tree, paragraph],
  [tree, paragraph],
  [tree, paragraph, paragraph.children[3]],
  [tree, paragraph],
  [tree, paragraph],
  [tree, paragraph]
]

var textAncestors = [
  [tree, paragraph],
  [tree, paragraph, paragraph.children[1]],
  [tree, paragraph],
  [tree, paragraph, paragraph.children[3]],
  [tree, paragraph],
  [tree, paragraph]
]

test('unist-util-visit-parents', function (t) {
  t.throws(
    function () {
      visitParents()
    },
    /TypeError: visitor is not a function/,
    'should fail without tree'
  )

  t.throws(
    function () {
      visitParents(tree)
    },
    /TypeError: visitor is not a function/,
    'should fail without visitor'
  )

  t.test('should iterate over all nodes', function (t) {
    var n = 0

    visitParents(tree, visitor)

    t.equal(n, types.length, 'should visit all nodes')

    t.end()

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

  t.test('should iterate over all nodes, backwards', function (t) {
    var n = 0

    visitParents(tree, visitor, true)

    t.equal(n, reverseTypes.length, 'should visit all nodes in reverse')

    t.end()

    function visitor(node) {
      assert.strictEqual(
        node.type,
        reverseTypes[n],
        'should be the expected type'
      )
      n++
    }
  })

  t.test('should only visit a given `type`', function (t) {
    var n = 0

    visitParents(tree, 'text', visitor)

    t.equal(n, textNodes, 'should visit all nodes')

    t.end()

    function visitor(node, parents) {
      assert.strictEqual(node.type, 'text')
      assert.deepStrictEqual(parents, textAncestors[n])
      n++
    }
  })

  t.test('should only visit given `type`s', function (t) {
    var types = ['text', 'inlineCode']
    var n = 0

    visitParents(tree, types, visitor)

    t.equal(n, 7, 'should visit all matching nodes')

    t.end()

    function visitor(node) {
      assert.notStrictEqual(types.indexOf(node.type), -1, 'should match')
      n++
    }
  })

  t.test('should accept any `is`-compatible test function', function (t) {
    var n = 0
    var nodes = [
      paragraph.children[4],
      paragraph.children[5],
      paragraph.children[6]
    ]

    visitParents(tree, test, visitor)

    t.equal(n, 3, 'should visit all passing nodes')

    t.end()

    function visitor(node, parents) {
      var parent = parents[parents.length - 1]
      var index = parent ? parent.children.indexOf(node) : null
      var info = '(' + (parent && parent.type) + ':' + index + ')'
      assert.strictEqual(node, nodes[n], 'should be a requested node ' + info)
      n++
    }

    function test(node, index) {
      return index > 3
    }
  })

  t.test('should accept an array of `is`-compatible tests', function (t) {
    var expected = new Set(['root', 'paragraph', 'emphasis', 'strong'])
    var tests = [test, 'paragraph', {value: '.'}, ['emphasis', 'strong']]
    var n = 0

    visitParents(tree, tests, visitor)

    t.equal(n, 5, 'should visit all passing nodes')

    t.end()

    function visitor(node) {
      var ok = expected.has(node.type) || node.value === '.'
      assert.ok(ok, 'should be a requested type: ' + node.type)
      n++
    }

    function test(node) {
      return node.type === 'root'
    }
  })

  t.test('should stop if `visitor` stops', function (t) {
    var n = -1

    visitParents(tree, visitor)

    t.equal(n, stopIndex, 'should visit nodes until `visit.EXIT` is given')

    t.end()

    function visitor(node) {
      assert.strictEqual(node.type, types[++n])
      return n === stopIndex ? EXIT : CONTINUE
    }
  })

  t.test('should stop if `visitor` stops (tuple)', function (t) {
    var n = -1

    visitParents(tree, visitor)

    t.equal(n, stopIndex, 'should visit nodes until `visit.EXIT` is given')

    t.end()

    function visitor(node) {
      assert.strictEqual(node.type, types[++n])
      return [n === stopIndex ? EXIT : CONTINUE]
    }
  })

  t.test('should stop if `visitor` stops, backwards', function (t) {
    var n = 0

    visitParents(tree, visitor, true)

    t.equal(n, stopIndex, 'should visit nodes until `visit.EXIT` is given')

    t.end()

    function visitor(node) {
      assert.strictEqual(
        node.type,
        reverseTypes[n++],
        'should be the expected type'
      )
      return n === stopIndex ? EXIT : CONTINUE
    }
  })

  t.test('should skip if `visitor` skips', function (t) {
    var n = 0
    var count = 0

    visitParents(tree, visitor)

    t.equal(
      count,
      types.length - 1,
      'should visit nodes except when `SKIP` is given'
    )

    t.end()

    function visitor(node) {
      assert.strictEqual(node.type, types[n++], 'should be the expected type')
      count++

      if (n === skipIndex) {
        n++ // The one node inside it.
        return SKIP
      }
    }
  })

  t.test('should skip if `visitor` skips (tuple)', function (t) {
    var n = 0
    var count = 0

    visitParents(tree, visitor)

    t.equal(
      count,
      types.length - 1,
      'should visit nodes except when `visit.SKIP` is given'
    )

    t.end()

    function visitor(node) {
      assert.strictEqual(node.type, types[n++], 'should be the expected type')
      count++

      if (n === skipIndex) {
        n++ // The one node inside it.
        return [SKIP]
      }
    }
  })

  t.test('should skip if `visitor` skips, backwards', function (t) {
    var n = 0
    var count = 0

    visitParents(tree, visitor, true)

    t.equal(
      count,
      reverseTypes.length - 1,
      'should visit nodes except when `visit.SKIP` is given'
    )

    t.end()

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
    function (t) {
      var n = 0
      var again = false
      var expected = [
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
    function (t) {
      var n = 0
      var again = false
      var expected = [
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

      function visitor(node, parents) {
        var parent = parents[parents.length - 1]

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

  t.test(
    'should support any other given `index` to iterate over next',
    function (t) {
      var n = 0
      var again = false
      var expected = [
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

      function visitor(node, parents) {
        var parent = parents[parents.length - 1]
        var index = parent ? parent.children.indexOf(node) : null

        assert.strictEqual(
          node.type,
          expected[n++],
          'should be the expected type'
        )

        if (again === false && node.type === 'strong') {
          again = true
          return index + 2 // Skip to `inlineCode`.
        }
      }
    }
  )

  t.test(
    'should support any other given `index` to iterate over next (tuple)',
    function (t) {
      var n = 0
      var again = false
      var expected = [
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

      function visitor(node, parents) {
        var parent = parents[parents.length - 1]
        var index = parent ? parent.children.indexOf(node) : null

        assert.strictEqual(
          node.type,
          expected[n++],
          'should be the expected type'
        )

        if (again === false && node.type === 'strong') {
          again = true
          return [null, index + 2] // Skip to `inlineCode`.
        }
      }
    }
  )

  t.test('should visit added nodes', function (t) {
    var tree = remark().parse('Some _emphasis_, **importance**, and `code`.')
    var other = remark().use(gfm).parse('Another ~~sentence~~.').children[0]
    var l = types.length + 5 // (p, text, delete, text, text)
    var n = 0

    visitParents(tree, visitor)

    t.equal(n, l, 'should walk over all nodes')

    t.end()

    function visitor(node, parents) {
      n++

      if (n === 2) {
        parents[parents.length - 1].children.push(other)
      }
    }
  })

  t.test('should recurse into a bazillion nodes', function (t) {
    var expected = 6000
    var tree = remark().parse(
      Array.from({length: expected / 4}).join('* 1. ') + 'asd'
    )
    var n = 1

    visitParents(tree, visitor)

    t.equal(n, expected, 'should walk over all nodes')

    t.end()

    function visitor() {
      n++
    }
  })

  t.test('should add a pretty stack', function (t) {
    var source = new RegExp(
      '\\([^)]+\\' + path.sep + '(\\w+.js):\\d+:\\d+\\)',
      'g'
    )
    var tree = {
      type: 'root',
      children: [
        {
          // A hast-like node.
          type: 'element',
          tagName: 'div',
          children: [
            {
              // A xast-like node.
              type: 'element',
              name: 'xml',
              children: [{type: 'text', value: 'Oh no!'}]
            }
          ]
        }
      ]
    }
    var exception

    try {
      visitParents(tree, 'text', fail)
    } catch (error) {
      exception = error
    }

    t.equal(
      strip(exception.stack)
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

    function fail(node) {
      throw new Error(node.value)
    }
  })

  t.end()
})
