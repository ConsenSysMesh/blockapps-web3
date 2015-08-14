// NOTE: This has been converted from CoffeeScript using http://js2.coffee
// Some code can be made more clear as a result. I'd encourage contributions. :)

var EthTx, factory;

factory = function(web3, XMLHttpRequest, BigNumber, EthTx, Buffer, ethUtil) {
  var BlockAppsWeb3Provider, BlockFilter;
  BlockFilter = (function() {
    function BlockFilter(provider) {
      this.provider = provider;
    }

    BlockFilter.prototype.initialize = function(callback) {
      if (this.provider.verbosity >= 1) console.log("   BlockFilter.initialize");
      var self = this;
      this.provider.eth_blockNumber(function(err, number) {
        if (err != null) {
          callback(err);
          return;
        }
        self.block_number = web3.toDecimal(number);
        callback();
      });
    };

    BlockFilter.prototype.getChanges = function(callback) {
      if (this.provider.verbosity >= 1) console.log("   BlockFilter.getChanges");
      var self = this;
      this.provider.eth_blockNumber(function(err, finish_number) {
        if (err != null) {
          callback(err);
          return;
        }
        finish_number = web3.toDecimal(finish_number);
        self.getBlockHashesRecursively([], self.block_number, finish_number + 1, callback);
      });
    };

    BlockFilter.prototype.getBlockHashesRecursively = function(hashes, current_number, finish_number, callback) {
      if (this.provider.verbosity >= 1) console.log("   BlockFilter.getBlockHashesRecursively");
      var self = this;
      this.getBlockHash(current_number, function(err, hash) {
        if (err != null) {
          callback(err);
          return;
        }
        if (hash != null) {
          hashes.push(hash);
        }
        if (current_number >= finish_number || hash == null) {
          callback(null, hashes);
          return;
        }
        self.getBlockHashesRecursively(hashes, current_number + 1, finish_number, callback);
      });
    };

    BlockFilter.prototype.getBlockHash = function(block_number, callback) {
      if (this.provider.verbosity >= 1) console.log("   BlockFilter.getBlockHash");

      // Request the next block so we can get the parent hash.

      ///////////////////////////////////////////////////////////////////////////////
      /////////////////////////////// BIG DIRTY HACK! ///////////////////////////////
      ///////////////////////////////////////////////////////////////////////////////

      // Explanation: When you query blockapps for a block by block number, it won't
      // give you its own hash. Instead, it gives you the hash of the block that came
      // before it (parentHash). In order to successfully get the hash of the current
      // block number, then, we have to request block with number (block_number + 1).
      // However: stablenet, currently, isn't a blockchain that continues punching out
      // blocks every 12 seconds or so, which means the block with block number of
      // (block_number + 1) won't exist until someone makes another transaction, which
      // could be never (stablenet creates new blocks as transactions come in). So,
      // in order to get this to work correctly with web3, we're actually going to
      // request the *current* block (block_number), rather than the next block
      // (block_number + 1). This is going to return the wrong parent hash, but it's
      // the only way we can successfully integrate with most apps that use block
      // filters. Thankfully, the block hashes in block filters don't usually matter.

      // Here's what the code should be once stablenet starts acting like a real network:
      // this.provider.requestFromBlockApps("/block?number=" + (block_number + 1), ...)
      this.provider.requestFromBlockApps("/block?number=" + block_number, (function(_this) {
        return function(err, block_result) {
          var block;
          if (err != null) {
            callback(err);
            return;
          }
          if (block_result.length === 0) {
            callback();
            return;
          }
          block = block_result[0];
          callback(null, "0x" + block.blockData.parentHash);
        };
      })(this));
    };

    return BlockFilter;
  })();

  BlockAppsWeb3Provider = (function() {
    function BlockAppsWeb3Provider(options) {
      if (options == null) {
        options = {};
      }
      this.coinbase = options.coinbase;

      // accounts is an object returned from ethereumjs-accounts
      // i.e., accounts = accounts.get(). Key is the address, value is the account info.
      this.accounts = options.accounts || [];
      this.host = options.host || "http://hacknet.blockapps.net";
      this.version = options.version || "v1.0";
      this.blockchain = options.blockchain || "eth"
      this.verbosity = options.verbosity || 0;
      this.gasPrice = options.gasPrice || 1000000000000;
      this.keyprovider = options.keyprovider || function() {
        throw new Error("No key provider given to BlockApps + Web3. Can't send transaction.");
      };
      this.filter_index = 0;
      this.filters = {};
    }

    BlockAppsWeb3Provider.prototype.send = function(payload) {
      console.log("Called send!-----------------------")
      throw new Error("BlockAppsWeb3Provider does not support synchronous methods. Please provide a callback.");
    };

    // sendAsync acts as the director with which we call blockapps functions based
    // on RPC functions, and then wrap up the result to look like a JSON rpc response.
    // This is our hook into web3 -- all the other functions support this one.
    BlockAppsWeb3Provider.prototype.sendAsync = function(payload, callback) {
      if (payload instanceof Array) {
        this.processBatchRequest(payload, callback);
      } else {
        this.processSingleRequest(payload, callback);
      }
    };

    BlockAppsWeb3Provider.prototype.processSingleRequest = function(payload, callback) {
      var args, fn, j, len, method, param, ref;
      method = payload.method;

      if (this[method] == null) {
        callback(new Error("BlockAppsWeb3Provider does not yet support the Web3 method '" + method + "'."));
        return;
      }
      args = [];
      ref = payload.params || [];
      for (j = 0, len = ref.length; j < len; j++) {
        param = ref[j];
        args.push(param);
      }

      // Push a callback function to wrap up the response into
      // what web3 expects.
      args.push(function(err, result) {
        var wrapped;
        wrapped = {
          id: payload.id,
          jsonrpc: payload.jsonrpc,
          result: result
        };
        callback(err, wrapped);
      });
      fn = this[method];
      if (fn.length !== args.length) {
        callback(new Error("Invalid number of parameters passed to " + method));
        return;
      }
      fn.apply(this, args);
    };

    // Process batch requests in series.
    BlockAppsWeb3Provider.prototype.processBatchRequest = function(batch, callback) {
      if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.processBatchRequest");
      var current_index = 0;
      var results = [];
      var self = this;

      if (this.verbosity >= 1) {
        var output = "batch start: ";
        for (var i = 0; i < batch.length; i++) {
          output += batch[i].method + " ";
        }
        console.log(output);
      }

      var makeNextRequest = function() {
        self.processSingleRequest(batch[current_index], function(err, result) {
          if (err != null) {
            callback(err);
            return;
          }
          results.push(result);
          current_index += 1;
          if (current_index >= batch.length - 1) {
            callback(null, results);
            return;
          } else {
            makeNextRequest();
          }
        });
      };
      makeNextRequest();
    };

    // Make the actual requests to the BlockApps backend.
    BlockAppsWeb3Provider.prototype.requestFromBlockApps = function(path, params, contentType, callback) {
      var error, final_params, key, method, request, value;
      if (typeof params === "function") {
        callback = params;
        params = null;
        contentType = "application/x-www-form-urlencoded";
      }
      if (typeof contentType === "function") {
        callback = contentType;
        contentType = "application/x-www-form-urlencoded";
      }
      request = new XMLHttpRequest();
      request.onreadystatechange = (function(_this) {
        return function() {
          var e, error, result, toPrint;
          if (request.readyState === 4) {
            result = request.responseText;
            error = null;
            try {
              result = JSON.parse(result);
            } catch (_error) {
              e = _error;
              error = e;
            }
            if (_this.verbosity >= 3) {
              toPrint = result;
              if (typeof toPrint !== "string") {
                toPrint = JSON.stringify(toPrint, null, 2);
              }
              console.log("BLOCKAPPS RESPONSE:\n" + toPrint + "\n");
            }
            callback(error, result);
          }
        };
      })(this);
      method = params != null ? "POST" : "GET";

      var url = this.host + "/" + this.blockchain + "/" + this.version + path;

      request.open(method, url, true);
      request.setRequestHeader("Content-type", contentType);
      final_params = null;
      if (contentType === "application/x-www-form-urlencoded") {
        final_params = "";
        for (key in params) {
          value = params[key];
          if (final_params !== "") {
            final_params += "&";
          }
          final_params += key + "=" + (encodeURIComponent(value));
        }
      }
      if (contentType === "application/json") {
        final_params = JSON.stringify(params);
      }
      if (this.verbosity >= 3) {
        console.log("BLOCKAPPS REQUEST:");
      }
      if (this.verbosity >= 2) {
        console.log(method + " " + url + " - " + final_params + " - " + contentType);
      }

      try {
        if ((final_params != null) && final_params !== "") {
          return request.send(final_params);
        } else {
          return request.send();
        }
      } catch (_error) {
        error = _error;
        // TODO: Make this error a web3 error, a la:
        // callback errors.InvalidConnection(@host)
        return callback(error);
      }
    };

    // Right now, "/transactionResult" outputs errors in such a nasty
    // way that we need a function to encapsulate error handling so as
    // not to have duplication.
    BlockAppsWeb3Provider.prototype.requestTransactionResult = function(tx_hash, callback) {
      if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.requestTransactionResult");
      tx_hash = this.strip0x(tx_hash);
      this.requestFromBlockApps("/transactionResult/" + tx_hash, (function(_this) {
        return function(err, txinfo_result) {
          var txinfo;
          if (err != null) {
            callback(err);
            return;
          }
          if (txinfo_result.length === 0) {
            callback(null, null);
            return;
          }
          txinfo = txinfo_result[txinfo_result.length - 1];
          if ((txinfo.message != null) && txinfo.message.toLowerCase().indexOf("success") < 0) {
            callback(new Error(txinfo.message));
            return;
          }
          return callback(null, txinfo);
        };
      })(this));
    };

    // We have to make three requests to get all the data we need
    // for many transaction-related calls.
    BlockAppsWeb3Provider.prototype.requestTransactionData = function(tx_hash, callback) {
      if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.requestTransactionData");

      tx_hash = this.strip0x(tx_hash);
      this.requestFromBlockApps("/transaction?hash=" + tx_hash, (function(_this) {
        return function(err, tx_result) {
          var tx;
          if (err != null) {
            callback(err);
            return;
          }
          if (tx_result.length === 0) {
            callback(null, null);
            return;
          }
          tx = tx_result[0];

          // Get the block so we can get information about the transaction.
          return _this.requestFromBlockApps("/block?number=" + tx.blockNumber, function(err, block_result) {
            var block;
            if (err != null) {
              callback(err);
              return;
            }
            if (block_result.length === 0) {
              callback(null, null);
              return;
            }
            block = block_result[0];

            // Ensure the contract was actually created.
            return _this.requestTransactionResult(tx_hash, function(err, txinfo) {
              if ((err != null) || (txinfo == null)) {
                callback(err, txinfo);
                return;
              }
              return callback(null, tx, block, txinfo);
            });
          });
        };
      })(this));
    };

    BlockAppsWeb3Provider.prototype.strip0x = function(string) {
      if (string == null) {
        return string;
      }
      return string.replace("0x", "");
    };

    //////////////////////////// Web3 Methods ////////////////////////////

    BlockAppsWeb3Provider.prototype.eth_coinbase = function(callback) {
      if (this.coinbase == null) {
        return callback(new Error("No coinbase specified in the BlockApps + Web3 provider!"));
      } else {
        return callback(null, this.coinbase);
      }
    };

    BlockAppsWeb3Provider.prototype.eth_accounts = function(callback) {
      return callback(null, this.accounts);
    };

    BlockAppsWeb3Provider.prototype.eth_blockNumber = function(callback) {
      if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_blockNumber");
      this.requestFromBlockApps("/block/last/1", function(err, response) {
        var block;
        if (err != null) {
          callback(err);
          return;
        }
        if (response.length === 0) {
          throw new Error("Couldn't find last block at /block/last/1. Please make ensure BlockApps is running properly.");
        }
        block = response[0];
        return callback(null, web3.fromDecimal(block.blockData.number));
      });
    };

    BlockAppsWeb3Provider.prototype.eth_getTransactionCount = function(address, block_number, callback) {
      if (block_number == null) {
        block_number = "latest";
      }
      address = this.strip0x(address);

      // TODO: Follow `next` pages, if any. Not implemented because I haven't seen any.
      this.requestFromBlockApps("/transaction?address=" + address, function(err, result) {
        if (err != null) {
          callback(err);
          return;
        }
        return callback(null, result.length);
      });
    };

    BlockAppsWeb3Provider.prototype.eth_getTransactionByHash = function(tx_hash, callback) {
      this.requestTransactionData(tx_hash, function(err, tx, block, txinfo) {
        var i, index, j, len, ref, returnVal, transaction;
        if (err != null) {
          callback(err);
          return;
        }
        if ((tx == null) || (block == null) || (txinfo == null)) {
          callback();
          return;
        }
        index = 0;
        ref = block.receiptTransactions;
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          transaction = ref[i];
          if (transaction.r === tx.r && transaction.s === tx.s && transaction.v === tx.v) {
            index = i;
            break;
          }
        }
        returnVal = {
          hash: "0x" + tx.hash,
          nonce: web3.fromDecimal(tx.nonce),
          blockHash: "0x" + txinfo.blockHash,
          blockNumber: web3.fromDecimal(tx.blockNumber),
          transactionIndex: web3.fromDecimal(index),
          from: "0x" + tx.from,
          gasPrice: web3.fromDecimal(tx.gasPrice),
          gas: web3.fromDecimal(block.blockData.gasUsed),
          value: web3.fromDecimal(tx.value),
          input: "0x" + tx.codeOrData
        };
        if (tx.to != null) {
          returnVal.to = "0x" + tx.to;
        }
        return callback(null, returnVal);
      });
    };

    // Only support the latest block_number for now.
    // TODO: Support block numbers with eth_getBalance
    BlockAppsWeb3Provider.prototype.eth_getBalance = function(address, block_number, callback) {
      if (block_number == null) {
        block_number = "latest";
      }
      address = this.strip0x(address);
      this.requestFromBlockApps("/block?address=" + address, function(err, response) {
        if (err != null) {
          callback(err);
          return;
        }
        if (response.length === 0) {
          callback(null, 0);
          return;
        }
        callback(null, response[response.length - 1].balance);
      });
    };

    BlockAppsWeb3Provider.prototype.eth_getCode = function(contract_address, block_number, callback) {
      if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_getCode");

      if (block_number == null) {
        block_number = "latest";
      }
      contract_address = this.strip0x(contract_address);

      // Treat the contract address as an account
      this.requestFromBlockApps("/account?address=" + contract_address, function(err, response) {
        if (err != null) {
          callback(err);
          return;
        }
        if (response.length === 0) {
          callback();
          return;
        }
        callback(null, "0x" + response[response.length - 1].code);
      });
    };

    BlockAppsWeb3Provider.prototype.eth_getCompilers = function(callback) {
      callback(null, ["solidity"]);
    };

    BlockAppsWeb3Provider.prototype.eth_compileSolidity = function(src, callback) {
      if (src == null) {
        src = "";
      }
      this.requestFromBlockApps("/solc", {
        src: src
      }, function(err, response) {
        var contract, index, j, len, name, ref, returnVal;
        if (err != null) {
          callback(err);
          return;
        }
        returnVal = {};
        ref = response.contracts;
        for (index = j = 0, len = ref.length; j < len; index = ++j) {
          contract = ref[index];
          name = contract.name;
          returnVal[name] = {
            code: contract.bin,
            info: {
              source: src,
              language: "Solidity",
              languageVersion: "0",
              compilerVersion: "0",
              abiDefinition: response.abis[index].abi,
              userDoc: {
                methods: {}
              },
              developerDoc: {
                methods: {}
              }
            }
          };
        }
        callback(null, returnVal);
      });
    };

    BlockAppsWeb3Provider.prototype.eth_sendTransaction = function(tx, callback) {
      if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_sendTransaction");

      if (tx == null) {
        tx = {};
      }
      if (tx.from == null) {
        callback(new Error("'from' not found, is required"));
        return;
      }
      this.requestFromBlockApps("/account?address=" + (this.strip0x(tx.from)), (function(_this) {
        return function(err, response) {
          var nonce, rawTx, transaction;
          if (err != null) {
            callback(err);
            return;
          }
          if (response.length >= 1) {
            nonce = response[response.length - 1].nonce;
          } else {
            nonce = 0;
          }
          rawTx = {
            nonce: web3.fromDecimal(nonce),
            gasPrice: _this.strip0x(web3.fromDecimal(tx.gasPrice || _this.gasPrice)),
            gasLimit: _this.strip0x(web3.fromDecimal(tx.gasLimit || 1900000)),
            value: _this.strip0x(web3.fromDecimal(tx.value || 0)),
            data: '00'
          };
          if (tx.to != null) {
            rawTx.to = _this.strip0x(tx.to);
          }
          if (tx.data != null) {
            rawTx.data = _this.strip0x(tx.data);
          }
          rawTx.from = _this.strip0x(tx.from);
          transaction = new EthTx(rawTx);
          return _this.keyprovider(rawTx.from, function(err, unencrypted_private_key) {
            var private_key, serializedTx;
            if (err != null) {
              callback(err);
              return;
            }
            private_key = new Buffer(_this.strip0x(unencrypted_private_key), 'hex');
            transaction.sign(private_key);
            serializedTx = transaction.serialize().toString('hex');
            return _this.eth_sendRawTransaction(serializedTx, callback);
          });
        };
      })(this));
    };

    BlockAppsWeb3Provider.prototype.eth_sendRawTransaction = function(rawTx, callback) {
      if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_sendRawTransaction");

      var bigValue, js, rawString, ttx;
      ttx = new EthTx(new Buffer(rawTx, 'hex'));
      BigNumber.config({
        EXPONENTIAL_AT: 20000000
      });
      rawString = ttx.value.toString('hex');
      bigValue = new BigNumber(0);
      if (rawString !== '') {
        bigValue = new BigNumber(rawString, 16);
      }
      js = {
        from: ttx.getSenderAddress().toString('hex'),
        nonce: ethUtil.bufferToInt(ttx.nonce),
        gasPrice: ethUtil.bufferToInt(ttx.gasPrice),
        gasLimit: ethUtil.bufferToInt(ttx.gasLimit),
        value: bigValue.toString(),
        codeOrData: ttx.data.toString('hex'),
        r: ttx.r.toString('hex'),
        s: ttx.s.toString('hex'),
        v: ttx.v.toString('hex'),
        hash: ttx.hash().toString('hex')
      };
      if (ttx.to.length !== 0) {
        js.to = ttx.to.toString('hex');
      }
      this.requestFromBlockApps("/transaction", js, "application/json", function(err, tx_response) {
        var tx_hash;
        tx_hash = "0x" + tx_response.replace(/.*=/, "");
        return callback(null, tx_hash);
      });
    };

    BlockAppsWeb3Provider.prototype.eth_call = function(tx, block_number, callback) {
      if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_call");

      if (tx == null) {
        tx = {};
      }
      if (block_number == null) {
        block_number = "latest";
      }
      this.eth_sendTransaction(tx, (function(_this) {
        return function(err, tx_hash) {
          var attempt, attempts, interval, maxAttempts;
          if (err != null) {
            callback(err);
            return;
          }
          tx_hash = _this.strip0x(tx_hash);
          attempts = 0;
          maxAttempts = 5;
          interval = null;
          attempt = function() {
            attempts += 1;

            // Ensure the contract was actually created.
            return _this.requestTransactionResult(tx_hash, function(err, txinfo) {
              if (err != null) {
                callback(err, txinfo);
                return;
              }
              if ((txinfo != null) && (txinfo.response != null)) {
                clearInterval(interval);
                callback(null, web3.toHex(txinfo.response));
              }
              if (attempts >= maxAttempts) {
                clearInterval(interval);
                return callback("Couldn't get call() return value after " + attempts + " attempts.");
              }
            });
          };
          interval = setInterval(attempt, 1000);
          return attempt();
        };
      })(this));
    };

    BlockAppsWeb3Provider.prototype.eth_getTransactionReceipt = function(tx_hash, callback) {
      if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_getTransactionReceipt");
      this.requestTransactionData(tx_hash, function(err, tx, block, txinfo) {
        var expected_address, i, index, j, len, ref, returnVal, transaction;
        if (err != null) {
          callback(err);
          return;
        }

        // Transaction is pending, or incomplete, or never made it.
        if ((tx == null) || (block == null) || (txinfo == null)) {
          callback(null, null);
          return;
        }

        // Get the transaction index by comparing transactions r, s and v values.
        index = 0;
        ref = block.receiptTransactions;
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          transaction = ref[i];
          if (transaction.r === tx.r && transaction.s === tx.s && transaction.v === tx.v) {
            index = i;
            break;
          }
        }
        returnVal = {
          blockNumber: web3.fromDecimal(tx.blockNumber),
          transactionHash: "0x" + tx.hash,
          transactionIndex: web3.fromDecimal(index),
          from: "0x" + tx.from,
          cumulativeGasUsed: web3.fromDecimal(block.blockData.gasUsed),
          gasUsed: web3.fromDecimal(0), // TODO: Make this right.
          logs: [] // TODO: Is there anywhere to get these?
        };
        if (tx.to != null) {
          returnVal.to = "0x" + tx.to;
        }
        expected_address = ethUtil.generateAddress(tx.from, parseInt(tx.nonce + 1)).toString('hex');

        // If the VM trace doesn't include the expected address, then the
        // transaction hasn't been processed yet.
        if (!txinfo.trace.indexOf(expected_address)) {
          callback(null, null);
          return;
        }
        returnVal.blockHash = "0x" + txinfo.blockHash;
        returnVal.contractAddress = "0x" + expected_address;
        return callback(err, returnVal);
      });
    };

    BlockAppsWeb3Provider.prototype.eth_newBlockFilter = function(callback) {
      if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_newBlockFilter");
      var self = this;
      var filter = new BlockFilter(this);
      filter.initialize(function(error) {
        if (error != null) {
          callback(error);
          return;
        }

        self.filter_index += 1;
        self.filters[self.filter_index] = filter;
        callback(null, web3.fromDecimal(self.filter_index));
      });
    };

    BlockAppsWeb3Provider.prototype.eth_uninstallFilter = function(filter_id, callback) {
      if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_uninstallFilter");
      // var filter;
      // filter_id = web3.toDecimal(filter_id);
      // filter = this.filters[filter_id];
      // if (filter == null) {
      //   callback(null, false);
      //   return;
      // }
      // delete this.filters[filter_id];
      // callback(null, true);
      // console.log("asfdads");
      callback(null, true);
    };

    BlockAppsWeb3Provider.prototype.eth_getFilterChanges = function(filter_id, callback) {
      if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_getFilterChanges");
      var filter;
      filter_id = web3.toDecimal(filter_id);
      filter = this.filters[filter_id];
      if (filter == null) {
        callback(null, []);
        return;
      }
      return filter.getChanges(callback);
    };

    BlockAppsWeb3Provider.prototype.eth_gasPrice = function(callback) {
      if (this.provider.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_gasPrice");
      this.requestFromBlockApps("/transaction/last/1", function(err, tx_result) {
        var tx;
        if (err != null) {
          callback(err);
          return;
        }
        if (tx_result.length === 0) {
          callback(new Error("Could not determine current gasPrice!"));
          return;
        }
        tx = tx_result[0];
        return callback(null, web3.fromDecimal(tx.gasPrice));
      });
    };

    BlockAppsWeb3Provider.prototype.web3_clientVersion = function(callback) {
      return callback(null, "BlockApps Web3 Provider/0.0.1/JavaScript");
    };

    return BlockAppsWeb3Provider;

  })();
  return BlockAppsWeb3Provider;
};

// Note, EthTx, Buffer, ethUtil are provided by the ethereumjs-tx module.
// In node, it globals Buffer and ethUtil; in the browser, it also globals EthTx.
if ((typeof module !== "undefined" && module !== null) && (module.exports != null)) {
  EthTx = require("ethereumjs-tx");
  module.exports = factory(require("web3"), require("xhr2"), require("bignumber.js"), EthTx, Buffer, ethUtil);
} else {
  window.BlockAppsWeb3Provider = factory(window.web3, window.XMLHttpRequest, window.BigNumber, window.EthTx, window.Buffer, window.ethUtil);
}

// ---
// generated by coffee-script 1.9.2
