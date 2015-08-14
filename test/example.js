var request = require('request');

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
    });
  });
});
