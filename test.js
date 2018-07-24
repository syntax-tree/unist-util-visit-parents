'use strict'

var assert = require('assert')
var test = require('tape')
var remark = require('remark')
var visitParents = require('.')

var tree = remark().parse('Some _emphasis_, **importance**, and `code`.')

var paragraph = tree.children[0]

var textNodes = 6

var STOP = 5
var SKIP = 7
var SKIP_REVERSE = 6

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

test('unist-util-visit-parents', function(t) {
  t.throws(
    function() {
      visitParents()
    },
    /TypeError: visitor is not a function/,
    'should fail without tree'
  )

  t.throws(
    function() {
      visitParents(tree)
    },
    /TypeError: visitor is not a function/,
    'should fail without visitor'
  )

  t.test('should iterate over all nodes', function(st) {
    var n = 0

    visitParents(tree, visitor)

    st.equal(n, types.length, 'should visit all nodes')

    st.end()

    function visitor(node, parents) {
      assert.equal(node.type, types[n], 'should be the expected type')
      assert.deepEqual(parents, ancestors[n], 'should have expected parents')
      n++
    }
  })

  t.test('should iterate over all nodes, backwards', function(st) {
    var n = 0

    visitParents(tree, visitor, true)

    st.equal(n, reverseTypes.length, 'should visit all nodes in reverse')

    st.end()

    function visitor(node) {
      assert.equal(node.type, reverseTypes[n], 'should be the expected type')
      n++
    }
  })

  t.test('should only visit a given `type`', function(st) {
    var n = 0

    visitParents(tree, 'text', visitor)

    st.equal(n, textNodes, 'should visit all nodes')

    st.end()

    function visitor(node, parents) {
      assert.equal(node.type, 'text')
      assert.deepEqual(parents, textAncestors[n])
      n++
    }
  })

  t.test('should only visit given `type`s', function(st) {
    var types = ['text', 'inlineCode']
    var n = 0

    visitParents(tree, types, visitor)

    st.equal(n, 7, 'should visit all matching nodes')

    st.end()

    function visitor(node) {
      assert.notEqual(types.indexOf(node.type), -1, 'should match')
      n++
    }
  })

  t.test('should accept any `is`-compatible test function', function(st) {
    var n = 0
    var nodes = [
      paragraph.children[4],
      paragraph.children[5],
      paragraph.children[6]
    ]

    visitParents(tree, test, visitor)

    st.equal(n, 3, 'should visit all passing nodes')

    st.end()

    function visitor(node, parents) {
      var parent = parents[parents.length - 1]
      var index = parent ? parent.children.indexOf(node) : null
      var info = '(' + (parent && parent.type) + ':' + index + ')'
      assert.equal(node, nodes[n], 'should be a requested node ' + info)
      n++
    }

    function test(node, index) {
      return index > 3
    }
  })

  t.test('should accept an array of `is`-compatible tests', function(st) {
    var expected = ['root', 'paragraph', 'emphasis', 'strong']
    var tests = [test, 'paragraph', {value: '.'}, ['emphasis', 'strong']]
    var n = 0

    visitParents(tree, tests, visitor)

    st.equal(n, 5, 'should visit all passing nodes')

    st.end()

    function visitor(node) {
      var ok = expected.indexOf(node.type) !== -1 || node.value === '.'
      assert.ok(ok, 'should be a requested type: ' + node.type)
      n++
    }

    function test(node) {
      return node.type === 'root'
    }
  })

  t.test('should stop if `visitor` stops', function(st) {
    var n = -1

    visitParents(tree, visitor)

    st.equal(n, STOP, 'should visit nodes until `visit.EXIT` is given')

    st.end()

    function visitor(node) {
      assert.equal(node.type, types[++n])
      return n === STOP ? visitParents.EXIT : visitParents.CONTINUE
    }
  })

  t.test('should stop if `visitor` stops, backwards', function(st) {
    var n = 0

    visitParents(tree, visitor, true)

    st.equal(n, STOP, 'should visit nodes until `visit.EXIT` is given')

    st.end()

    function visitor(node) {
      assert.equal(node.type, reverseTypes[n++], 'should be the expected type')
      return n === STOP ? visitParents.EXIT : visitParents.CONTINUE
    }
  })

  t.test('should skip if `visitor` skips', function(st) {
    var n = 0
    var count = 0

    visitParents(tree, visitor)

    st.equal(
      count,
      types.length - 1,
      'should visit nodes except when `visit.SKIP` is given'
    )

    st.end()

    function visitor(node) {
      assert.equal(node.type, types[n++], 'should be the expected type')
      count++

      if (n === SKIP) {
        n++ // The one node inside it.
        return visitParents.SKIP
      }
    }
  })

  t.test('should skip if `visitor` skips, backwards', function(st) {
    var n = 0
    var count = 0

    visitParents(tree, visitor, true)

    st.equal(
      count,
      reverseTypes.length - 1,
      'should visit nodes except when `visit.SKIP` is given'
    )

    st.end()

    function visitor(node) {
      assert.equal(node.type, reverseTypes[n++], 'should be the expected type')
      count++

      if (n === SKIP_REVERSE) {
        n++ // The one node inside it.
        return visitParents.SKIP
      }
    }
  })

  t.test(
    'should support a given `index` to iterate over next (`0` to reiterate)',
    function(st) {
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

      st.equal(n, expected.length, 'should visit nodes again')

      st.end()

      function visitor(node) {
        assert.equal(node.type, expected[n++], 'should be the expected type')

        if (again === false && node.type === 'strong') {
          again = true
          return 0 // Start over.
        }
      }
    }
  )

  t.test(
    'should support a given `index` to iterate over next (`children.length` to skip further children)',
    function(st) {
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

      st.equal(n, expected.length, 'should skip nodes')

      st.end()

      function visitor(node, parents) {
        var parent = parents[parents.length - 1]

        assert.equal(node.type, expected[n++], 'should be the expected type')

        if (again === false && node.type === 'strong') {
          again = true
          return parent.children.length // Skip siblings.
        }
      }
    }
  )

  t.test(
    'should support any other given `index` to iterate over next',
    function(st) {
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

      st.equal(n, expected.length, 'should skip nodes')

      st.end()

      function visitor(node, parents) {
        var parent = parents[parents.length - 1]
        var index = parent ? parent.children.indexOf(node) : null

        assert.equal(node.type, expected[n++], 'should be the expected type')

        if (again === false && node.type === 'strong') {
          again = true
          return index + 2 // Skip to `inlineCode`.
        }
      }
    }
  )

  t.test('should visit added nodes', function(st) {
    var tree = remark().parse('Some _emphasis_, **importance**, and `code`.')
    var other = remark().parse('Another ~~sentence~~.').children[0]
    var l = types.length + 5 // (p, text, delete, text, text)
    var n = 0

    visitParents(tree, visitor)

    st.equal(n, l, 'should walk over all nodes')

    st.end()

    function visitor(node, parents) {
      n++

      if (n === 2) {
        parents[parents.length - 1].children.push(other)
      }
    }
  })

  t.end()
})
