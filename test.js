/**
 * @author Titus Wormer
 * @copyright 2016 Titus Wormer
 * @license MIT
 * @module unist:util:visit-parents
 * @fileoverview Test suite for `unist-util-visit-parents`.
 */

'use strict';

/* eslint-env node */

/*
 * Dependencies.
 */

var test = require('tape');
var remark = require('remark');
var visitParents = require('./index.js');

/*
 * Fixture.
 */

var ast = remark.parse('Some _emphasis_, **strongness**, and `code`.');

var paragraph = ast.children[0];

var textNodes = 6;

var STOP = 5;

var types = [
    'root',// []
    'paragraph',// [ast]
    'text',// [ast, paragraph]
    'emphasis',// [ast, paragraph]
    'text',// [ast, paragraph, paragraph.children[1]]
    'text',// [ast, paragraph]
    'strong',// [ast, paragraph]
    'text',// [ast, paragraph, paragraph.children[3]]
    'text',// [ast, paragraph]
    'inlineCode',// [ast, paragraph]
    'text'// [ast, paragraph]
];

var ancestors = [
    [],
    [ast],
    [ast, paragraph],
    [ast, paragraph],
    [ast, paragraph, paragraph.children[1]],
    [ast, paragraph],
    [ast, paragraph],
    [ast, paragraph, paragraph.children[3]],
    [ast, paragraph],
    [ast, paragraph],
    [ast, paragraph]
];

var textAncestors = [
    [ast, paragraph],
    [ast, paragraph, paragraph.children[1]],
    [ast, paragraph],
    [ast, paragraph, paragraph.children[3]],
    [ast, paragraph],
    [ast, paragraph]
];

/*
 * Tests.
 */

test('unist-util-visit-parents', function (t) {
    t.throws(function () {
        visitParents();
    }, 'should fail without tree');

    t.throws(function () {
        visitParents(ast);
    }, 'should fail without visitor');

    t.test('should iterate over all nodes', function (st) {
        var n = -1;

        visitParents(ast, function (node, parents) {
            st.equal(node.type, types[++n]);
            st.deepEqual(parents, ancestors[n]);
        });

        st.equal(n, types.length - 1, 'should visit all nodes');

        st.end();
    });

    t.test('should only visit given `types`', function (st) {
        var n = 0;

        visitParents(ast, 'text', function (node, parents) {
            st.equal(node.type, 'text');
            st.deepEqual(parents, textAncestors[n]);
            n++;
        });

        st.equal(n, textNodes, 'should visit all nodes');

        st.end();
    });

    t.test('should stop if `visitor` stops', function (st) {
        var n = -1;

        visitParents(ast, function (node) {
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
