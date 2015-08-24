var fs = require("fs");
var path = require("path");

// Test other web3 functions not tested by adding contracts
// and creating calls.

describe('Other Web3 Functions:', function() {
  // see ./lib/truffle-provider.js for the initialization of the
  // BlockApps web3 provider.
  var expected_coinbase = "0x985095ef977ba75fb2bb79cd5c4b84c81392dff6";

  it("calls eth_coinbase correctly", function(done) {
    web3.eth.getCoinbase(function(err, actual_coinbase) {
      if (err != null) {
        return done(err);
      }

      assert.equal(actual_coinbase, expected_coinbase, "Coinbase doesn't match!");
      done();
    });
  });

  it("calls eth_accounts correctly", function(done) {
    web3.eth.getAccounts(function(err, actual_accounts) {
      if(err != null) {
        return done(err);
      }

      assert.deepEqual(actual_accounts, ["0x985095ef977ba75fb2bb79cd5c4b84c81392dff6"], "Accounts don't match!");
      done();
    });
  });

  it("calls eth_getCompilers correctly", function(done) {
    var expected_compilers = ["solidity"];
    web3.eth.getCompilers(function(err, actual_compilers) {
      if (err != null) {
        return done(err);
      }

      assert.deepEqual(actual_compilers, expected_compilers);
      done();
    });
  });

  it("calls eth_compileSolidity correctly", function(done) {
    // Path relative to project directory.
    var code = fs.readFileSync(path.resolve("./contracts/Example.sol"), {encoding: "utf8"});
    var contract_name = "Example";
    var expected_binary = "606060405260908060116000396000f30060606040526000357c01000000000000000000000000000000000000000000000000000000009004806360fe47b11460415780636d4ce63c14605257603f565b005b60506004803590602001506071565b005b605b600450607f565b6040518082815260200191505060405180910390f35b806000600050819055505b50565b60006000600050549050608d565b9056";

    web3.eth.compile.solidity(code, function(err, response) {
      if (err != null) {
        return done(err);
      }

      // TODO: Probably could assert more here.
      assert.equal(response[contract_name].code, expected_binary, "Compile binary doesn't match!");
      done();
    });
  });

  it("calls eth_blockNumber correctly", function(done) {
    // Note: We can't guess the block number, so all we can
    // do is make sure it doesn't error, and that we get a number back.

    web3.eth.getBlockNumber(function(err, actual_number) {
      if (err != null) {
        return done(err);
      }

      assert.isNumber(actual_number);
      done();
    });
  });

  it("calls eth_getBlockByNumber correctly", function(done) {
    // Note: This is only partially implemented so far, so we can't test much.

    web3.eth.getBlock(0, function(err, block) {
      if (err != null) {
        return done(err);
      }

      assert.equal(block.number, 0, "Block number doesn't match!");
      assert.equal(block.gasUsed, 0, "Gas used of the genesis block should be zero");
      done();
    });
  });
});
