# BlockApps + Web3

This package provides a web3 provider for the BlockApps backend, built on top of the [Hooked Web3 Provider](https://github.com/ConsenSys/hooked-web3-provider). It allows you to use BlockApps easily in a primarily web3-based project.

This is not a wrapper around web3, so when using BlockApps + Web3, you must still include web3 in your project.

**A couple considerations before using this library**: 

1. BlockApps is currently in active development. Because of this, the web3 provider doesn't currently point to a server synced with the actual Ethereum network. This will change very soon. 

1. In the same vein as the above, **all `eth_call` requests cost Ether**, and are treated just like transactions sent via `eth_sendTransaction`.

### Install

Node:

```
$ npm install blockapps-web3
```

```
var BlockAppsWeb3Provider = require("blockapps-web3");
```

Browser:

```
<script type="text/javascript" src="bignumber.js"></script>
<script type="text/javascript" src="ethereumjs-tx.js"></script> <!-- dist version -->
<script type="text/javascript" src="web3.js"></script>
<script type="text/javsacript" src="./build/blockapps-web3.js"></script>
```

Note that to avoid dependency coupling, you must include [BigNumber](https://github.com/MikeMcl/bignumber.js/), [ethereumjs-tx](https://github.com/ethereum/ethereumjs-tx), and [web3](https://github.com/ethereum/web3.js) on your own when using BlockApps-Web3 in the browser. Those three dependencies **must** be included in the browser before including the `blockapps-web3.js` script.

**Note:** `ethereumjs-tx` will eventually be removed as a dependency once BlockApps is able to process raw transactions server side.

### To Use:

```
// See below for options passed to the constructor.
var provider = new BlockAppsWeb3Provider({ ... });

web3.setProvider(provider);
```

Then use web3 like normal!

### Options

The `BlockAppsWeb3Provider` constructor takes a single parameter with the following keys:

* `transaction_signer`: See [Hooked Web3 Provider](https://github.com/ConsenSys/hooked-web3-provider). `BlockAppsWeb3Provider` is an extension of the HookedWeb3Provider, using a separate service for signing transactions.
* `coinbase`: `string` - the coinbase address associated with `eth_coinbase`. You only need to specify this value if your app will call `eth_coinbase` via web3.
* `accounts`: `array` - the addresses associated with this provider. You only need to specify this value if your app will call `eth_accounts` via web3.
* `host`: `string` - location of the BlockApps server this provider will point to. Defaults to `http://hacknet.blockapps.net` (for now)


### Implemented Methods

The following lists the currently implemented methods. Some methods have restrictions: For instance, any method that takes a block number of "latest", "earliest" or "pending" will default to "latest" regardless of what's passed to web3. Some of these restrictions are because they haven't been implemented; other restrictions are due to functionality not yet implemented by BlockApps.

* `eth_coinbase`
* `eth_accounts`
* `eth_blockNumber`
* `eth_getBlockByNumber` (does not support "pending"; partially implemented, needs work)
* `eth_call`
* `eth_sendTransaction`
* `eth_sendRawTransaction`
* `eth_getCompilers`
* `eth_compileSolidity`
* `eth_getCode` (does not support "pending")
* `eth_getBalance`
* `eth_getTransactionCount` (does not support "pending")
* `eth_getTransactionByHash`
* `eth_getTransactionReceipt`
* `eth_newBlockFilter`
* `eth_getFilterChanges` (only supports block filters)
* `eth_uninstallFilter`
* `web3_clientVersion`

### Developing & Contributing

BlockApps + Web3 uses `truffle` to manage all parts of the project. First install `truffle` if you haven't already:

```
$ npm install -g truffle
```

To build the distributable files in `./build`:

```
$ truffle build
```

To have truffle automatically build the distributable files during development on every save:

```
$ truffle watch
```

To run the automated tests:

```
$ truffle test
```


