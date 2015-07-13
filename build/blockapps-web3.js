(function() {
  var EthTx, factory;

  factory = function(web3, XMLHttpRequest, BigNumber, EthTx, Buffer, ethUtil) {
    var BlockAppsWeb3Provider, BlockFilter;
    BlockFilter = (function() {
      function BlockFilter() {}

      BlockFilter.prototype.contructor = function(provider) {
        this.provider = provider;
        return this.provider.eth_blockNumber((function(_this) {
          return function(err, number) {
            if (err != null) {
              throw err;
            }
            return _this.block_number = web3.toDecimal(number);
          };
        })(this));
      };

      BlockFilter.prototype.getChanges = function(callback) {
        return this.provider.eth_blockNumber((function(_this) {
          return function(err, finish_number) {
            if (err != null) {
              callback(err);
              return;
            }
            if (finish_number <= _this.block_number + 1) {
              callback(null, []);
            }
            return getBlockHashesRecursively([], _this.block_number + 1, finish_number, function(err, hashes) {
              if (err != null) {
                callback(err);
                return;
              }
              return _this.block_number = finish_number;
            });
          };
        })(this));
      };

      BlockFilter.prototype.getBlockHashesRecursively = function(hashes, current_number, finish_number, callback) {
        return this.getBlockHash(current_number, (function(_this) {
          return function(err, hash) {
            if (err != null) {
              callback(err);
              return;
            }
            hashes.push(hash);
            if (current_number >= finish_number) {
              return;
            }
            return _this.getBlockHashesRecursively(hashes, current_number + 1, finish_number, callback);
          };
        })(this));
      };

      BlockFilter.prototype.getBlockHash = function(block_number, callback) {
        return this.provider.requestFromBlockApps("/query/block?number=" + (block_number + 1), (function(_this) {
          return function(err, block_result) {
            var block;
            if (err != null) {
              callback(err);
              return;
            }
            if (block_result.length === 0) {
              callback();
            }
            block = block_result[0];
            return callback(null, "0x" + block_result.blockData.parentHash);
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
        this.accounts = options.accounts || {};
        this.host = options.host || "http://stablenet.blockapps.net";
        if (Object.keys(this.accounts).length === 0) {
          throw new Error("At least one account must be passed to BlockAppsWeb3Provider.");
        }
        if (this.coinbase == null) {
          this.coinbase = Object.keys(this.accounts)[0];
        }
        this.filter_index = 0;
        this.filters = {};
      }

      BlockAppsWeb3Provider.prototype.send = function(payload) {
        throw new Error("BlockAppsWeb3Provider does not support synchronous methods. Please provide a callback.");
      };

      BlockAppsWeb3Provider.prototype.sendAsync = function(payload, callback) {
        var args, method;
        method = payload.method;
        console.log(method);
        if (this[method] == null) {
          throw new Error("BlockAppsWeb3Provider does not yet support the Web3 method '" + method + "'.");
          return;
        }
        args = payload.params;
        args.push(function(err, result) {
          var wrapped;
          wrapped = {
            id: payload.id,
            jsonrpc: payload.jsonrpc,
            result: result
          };
          return callback(err, wrapped);
        });
        return this[method].apply(this, args);
      };

      BlockAppsWeb3Provider.prototype.requestFromBlockApps = function(path, params, contentType, callback) {
        var error, final_params, key, request, type, value;
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
        request.onreadystatechange = function() {
          var e, error, result;
          if (request.readyState === 4) {
            result = request.responseText;
            error = null;
            try {
              result = JSON.parse(result);
            } catch (_error) {
              e = _error;
              error = e;
            }
            callback(error, result);
          }
        };
        type = params != null ? "POST" : "GET";
        request.open(type, "" + this.host + path, true);
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
        try {
          return request.send(final_params);
        } catch (_error) {
          error = _error;
          return callback(error);
        }
      };

      BlockAppsWeb3Provider.prototype.requestTransactionData = function(tx_hash, callback) {
        tx_hash = this.strip0x(tx_hash);
        return this.requestFromBlockApps("/query/transaction?hash=" + tx_hash, (function(_this) {
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
            return _this.requestFromBlockApps("/query/block?number=" + tx.blockNumber, function(err, block_result) {
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
              return _this.requestFromBlockApps("/transactionResult/" + tx_hash, function(err, txinfo_result) {
                var txinfo;
                if (err != null) {
                  callback(err);
                  return;
                }
                if (txinfo_result.length === 0) {
                  callback(null, null);
                  return;
                }
                txinfo = txinfo_result[0];
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

      BlockAppsWeb3Provider.prototype.eth_coinbase = function(callback) {
        return callback(null, this.coinbase);
      };

      BlockAppsWeb3Provider.prototype.eth_accounts = function(callback) {
        return callback(null, Object.keys(this.accounts));
      };

      BlockAppsWeb3Provider.prototype.eth_blockNumber = function(callback) {
        return this.requestFromBlockApps("/query/block/last/1", function(err, response) {
          var block;
          if (err != null) {
            callback(err);
            return;
          }
          if (response.length === 0) {
            throw new Error("Couldn't find last block at /query/block/last/1. Please make ensure BlockApps is running properly.");
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
        return this.requestFromBlockApps("/query/transaction?address=" + address, function(err, result) {
          if (err != null) {
            callback(err);
            return;
          }
          return callback(null, result.length);
        });
      };

      BlockAppsWeb3Provider.prototype.eth_getTransactionByHash = function(tx_hash, callback) {
        return this.requestTransactionData(tx_hash, function(err, tx, block, txinfo) {
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

      BlockAppsWeb3Provider.prototype.eth_getBalance = function(address, block_number, callback) {
        if (block_number == null) {
          block_number = "latest";
        }
        address = this.strip0x(address);
        return this.requestFromBlockApps("/query/block?address=" + address, function(err, response) {
          if (err != null) {
            callback(err);
            return;
          }
          if (response.length === 0) {
            callback(null, 0);
            return;
          }
          return callback(null, response[response.length - 1].balance);
        });
      };

      BlockAppsWeb3Provider.prototype.eth_getCode = function(contract_address, block_number, callback) {
        if (block_number == null) {
          block_number = "latest";
        }
        contract_address = this.strip0x(contract_address);
        return this.requestFromBlockApps("/query/block?address=" + contract_address, function(err, response) {
          if (err != null) {
            callback(err);
            return;
          }
          if (response.length === 0) {
            callback(null, null);
            return;
          }
          return callback(null, "0x" + response[response.length - 1].code);
        });
      };

      BlockAppsWeb3Provider.prototype.eth_getCompilers = function(callback) {
        return callback(null, ["solidity"]);
      };

      BlockAppsWeb3Provider.prototype.eth_compileSolidity = function(src, callback) {
        if (src == null) {
          src = "";
        }
        return this.requestFromBlockApps("/solc", {
          src: src
        }, function(err, response) {
          if (err != null) {
            callback(err);
            return;
          }
          return callback(null, {
            code: response.contracts[response.contracts.length - 1].bin,
            info: {
              source: src,
              language: "Solidity",
              languageVersion: "0",
              compilerVersion: "0",
              abiDefinition: response.abis[response.abis.length - 1].abi,
              userDoc: {
                methods: {}
              },
              developerDoc: {
                methods: {}
              }
            }
          });
        });
      };

      BlockAppsWeb3Provider.prototype.eth_sendTransaction = function(tx, callback) {
        var private_key;
        if (tx == null) {
          tx = {};
        }
        if (tx.from == null) {
          callback(new Error("'from' not found, is required"));
          return;
        }
        private_key = this.strip0x(this.accounts[tx.from]["private"]);
        if (private_key == null) {
          callback(new Error("Could not find private key for account: " + tx.from));
          return;
        }
        return this.requestFromBlockApps("/query/account?address=" + (this.strip0x(tx.from)), (function(_this) {
          return function(err, response) {
            var nonce, rawTx, serializedTx;
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
              gasPrice: _this.strip0x(web3.fromDecimal(tx.gasPrice || gasPrice)),
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
            private_key = new Buffer(private_key, 'hex');
            tx = new EthTx(rawTx);
            tx.sign(private_key);
            serializedTx = tx.serialize().toString('hex');
            return _this.eth_sendRawTransaction(serializedTx, callback);
          };
        })(this));
      };

      BlockAppsWeb3Provider.prototype.eth_sendRawTransaction = function(rawTx, callback) {
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
        return this.requestFromBlockApps("/includetransaction", js, "application/json", function(err, tx_response) {
          var tx_hash;
          tx_hash = "0x" + tx_response.replace(/.*=/, "");
          return callback(null, tx_hash);
        });
      };

      BlockAppsWeb3Provider.prototype.eth_call = function(tx, block_number, callback) {
        if (tx == null) {
          tx = {};
        }
        if (block_number == null) {
          block_number = "latest";
        }
        console.log(tx, callback);
        return this.eth_sendTransaction(tx, (function(_this) {
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
              return _this.requestFromBlockApps("/transactionResult/" + tx_hash, function(err, txinfo_result) {
                var txinfo;
                if ((err == null) && txinfo_result.length > 0) {
                  txinfo = txinfo_result[0];
                  if (txinfo.response != null) {
                    clearInterval(interval);
                    callback(null, "0x" + txinfo.response);
                  }
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
        return this.requestTransactionData(tx_hash, function(err, tx, block, txinfo) {
          var expected_address, i, index, j, len, ref, returnVal, transaction;
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
            blockNumber: web3.fromDecimal(tx.blockNumber),
            transactionHash: "0x" + tx.hash,
            transactionIndex: web3.fromDecimal(index),
            from: "0x" + tx.from,
            cumulativeGasUsed: web3.fromDecimal(block.blockData.gasUsed),
            gasUsed: web3.fromDecimal(0),
            logs: []
          };
          if (tx.to != null) {
            returnVal.to = "0x" + tx.to;
          }
          expected_address = ethUtil.generateAddress(tx.from, parseInt(tx.nonce + 1)).toString('hex');
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
        var filter;
        filter = new BlockFilter(this);
        this.filter_index += 1;
        this.filters[this.filter_index] = filter;
        return callback(null, web3.fromDecimal(this.filter_index));
      };

      BlockAppsWeb3Provider.prototype.eth_uninstallFilter = function(filter_id, callback) {
        var filter;
        filter_id = web3.toDecimal(filter_id);
        filter = this.filters[filter_id];
        if (filter == null) {
          callback(null, false);
          return;
        }
        delete this.filters[filter_id];
        return callback(null, true);
      };

      BlockAppsWeb3Provider.prototype.eth_getFilterChanges = function(filter_id, callback) {
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
        return this.requestFromBlockApps("/query/transaction/last/1", function(err, tx_result) {
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

  if ((typeof module !== "undefined" && module !== null) && (module.exports != null)) {
    EthTx = require("ethereumjs-tx");
    module.exports = factory(require("web3"), require("xmlhttprequest"), require("bignumber.js"), EthTx, Buffer, ethUtil);
  } else {
    window.BlockAppsWeb3Provider = factory(window.web3, window.XMLHttpRequest, window.BigNumber, window.EthTx, window.Buffer, window.ethUtil);
  }

}).call(this);
