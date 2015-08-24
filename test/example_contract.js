var request = require("request");
var BigNumber = require("bignumber.js");

// Note: This function tests a lot of web3 requests in the process of
// sending transactions and creating contracts. Including (but not limited to):
//
// eth_getTransactionByHash
// eth_getTransactionReceipt
// eth_blockNumber
// eth_newBlockFilter
// eth_getFilterChanges
// eth_uninstallFilter
// eth_getCode
// eth_sendTransaction
// eth_call

contract('Example', function(accounts) {
  var contract = null;

  before("request Ether from the BlockApps faucet", function(done) {
    request.post({
      url: "http://hacknet.blockapps.net/eth/v1.0/faucet",
      form: {
        address: accounts[0]
      }
    }, function(error, response, body) {
      done(error);
    });
  });

  it("should deploy new a new contract", function(done) {
    Example.new().then(function(instance) {
      assert.isAddress(instance.address);
      contract = instance;
      done();
    }).catch(done);
  });

  it("should send a non-contract transaction", function(done) {
    var expected_value = 5;
    contract.set(expected_value).then(function(tx) {
      done();
    }).catch(done);
  });

  it("should make a call getting a return value", function(done) {
    var expected_value = 5;
    contract.get.call().then(function(actual_value) {
      assert.equal(actual_value.toNumber(), expected_value, "Value wasn't set or requested properly!");
      done();
    }).catch(done);
  });

  it("should be able to send multiple transactions in succession and handle the nonce correctly", function(done) {
    var final_value = 9;

    // The first three transactions are made in quick succession.
    // Only the last -- the fourth -- is synchronized with the chain.
    // We expect a transaction hash every step of the way.
    contract.set.sendTransaction(6).then(function(tx) {
      assert.isFalse(new BigNumber(tx, 16).equals(0));
      return contract.set.sendTransaction(7);
    }).then(function(tx) {
      assert.isFalse(new BigNumber(tx, 16).equals(0));
      return contract.set.sendTransaction(8);
    }).then(function(tx) {
      assert.isFalse(new BigNumber(tx, 16).equals(0));
      // Wait on this one.
      return contract.set(final_value)
    }).then(function(tx) {
      assert.isFalse(new BigNumber(tx, 16).equals(0));
      return contract.get.call();
    }).then(function(actual_value) {
      assert.equal(actual_value.toNumber(), final_value, "Value wasn't set or requested properly!");
      done();
    }).catch(done);
  });

  it("should be able to handle batch requests", function(done) {
    var expected_value = 9; // final_value from test above.
    var received = 0;
    var expected = 3;
    var keepTrack = function(err) {
      if (err != null) {
        console.log(err.stack || err);
        done(err);
      }

      received += 1;

      if (received == expected) {
        done();
      }
    };

    var batch = web3.createBatch();
    batch.add(web3.eth.getBalance.request(accounts[0], 'latest', keepTrack));
    batch.add(web3.eth.getBlock.request(0, function(err, block) {
      if (block != null) {
        assert.equal(block.number, 0);
      }
      keepTrack(err);
    }));
    batch.add(web3.eth.getCoinbase.request(0, function(err, coinbase) {
      if (coinbase != null) {
        assert.equal(coinbase, accounts[0], "Coinbase is not correct!");
      }
      keepTrack(err);
    }));
    batch.execute();
  });
});
