# unist-util-visit-parents [![Build Status][build-badge]][build-page] [![Coverage Status][coverage-badge]][coverage-page]

[Unist][] node visitor, with ancestral information.  Useful when
working with [**remark**][remark] or [**retext**][retext].

Similar to [`unist-util-visit`][visit], which you should probably be
using.

## Installation

[npm][]:

```bash
npm install unist-util-visit-parents
```

**unist-util-visit-parents** is also available as an AMD, CommonJS, and
globals module, [uncompressed and compressed][releases].

## Usage

Dependencies:

```javascript
var remark = require('remark');
var visitParents = require('unist-util-visit-parents');

remark().use(function () {
    return function (ast) {
        visitParents(ast, 'strong', function (node, parents) {
          console.log(parents);
        });
    };
}).process('# Some **strongness** in a heading');
```

Yields:

```js
[ { type: 'root',
    children: [ [Object] ] },
  { type: 'heading',
    depth: 1,
    children: [ [Object], [Object], [Object] ] } } ]
```

## API

### `visitParents(node[, type], visitor)`

Visit nodes, with ancestral information.  Optionally by node type.

*   `node` ([`Node`][node]) — Node to search;
*   `type` (`string`, optional) — Node type;
*   `visitor` (`Function`) — See [`visitor`][visitor].

#### `stop? = visitor(node, parents)`

Invoked when a node (when `type` is given, matching `type`) is found.

**Parameters**:

*   `node` ([`Node`][node]) — Found node;
*   `parents` (`Array.<Node>`) — List of parents.

**Returns**: `boolean?` - When `false`, visiting is immediately stopped.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definition -->

[build-badge]: https://img.shields.io/travis/wooorm/unist-util-visit-parents.svg

[build-page]: https://travis-ci.org/wooorm/unist-util-visit-parents

[coverage-badge]: https://img.shields.io/codecov/c/github/wooorm/unist-util-visit-parents.svg

[coverage-page]: https://codecov.io/github/wooorm/unist-util-visit-parents?branch=master

[npm]: https://docs.npmjs.com/cli/install

[releases]: https://github.com/wooorm/unist-util-visit-parents/releases

[license]: LICENSE

[author]: http://wooorm.com

[unist]: https://github.com/wooorm/unist

[retext]: https://github.com/wooorm/retext

[remark]: https://github.com/wooorm/remark

[node]: https://github.com/wooorm/unist#node

[visitor]: #stop--visitornode-parents

[visit]: https://github.com/wooorm/unist-util-visit
