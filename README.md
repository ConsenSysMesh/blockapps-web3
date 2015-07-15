# BlockApps + Web3

This package provides a web3 provider for the BlockApps backend. This is not a wrapper around web3, so when using BlockApps + Web3, you must still include web3 in your project.

You can see an example of the provider in action by opening `index.html`.

### Install

Node:

First, `npm install web3` and `npm install blockapps-web3`. **TODO:** Add this to npm. Note: the last command doesn't yet work. Then, in your project:

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

### To Use:

```
// See below for options passed to the constructor.
var provider = new BlockAppsWeb3Provider({ ... });

web3.setProvider(provider);
```

Then use web3 like normal!

### Options

The `BlockAppsWeb3Provider` constructor takes a single parameter with the following keys:

* `keyprovider`: `function(address, callback)` - used for translating addresses into their associated private keys. You **must** pass a keyprovider function if you want to use `eth_sendTransaction` and `eth_call`.
* `coinbase`: `string` - the coinbase address associated with `eth_coinbase`. You only need to specify this value if your app will call `eth_coinbase` via web3.
* `accounts`: `Array` - the addresses associated with this provider. You only need to specify this value if your app will call `eth_accounts` via web3.

### Writing your Key Provider

In order for the BlockAppsWeb3Provider to reduce dependencies and stay implementation neutral, it does not manage and save addresses and their associated private keys. In order to sign transactions and send them to BlockApps, however, the provider must have a way of getting an address's unencrypted private key -- this is the role of the key provider.

If you don't have a library in mind for managing your app's addresses and private keys for your users, we recommend [ethereumjs-accounts](https://github.com/SilentCicero/ethereumjs-accounts). Here's an example key provider using ethereumjs-accounts:

```
var provider = new BlockAppsWeb3Provider({
  keyprovider: function(address, callback) {
    var passphrase = prompt("Please enter your password.");
    var account = accounts.get(address, passphrase);
    
    if (account.locked == true) {
      callback(new Error("Invalid password!"));
    } else {
      callback(null, account.private);
    }
  }
});
```


### Implemented Methods

The following lists the currently implemented methods. Some methods have restrictions: For instance, any method that takes a block number of "latest", "earliest" or "pending" will default to "latest" regardless of what's passed to web3. Some of these restrictions are because they haven't been implemented; other restrictions are due to functionality not yet implemented by BlockApps.

* `eth_coinbase`
* `eth_accounts`
* `eth_blockNumber`
* `eth_call`
* `eth_sendTransaction`
* `eth_sendRawTransaction`
* `eth_getCompilers`
* `eth_compileSolidity`
* `eth_getCode` (only supports block number “latest”)
* `eth_getBalance`
* `eth_getTransactionCount` (only supports block number “latest”)
* `eth_getTransactionByHash`
* `eth_getTransactionReceipt`
* `eth_newBlockFilter`
* `eth_getFilterChanges` (only supports block filters)
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


