if (module != null) {
  var BlockAppsWeb3Provider = require("../app/blockapps-web3");
  var web3 = require("web3");
  var Tx = require("ethereumjs-tx");
  var BigNumber = require("bignumber.js");

  var account = {
    address: "985095ef977ba75fb2bb79cd5c4b84c81392dff6",
    private: "0d0ba14043088cd629a978b49c8691deca5926f0271432bc0064e4745bac0a9f"
  };

  var formatHex = function(str){
    return String(str).length % 2 ? '0' + String(str) : String(str);
  };

  var provider = new BlockAppsWeb3Provider({
    accounts: [account.address],
    coinbase: account.address,
    verbosity: 0,
    transaction_signer: {
      hasAddress: function(address, callback) {
        var address = address.replace("0x", "");
        callback(null, address == account.address);
      },
      // This code stolen from ethereumjs-accounts.
      signTransaction: function(tx_params, callback) {
        // Simple transaction signer for our one account.
        var rawTx = {
          nonce: formatHex(ethUtil.stripHexPrefix(tx_params.nonce)),
          gasPrice: formatHex(ethUtil.stripHexPrefix(tx_params.gasPrice)),
          gasLimit: formatHex(new BigNumber('3141592').toString(16)),
          value: '00',
          data: ''
        };

        if(tx_params.gasPrice != null)
          rawTx.gasPrice = formatHex(ethUtil.stripHexPrefix(tx_params.gasPrice));

        if(tx_params.gas != null)
          rawTx.gasLimit = formatHex(ethUtil.stripHexPrefix(tx_params.gas));

        if(tx_params.to != null)
          rawTx.to = formatHex(ethUtil.stripHexPrefix(tx_params.to));

        if(tx_params.value != null)
          rawTx.value = formatHex(ethUtil.stripHexPrefix(tx_params.value));

        if(tx_params.data != null)
          rawTx.data = formatHex(ethUtil.stripHexPrefix(tx_params.data));

        // convert string private key to a Buffer Object
        var privateKey = new Buffer(account.private, 'hex');

        // init new transaction object, and sign the transaction
        var tx = new Tx(rawTx);
        tx.sign(privateKey);

        // Build a serialized hex version of the Tx
        var serializedTx = '0x' + tx.serialize().toString('hex');

        callback(null, serializedTx);
      }
    }
  });

  module.exports = provider;
} else {
  throw "Truffle provider: module == null!";
}
