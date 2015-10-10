

// NOTE: This has been converted from CoffeeScript using http://js2.coffee
// Some code can be made more clear as a result. I'd encourage contributions. :)

"use strict";

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EthTx;

var factory = function factory(web3, HookedWeb3Provider, BlockAppsVm, XMLHttpRequest, BigNumber, EthTx, Buffer, ethUtil) {
  var BlockFilter = (function () {
    function BlockFilter(provider) {
      _classCallCheck(this, BlockFilter);

      this.provider = provider;
    }

    _createClass(BlockFilter, [{
      key: "initialize",
      value: function initialize(callback) {
        if (this.provider.verbosity >= 1) console.log("   BlockFilter.initialize");
        var self = this;
        this.provider.eth_blockNumber(function (err, number) {
          if (err != null) {
            callback(err);
            return;
          }
          self.block_number = web3.toDecimal(number);
          callback();
        });
      }
    }, {
      key: "getChanges",
      value: function getChanges(callback) {
        if (this.provider.verbosity >= 1) console.log("   BlockFilter.getChanges");
        var self = this;
        this.provider.eth_blockNumber(function (err, finish_number) {
          if (err != null) {
            callback(err);
            return;
          }
          finish_number = web3.toDecimal(finish_number);
          self.getBlockHashesRecursively([], self.block_number, finish_number + 1, callback);
        });
      }
    }, {
      key: "getBlockHashesRecursively",
      value: function getBlockHashesRecursively(hashes, current_number, finish_number, callback) {
        if (this.provider.verbosity >= 1) console.log("   BlockFilter.getBlockHashesRecursively");
        var self = this;
        this.getBlockHash(current_number, function (err, hash) {
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
      }
    }, {
      key: "getBlockHash",
      value: function getBlockHash(block_number, callback) {
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
        this.provider.requestFromBlockApps("/block?number=" + block_number, (function (_this) {
          return function (err, block_result) {
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
      }
    }]);

    return BlockFilter;
  })();

  ;

  var BlockAppsWeb3Provider = (function (_HookedWeb3Provider) {
    _inherits(BlockAppsWeb3Provider, _HookedWeb3Provider);

    function BlockAppsWeb3Provider(options) {
      _classCallCheck(this, BlockAppsWeb3Provider);

      if (options == null) {
        options = {};
      }

      _get(Object.getPrototypeOf(BlockAppsWeb3Provider.prototype), "constructor", this).call(this, { host: options.host, transaction_signer: options.transaction_signer });

      this.coinbase = options.coinbase;

      if (this.coinbase.indexOf("0x") < 0) {
        this.coinbase = "0x" + this.coinbase;
      }

      // accounts is an object returned from ethereumjs-accounts
      // i.e., accounts = accounts.get(). Key is the address, value is the account info.
      this.accounts = options.accounts || [];

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.entries(this.accounts)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _step$value = _slicedToArray(_step.value, 2);

          var index = _step$value[0];
          var account = _step$value[1];

          if (account.indexOf("0x") < 0) {
            this.accounts[index] = "0x" + account;
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"]) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.host = options.host || "http://hacknet.blockapps.net";
      this.version = options.version || "v1.0";
      this.blockchain = options.blockchain || "eth";
      this.verbosity = options.verbosity || 0;
      this.gasPrice = options.gasPrice || 1000000000000;
      this.transaction_signer = options.transaction_signer || function () {
        throw new Error("No key provider given to BlockApps + Web3. Can't send transaction.");
      };
      this.filter_index = 0;
      this.filters = {};
    }

    _createClass(BlockAppsWeb3Provider, [{
      key: "send",
      value: function send(payload) {
        switch (payload.method) {
          case 'eth_accounts':
            var response = {
              id: payload.id,
              jsonrpc: payload.jsonrpc,
              result: this.accounts
            };
            return response;
        }
        throw new Error("BlockAppsWeb3Provider does not support synchronous methods. Please provide a callback.");
      }

      // sendAsync acts as the director with which we call blockapps functions based
      // on RPC functions, and then wrap up the result to look like a JSON rpc response.
      // This is our hook into web3 -- all the other functions support this one.
    }, {
      key: "sendAsync",
      value: function sendAsync(payload, callback) {
        var self = this;
        var finishedWithRewrite = function finishedWithRewrite(err) {
          if (err != null) {
            return callback(err);
          }

          if (payload instanceof Array) {
            self.processBatchRequest(payload, callback);
          } else {
            self.processSingleRequest(payload, callback);
          }
        };

        var requests = payload;

        if (!(payload instanceof Array)) {
          requests = [payload];
        }

        this.rewritePayloads(0, requests, {}, finishedWithRewrite);
      }
    }, {
      key: "processSingleRequest",
      value: function processSingleRequest(payload, callback) {
        var method = payload.method;

        if (this[method] == null) {
          callback(new Error("BlockAppsWeb3Provider does not yet support the Web3 method '" + method + "'."));
          return;
        }

        var args = [];
        var params = payload.params || [];
        for (var i = 0; i < params.length; i++) {
          args.push(params[i]);
        }

        // Push a callback function to wrap up the response into
        // what web3 expects.
        args.push(function (err, result) {
          var wrapped = {
            id: payload.id,
            jsonrpc: payload.jsonrpc
          };

          if (err != null) {
            wrapped.error = err.stack;
          } else {
            wrapped.result = result;
          }

          callback(null, wrapped);
        });

        var fn = this[method];
        if (fn.length !== args.length) {
          callback(new Error("Invalid number of parameters passed to " + method));
          return;
        }

        fn.apply(this, args);
      }

      // Process batch requests in series.
    }, {
      key: "processBatchRequest",
      value: function processBatchRequest(batch, callback) {
        if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.processBatchRequest");

        var clone = [];

        for (var i = 0; i < batch.length; i++) {
          clone.push(batch[i]);
        }

        if (this.verbosity >= 1) {
          var output = "batch start: ";
          for (var i = 0; i < batch.length; i++) {
            output += batch[i].method + " ";
          }
          console.log(output);
        }

        this.makeBatchRequests(0, clone, [], callback);
      }
    }, {
      key: "makeBatchRequests",
      value: function makeBatchRequests(current_index, batch, results, finished) {
        var _this2 = this;

        if (current_index >= batch.length) {
          return finished(null, results);
        }

        this.processSingleRequest(batch[current_index], function (err, r) {
          results.push(r);
          _this2.makeBatchRequests(current_index + 1, batch, results, finished);
        });
      }

      // Make the actual requests to the BlockApps backend.
    }, {
      key: "requestFromBlockApps",
      value: function requestFromBlockApps(path, params, contentType, callback) {
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
        request.onreadystatechange = (function (_this) {
          return function () {
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
                console.log("BLOCKAPPS RESPONSE:\n" + url + "\n\n" + toPrint + "\n");
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
            final_params += key + "=" + encodeURIComponent(value);
          }
        }
        if (contentType === "application/json") {
          final_params = JSON.stringify(params);
        }
        if (this.verbosity >= 3) {
          console.log("BLOCKAPPS REQUEST:");
          // try{ throw new Error() } catch(err){ console.log(err.stack) }
        }
        if (this.verbosity >= 2) {
          console.log(method + " " + url + " - " + final_params + " - " + contentType);
        }

        try {
          if (final_params != null && final_params !== "") {
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
      }

      // Right now, "/transactionResult" outputs errors in such a nasty
      // way that we need a function to encapsulate error handling so as
      // not to have duplication.
    }, {
      key: "requestTransactionResult",
      value: function requestTransactionResult(tx_hash, callback) {
        if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.requestTransactionResult");
        tx_hash = this.strip0x(tx_hash);
        this.requestFromBlockApps("/transactionResult/" + tx_hash, (function (_this) {
          return function (err, txinfo_result) {
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
            if (txinfo.message != null && txinfo.message.toLowerCase().indexOf("success") < 0) {
              callback(new Error(txinfo.message));
              return;
            }
            return callback(null, txinfo);
          };
        })(this));
      }

      // We have to make three requests to get all the data we need
      // for many transaction-related calls.
    }, {
      key: "requestTransactionData",
      value: function requestTransactionData(tx_hash, callback) {
        if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.requestTransactionData");

        tx_hash = this.strip0x(tx_hash);
        this.requestFromBlockApps("/transaction?hash=" + tx_hash, (function (_this) {
          return function (err, tx_result) {
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
            return _this.requestFromBlockApps("/block?number=" + tx.blockNumber, function (err, block_result) {
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
              return _this.requestTransactionResult(tx_hash, function (err, txinfo) {
                if (err != null || txinfo == null) {
                  callback(err, txinfo);
                  return;
                }
                return callback(null, tx, block, txinfo);
              });
            });
          };
        })(this));
      }
    }, {
      key: "strip0x",
      value: function strip0x(string) {
        if (string == null) {
          return string;
        }
        return string.replace("0x", "");
      }

      //////////////////////////// Web3 Methods ////////////////////////////

    }, {
      key: "eth_coinbase",
      value: function eth_coinbase(callback) {
        if (this.coinbase == null) {
          return callback(new Error("No coinbase specified in the BlockApps + Web3 provider!"));
        } else {
          return callback(null, this.coinbase);
        }
      }
    }, {
      key: "eth_accounts",
      value: function eth_accounts(callback) {
        return callback(null, this.accounts);
      }
    }, {
      key: "eth_blockNumber",
      value: function eth_blockNumber(callback) {
        if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_blockNumber");
        this.requestFromBlockApps("/block/last/1", function (err, response) {
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
      }
    }, {
      key: "eth_getBlockByNumber",
      value: function eth_getBlockByNumber(number, fullTransactions, callback) {
        if (typeof fullTransactions == "function") {
          callback = fullTransactions;
          fullTransactions = false;
        }

        var block_number = new BigNumber(number, 16);

        this.requestFromBlockApps("/block?number=" + block_number.toString(10), function (err, result) {
          if (err != null) {
            return callback(err);
          }

          var block = result[result.length - 1];
          var blockData = block.blockData;

          var returnVal = {
            number: web3.fromDecimal(blockData.number),
            hash: "0x" + blockData.parentHash, // TODO: Get the real hash.
            parentHash: "0x" + blockData.parentHash,
            nonce: web3.fromDecimal(blockData.nonce),
            sha3Uncles: "0x" + blockData.unclesHash,
            logsBloom: "0x0", // TODO: Get the real logsBloom from somewhere.
            transactionsRoot: "0x" + blockData.transactionsRoot,
            stateRoot: "0x" + blockData.stateRoot,
            miner: "0x0", // TODO: Get the real miner from somewhere.
            difficulty: web3.fromDecimal(blockData.difficulty),
            totalDifficulty: web3.fromDecimal(blockData.difficulty), // TODO: Is this actually right?
            extraData: "0x" + blockData.extraData, // TODO: Is this right?
            size: "0x0", // TODO: Get the real size from somewhere
            gasLimit: web3.fromDecimal(blockData.gasLimit),
            gasUsed: web3.fromDecimal(blockData.gasUsed),
            timestamp: web3.fromDecimal(new Date(blockData.timestamp).getTime()) // TODO: Verify this is right.
          };

          if (fullTransactions == true) {
            returnVal.transactions = block.receiptTransactions;
          } else {
            returnVal.transactions = block.receiptTransactions.map(function (t) {
              return "0x" + t.hash;
            });
          }

          returnVal.uncles = block.blockUncles.map(function (u) {
            return "0x" + u.hash;
          });

          callback(null, returnVal);
        });
      }
    }, {
      key: "eth_getTransactionCount",
      value: function eth_getTransactionCount(address, block_number, callback) {
        if (block_number == null) {
          block_number = "latest";
        }
        address = this.strip0x(address);

        this.requestFromBlockApps("/account?address=" + address, function (err, result) {
          if (err != null) {
            callback(err);
            return;
          }

          var nonce;

          if (result.length) {
            var last = result[result.length - 1];
            nonce = web3.fromDecimal(last.nonce);
          } else {
            nonce = '0x00';
          }

          return callback(null, nonce);
        });
      }
    }, {
      key: "eth_getTransactionByHash",
      value: function eth_getTransactionByHash(tx_hash, callback) {
        this.requestTransactionData(tx_hash, function (err, tx, block, txinfo) {
          var i, index, j, len, ref, returnVal, transaction;
          if (err != null) {
            callback(err);
            return;
          }
          if (tx == null || block == null || txinfo == null) {
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
      }

      // Only support the latest block_number for now.
      // TODO: Support block numbers with eth_getBalance
    }, {
      key: "eth_getBalance",
      value: function eth_getBalance(address, block_number, callback) {
        if (block_number == null) {
          block_number = "latest";
        }
        address = this.strip0x(address);
        this.requestFromBlockApps("/account?address=" + address, function (err, response) {
          if (err != null) {
            callback(err);
            return;
          }
          if (response.length === 0) {
            callback(null, "0x0");
            return;
          }

          var balance = new BigNumber(response[response.length - 1].balance);
          callback(null, "0x" + balance.toString(16));
        });
      }
    }, {
      key: "eth_getCode",
      value: function eth_getCode(contract_address, block_number, callback) {
        if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_getCode");

        if (block_number == null) {
          block_number = "latest";
        }
        contract_address = this.strip0x(contract_address);

        // Treat the contract address as an account
        this.requestFromBlockApps("/account?address=" + contract_address, function (err, response) {
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
      }
    }, {
      key: "eth_getCompilers",
      value: function eth_getCompilers(callback) {
        callback(null, ["solidity"]);
      }
    }, {
      key: "eth_compileSolidity",
      value: function eth_compileSolidity(src, callback) {
        if (src == null) {
          src = "";
        }
        this.requestFromBlockApps("/solc", {
          src: src
        }, function (err, response) {
          var contract, index, j, len, name, ref, returnVal;
          if (err != null) {
            callback(err);
            return;
          }

          if (response.error != null) {
            callback(new Error(response.error));
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
      }

      // Keep eth_sendTransaction so we can send a nice error.
    }, {
      key: "eth_sendTransaction",
      value: function eth_sendTransaction(tx, callback) {
        return callback(new Error("BlockAppsWeb3 provider can't send transactions from addresses that aren't managed by the transaction signer. Make sure your transaction signer manages this account before sendint a transaction. Account: " + tx.from));
      }
    }, {
      key: "eth_sendRawTransaction",
      value: function eth_sendRawTransaction(rawTx, callback) {
        if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_sendRawTransaction");

        rawTx = this.strip0x(rawTx);
        var ttx = new EthTx(new Buffer(rawTx, 'hex'));

        BigNumber.config({
          EXPONENTIAL_AT: 20000000
        });
        var rawString = ttx.value.toString('hex');
        var bigValue = new BigNumber(0);
        if (rawString !== '') {
          bigValue = new BigNumber(rawString, 16);
        }

        var js = {
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
        this.requestFromBlockApps("/transaction", js, "application/json", function (err, tx_response) {
          var tx_hash;
          tx_hash = "0x" + tx_response.replace(/.*=/, "");
          return callback(null, tx_hash);
        });
      }
    }, {
      key: "eth_call",
      value: function eth_call(txParams, block_number, callback) {
        if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_call");

        var blockAppsUrlRoot = this.host + '/' + this.blockchain + '/' + this.version + '/';
        var vm = BlockAppsVm({ url: blockAppsUrlRoot });

        var tx = new EthTx({
          to: txParams.to,
          nonce: txParams.nonce || "0x00",
          gasPrice: txParams.gasPrice || "0x01",
          gasLimit: txParams.gas || "0xffffff",
          value: txParams.value || "0x00",
          data: txParams.data || "0x"
        });

        // manually set from b/c we are not signing it
        var from = txParams.from || this.accounts[0];
        tx.from = new Buffer(ethUtil.stripHexPrefix(from), "hex");

        vm.stateManager.checkpoint();

        vm.runTx({ tx: tx, skipNonce: true }, parseResults);

        function parseResults(err, results) {
          // console.log("---------------------------------------------------")
          // console.log("results:\n", arguments)
          // console.log("---------------------------------------------------")
          if (err) return callback(err);
          var returnVal = undefined;
          if (results && results.vm["return"]) returnVal = "0x" + results.vm["return"].toString("hex");
          callback(null, returnVal);
        }
      }
    }, {
      key: "eth_getTransactionReceipt",
      value: function eth_getTransactionReceipt(tx_hash, callback) {
        if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_getTransactionReceipt");
        this.requestTransactionData(tx_hash, function (err, tx, block, txinfo) {
          var expected_address, i, index, j, len, ref, returnVal, transaction;
          if (err != null) {
            callback(err);
            return;
          }

          // Transaction is pending, or incomplete, or never made it.
          if (tx == null || block == null || txinfo == null) {
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
          expected_address = ethUtil.generateAddress(tx.from, parseInt(tx.nonce)).toString('hex');

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
      }

      // blockapps does not index LOGs at this time
      // eth_newFilter(args, callback) {
      //   if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_newFilter");
      // }

    }, {
      key: "eth_newBlockFilter",
      value: function eth_newBlockFilter(callback) {
        if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_newBlockFilter");
        var self = this;
        var filter = new BlockFilter(this);
        filter.initialize(function (error) {
          if (error != null) {
            callback(error);
            return;
          }

          self.filter_index += 1;
          self.filters[self.filter_index] = filter;
          callback(null, web3.fromDecimal(self.filter_index));
        });
      }
    }, {
      key: "eth_uninstallFilter",
      value: function eth_uninstallFilter(filter_id, callback) {
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
      }
    }, {
      key: "eth_getFilterChanges",
      value: function eth_getFilterChanges(filter_id, callback) {
        if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_getFilterChanges");
        var filter;
        filter_id = web3.toDecimal(filter_id);
        filter = this.filters[filter_id];
        if (filter == null) {
          callback(null, []);
          return;
        }
        return filter.getChanges(callback);
      }
    }, {
      key: "eth_gasPrice",
      value: function eth_gasPrice(callback) {
        if (this.verbosity >= 1) console.log("   BlockAppsWeb3Provider.eth_gasPrice");
        this.requestFromBlockApps("/transaction/last/1", function (err, tx_result) {
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
      }
    }, {
      key: "web3_clientVersion",
      value: function web3_clientVersion(callback) {
        return callback(null, "BlockApps Web3 Provider/0.0.1/JavaScript");
      }
    }]);

    return BlockAppsWeb3Provider;
  })(HookedWeb3Provider);

  ;

  return BlockAppsWeb3Provider;
};

// Note, EthTx, Buffer, ethUtil are provided by the ethereumjs-tx module.
// In node, it globals Buffer and ethUtil; in the browser, it also globals EthTx.
if (typeof module !== 'undefined') {
  EthTx = require("ethereumjs-tx");
  module.exports = factory(require("web3"), require("hooked-web3-provider"), require("blockapps-vm"), require("xhr2"), require("bignumber.js"), EthTx, Buffer, ethUtil);
} else {
  window.BlockAppsWeb3Provider = factory(window.web3, window.HookedWeb3Provider, window.XMLHttpRequest, window.BigNumber, window.EthTx, window.Buffer, window.ethUtil);
}