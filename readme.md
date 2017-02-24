# unist-util-visit-parents [![Build Status][build-badge]][build-page] [![Coverage Status][coverage-badge]][coverage-page]

[Unist][] node visitor, with ancestral information.

## Installation

[npm][]:

```bash
npm install unist-util-visit-parents
```

## Usage

```javascript
var remark = require('remark');
var visit = require('unist-util-visit-parents');

remark().use(plugin).processSync('Some _emphasis_, **importance**, and `code`.');

function plugin() {
  return transformer;
  function transformer(tree) {
    visit(tree, 'strong', visitor);
  }
  function visitor(node, parents) {
    console.log(parents);
  }
}
```

Yields:

```js
[ { type: 'root',
    children: [ [Object] ] },
  { type: 'paragraph',
    children:
     [ [Object],
       [Object],
       [Object],
       [Object],
       [Object],
       [Object],
       [Object] ] } ]
```

## API

### `visit(node[, type], visitor)`

Visit nodes, with ancestral information.  Optionally by node type.

###### Parameters

*   `node` ([`Node`][node]) — Node to search;
*   `type` (`string`, optional) — Node type;
*   `visitor` ([Function][visitor]) — Visitor invoked when a node is found.

#### `stop? = visitor(node, parents)`

Invoked when a node (when `type` is given, matching `type`) is found.

###### Parameters

*   `node` ([`Node`][node]) — Found node;
*   `parents` (`Array.<Node>`) — List of parents.

###### Returns

`boolean?` - When `false`, visiting is immediately stopped.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definition -->

[build-badge]: https://img.shields.io/travis/syntax-tree/unist-util-visit-parents.svg

[build-page]: https://travis-ci.org/syntax-tree/unist-util-visit-parents

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/unist-util-visit-parents.svg

[coverage-page]: https://codecov.io/github/syntax-tree/unist-util-visit-parents?branch=master

[npm]: https://docs.npmjs.com/cli/install

[license]: LICENSE

[author]: http://wooorm.com

[unist]: https://github.com/syntax-tree/unist

[node]: https://github.com/syntax-tree/unist#node

[visitor]: #stop--visitornode-parents
