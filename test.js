'use strict';

var test = require('tape');
var remark = require('remark');
var visitParents = require('.');

var tree = remark().parse('Some _emphasis_, **importance**, and `code`.');

var paragraph = tree.children[0];

var textNodes = 6;

var STOP = 5;

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
  'text'// [tree, paragraph]
];

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
];

var textAncestors = [
  [tree, paragraph],
  [tree, paragraph, paragraph.children[1]],
  [tree, paragraph],
  [tree, paragraph, paragraph.children[3]],
  [tree, paragraph],
  [tree, paragraph]
];

/* Tests. */
test('unist-util-visit-parents', function (t) {
  t.throws(
    function () {
      visitParents();
    },
    'should fail without tree'
  );

  t.throws(
    function () {
      visitParents(tree);
    },
    'should fail without visitor'
  );

  t.test('should iterate over all nodes', function (st) {
    var n = -1;

    visitParents(tree, function (node, parents) {
      st.equal(node.type, types[++n]);
      st.deepEqual(parents, ancestors[n]);
    });

    st.equal(n, types.length - 1, 'should visit all nodes');

    st.end();
  });

  t.test('should only visit given `types`', function (st) {
    var n = 0;

    visitParents(tree, 'text', function (node, parents) {
      st.equal(node.type, 'text');
      st.deepEqual(parents, textAncestors[n]);
      n++;
    });

    st.equal(n, textNodes, 'should visit all nodes');

    st.end();
  });

  t.test('should stop if `visitor` stops', function (st) {
    var n = -1;

    visitParents(tree, function (node) {
      st.equal(node.type, types[++n]);

      if (n === STOP) {
        return false;
      }
    });

    st.equal(n, STOP, 'should visit all nodes');

    st.end();
  });

  t.end();
});
