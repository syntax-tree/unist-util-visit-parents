/**
 * @author Titus Wormer
 * @copyright 2016 Titus Wormer
 * @license MIT
 * @module unist:util:visit-parents
 * @fileoverview Recursively walk over unist nodes,
 *   with ancestral information.
 */

'use strict';

/* eslint-env commonjs */

/**
 * Visit.
 *
 * @param {Node} tree - Root node
 * @param {string} [type] - Node type.
 * @param {function(node): boolean?} visitor - Invoked
 *   with each found node.  Can return `false` to stop.
 */
function visitParents(tree, type, visitor) {
    var stack = [];

    if (typeof type === 'function') {
        visitor = type;
        type = null;
    }

    /**
     * Visit children in `parent`.
     *
     * @param {Array.<Node>} children - Children of `node`.
     * @param {Node?} parent - Parent of `node`.
     * @return {boolean?} - `false` if the visiting stopped.
     */
    function all(children, parent) {
        var length = children.length;
        var index = -1;
        var child;

        stack.push(parent);

        while (++index < length) {
            child = children[index];

            if (child && one(child) === false) {
                return false;
            }
        }

        stack.pop();

        return true;
    }

    /**
     * Visit a single node.
     *
     * @param {Node} node - Node to visit.
     * @return {boolean?} - Result of invoking `visitor`.
     */
    function one(node) {
        var result;

        if (!type || node.type === type) {
            result = visitor(node, stack.concat());
        }

        if (node.children && result !== false) {
            return all(node.children, node);
        }

        return result;
    }

    one(tree);
}

/*
 * Expose.
 */

module.exports = visitParents;
