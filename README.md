# BlockApps + Web3

This package provides a web3 provider for the BlockApps backend. This is not a wrapper around web3, so when using BlockApps + Web3, you must still include web3 in your project.

You can see an example of the provider in action by opening `index.html`.

### Install

Node:

First, `npm install web3` and `npm install blockapps-web3`. **TODO:** Add this to npm. Note: the last command doesn't yet work. Then, in your project:

```
var web3 = require("web3");
var BlockAppsWeb3Provider = require("blockapps-web3");
```

Browser:

```
<script type="text/javascript" src="web3.js"></script>
<script type="text/javsacript" src="./build/blockapps-web3.js"></script>
```

### To Use:

```
var provider = new BlockAppsWeb3Provider({
  accounts: {...}, // Key/value pairs, key is address, value is private key.
  coinbase: "...", // If not specified, will use the first account found.
  host: "..."      // Specify the BlockApps hosts. Defaults to http://stablenet.blockapps.net
});

web3.setProvider(provider);
```

Then use web3 like normal!

### Implemented Methods

The following list the currently implemented methods. Some methods have restrictions: For instance, any method that takes a block number of "latest", "earliest" or "pending" will default to "latest" regardless of what's passed to web3. Some of these restrictions are because they haven't been implemented; other restrictions are due to functionality not yet implemented by BlockApps.

* `eth_coinbase`
* `eth_accounts`
* `eth_blockNumber`
* `eth_sendTransaction`
* `eth_getCompilers`
* `eth_compileSolidity`
* `eth_getCode` (only supports block number “latest”)
* `eth_getBalance`
* `eth_getTransactionCount` (only supports block number “latest”)
* `eth_getTransactionByHash`
* `eth_getTransactionReceipt`
* `eth_newBlockFilter`
* `eth_uninstallFilter`
* `web3_clientVersion`

### Developing

BlockApps + Web3 uses `grunt` to concatenate files and produce its distributable source files (`./build/blockapps-web3.js` and `./build/blockapps-web3.js`).

To concatenate files and dependencies (this will create/overwrite `./build/blockapps-web3.js`): 

```
$ grunt
```

To concatenate as well as minify (this will create/overwrite both `./build/blockapps-web3.js` and `./build/blockapps-web3.js`):

```
$ grunt dist
```

To have grunt automatically build `./build/blockapps-web3.js` during development do:

```
$ grunt watch
```


